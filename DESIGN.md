# DESIGN.md — AI Image Understanding & Content Matching Engine

Status: Phase 1 — Design (signed off)

## 1. What this system does

Given a blog post and a library of images, suggest the best-matching image —
and refuse to suggest anything if nothing is actually good enough.

The system is built from three stages:

1. **Vision pipeline** — tags every image with structured metadata (subject,
   category, attributes, caption, confidence), validated against a schema so
   malformed AI output never gets trusted blindly.
2. **Matching engine** — turns image captions and post text into embeddings,
   then ranks images by cosine similarity to a given post.
3. **Mismatch guard** — a safety layer that can override a high similarity
   score. A wolf photo can score well against a fox post; the guard is what
   catches that and explains, in plain English, why it refused.

## 2. Data model

### `images`

| Field | Type | Notes |
|---|---|---|
| `id` | integer / UUID (PK) | |
| `filename` | string | points to the file in `dataset/images/` |
| `subject` | string | e.g. `"red fox"` — specific subject from the vision model |
| `category` | string | e.g. `"animal"` — coarse bucket, primary guard signal |
| `attributes` | string[] | e.g. `["outdoor", "snow", "close-up"]` |
| `caption` | string | one-line description; this is the text that gets embedded |
| `confidence` | float (0–1) | vision model's confidence in its own tagging |
| `embedding` | vector | embedding of `caption`, generated once and stored |
| `tagging_status` | enum: `ok`, `needs_review` | set to `needs_review` when `confidence` is below a threshold; images in this state are never offered as candidates |

### `posts`

| Field | Type | Notes |
|---|---|---|
| `id` | integer / UUID (PK) | |
| `title` | string | |
| `body_text` | string | full draft post |
| `embedding` | vector | embedding of `title + body_text`, same embedding model as `images.embedding` |

### `suggestions`

| Field | Type | Notes |
|---|---|---|
| `id` | integer / UUID (PK) | |
| `post_id` | FK → `posts.id` | |
| `image_id` | FK → `images.id` | |
| `similarity_score` | float | raw cosine similarity, matching engine's output only |
| `guard_decision` | enum: `approved`, `rejected` | the guard's verdict — independent of `similarity_score`, since a high score can still be rejected |
| `reason` | string | human-readable explanation, required on every row (approvals get one too) |
| `status` | enum: `pending`, `approved`, `rejected` | workflow state; distinct from `guard_decision` to allow an optional human-review step later |

**Design decision:** one `suggestions` row is stored per (post, image) pair
evaluated — not just the winner. This is required for the demo (showing a
rejected wolf photo next to an approved fox photo) and doubles as the eval
dataset for tuning thresholds in Phase 4.

## 3. Matching strategy

1. Embed every image's `caption` using an embedding model → store in
   `images.embedding`.
2. Embed every post's `title + body_text` using the *same* embedding model →
   store in `posts.embedding`.
3. For a given post, compute cosine similarity between `posts.embedding` and
   every `images.embedding` where `tagging_status = ok`.
4. Rank images by similarity score, highest first.
5. Pass the ranked list to the mismatch guard before returning anything.

## 4. Mismatch guard rules

Applied in order; the first rule that fires produces the `reason`:

1. **Confidence gate** — if the image's own `confidence` was below threshold
   at tagging time (`tagging_status = needs_review`), it is excluded before
   ranking even happens. Reason: `"Image confidence too low (<score>)"`.
2. **Category check** — if the top candidate's `category` doesn't match what
   the post topic implies, reject even if similarity is high. Reason:
   `"<Category> mismatch: expected <X>, detected <Y>"`.
3. **Similarity threshold** — if the score is below a cutoff (placeholder:
   `0.60`, to be tuned in Phase 4 against real eval data), reject. Reason:
   `"Similarity below threshold (<score> < <threshold>)"`.
4. If none of the above fire, `guard_decision = approved`, with reason stating
   which checks passed, e.g. `"Category and subject match; similarity 0.81"`.

## 5. Non-goal

This system embeds and matches on **image captions (text), not raw image
pixels**. It is a text-to-text semantic match, not true multimodal
image-to-image matching. Extending to raw visual embeddings is explicitly out
of scope for this capstone.

## 6. Example run

```
suggestions:
id | post_id | image_id  | similarity_score | guard_decision | reason                                              | status
1  | 5       | 12 (fox)  | 0.83              | approved       | Category match (animal/fox); similarity 0.83        | approved
2  | 5       | 27 (wolf) | 0.79              | rejected       | Category mismatch: post implies fox, image is wolf  | rejected
3  | 5       | 41 (dog)  | 0.31              | rejected       | Similarity below threshold (0.31 < 0.60)             | rejected
```
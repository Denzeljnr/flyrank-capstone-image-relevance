# FlyRank Capstone: AI Image Understanding & Content Matching Engine

Status: ✅ Complete (Phases 1–4)

Matches blog posts to the most semantically relevant image from a small
image library, with a safety layer that refuses bad matches instead of
guessing.

## What it does

1. **Vision pipeline** — tags every image with structured metadata (subject,
   category, attributes, caption, confidence) via Gemini, validated against
   a Zod schema. Low-confidence tags are flagged, never silently trusted.
2. **Matching engine** — embeds image captions and post text, ranks images
   by cosine similarity to a post.
3. **Mismatch guard** — rejects a high-similarity match if the vision
   model's own confidence was low, if similarity is below threshold, or if
   the candidate's category/subject doesn't match what the post is about —
   even when the raw similarity score looks good.

## Setup

```cmd
docker run --name imagematchdb -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=imagematch -p 5435:5432 -v imagematchdata:/var/lib/postgresql/data -d postgres:16
npm install
cp .env.example .env   # then fill in GEMINI_API_KEY and match DATABASE_URL to your container's port
```

## Run

```cmd
node server.js                 # starts DB + API on port 3000
node run-batch.js               # tags all images with Gemini
node run-embeddings.js          # embeds images + posts
node eval.js                    # measures top-1 precision
npx jest                        # runs automated tests
```

## API

- `GET /posts/:id/images` — ranks images for a post, runs the guard, returns a decision
- `POST /suggestions/:id/approve`
- `POST /suggestions/:id/reject`

## Top-1 precision

**100% (3/3 labeled posts)** — see `eval/labeled-set.json`. This is a small,
hand-picked eval set appropriate for this capstone's scale, not a claim of
production-grade accuracy at volume.

## The demo moment

The dog-domestication post's real embedding scores nearly tied a genuine
dog photo (0.613) against several wolf photos (0.609–0.604), because the
post discusses wolf ancestry throughout. A category-only guard would not
catch this (both tagged `category: animal`). See `EVIDENCE.md` for the full
forced-mismatch test and terminal output proving the guard rejects it.

## Non-goal

This system matches on image **captions** (text), not raw image pixels —
it's a text-to-text semantic match, not multimodal image-to-image matching.

## Limitations

- Eval set is only 3 posts — precision number should be read at that scale.
- Vision tagging model (`gemini-3.5-flash-lite`) occasionally re-selected
  under Google's free-tier model churn during development; model name is
  configurable via `GEMINI_MODEL` in `.env` for exactly this reason.
- Guard's subject-matching is a simple substring check, not a learned
  classifier — works well for this dataset's clear animal categories, may
  need refinement for messier real-world subjects.
# EVIDENCE.md

## Low-confidence classifications are flagged instead of accepted

Test: temporarily raised `LOW_CONFIDENCE_THRESHOLD` from 0.6 to 0.99 in
`batchTagImages.js`, deleted dog-01.jpg and dog-02.jpg from the `images`
table, re-ran the batch job.

Terminal output:
```
FLAGGED (low confidence): dog-01.jpg
Tagged: dog-01.jpg -> golden retriever with a stick
FLAGGED (low confidence): dog-02.jpg
Tagged: dog-02.jpg -> dark fluffy dog
Batch complete: 2 tagged (2 flagged low-confidence), 0 failed
```

Query confirmation:
```
SELECT filename, confidence, flagged FROM images WHERE flagged = true;

  filename  | confidence | flagged
------------+------------+---------
 dog-01.jpg |       0.98 | t
 dog-02.jpg |       0.98 | t
```

Threshold reverted to 0.6, both images re-tagged normally, dataset back to
45 images / 0 flagged.

## Idempotency — re-running the batch job does not re-tag or duplicate

Ran `node run-batch.js` a second time with no changes. Output: every one
of the 45 images logged "Skipping X - already tagged". Final line:
"Batch complete: 0 tagged (0 flagged low-confidence), 0 failed".

## The mismatch guard refuses a high-similarity wrong match

This case emerged from real data, not a synthetic test: the dog post's raw
similarity scores were nearly tied between the correct dog image and several
wolf images (0.613 vs 0.609–0.604), because the post's content discusses
canine domestication and wolf ancestry throughout. A category-only guard
would not catch this, since both dog-03.jpg and wolf-10.jpg are tagged
category="animal". A subject-level check was added to guard.js specifically
because of this finding.

Test: forced wolf-10.jpg (similarity 0.609, a score high enough that a naive
top-1 matcher would accept it) as the top candidate for the dog post.

Output:
```
--- FORCED MISMATCH DEMO ---
Post: What 20,000 Years of Domestication Did to the Dog (expects subject: "dog")
Forced candidate: wolf-10.jpg (gray wolf), similarity 0.609
Decision: rejected
Reason: Subject mismatch: expected something related to "dog", detected "gray wolf".
```

## Approved matches (real, unforced top candidates)

| Post | Top candidate | Similarity | Decision |
|---|---|---|---|
| Red fox post | fox-08.jpg | 0.755 | approved |
| Wolf pack post | wolf-13.jpg | 0.674 | approved |
| Dog domestication post | dog-03.jpg | 0.613 | approved |

## "No confident match" — guard rejects when nothing scores well enough

Test: seeded an unrelated post (home espresso brewing) with no connection
to any image category. Highest similarity across all 45 images was 0.496
(dog-13.jpg), below the 0.6 similarity threshold.

Output:
```
{"post_title":"The Basics of Home Espresso Brewing","decision":"rejected",
"reason":"No confident match found. Highest similarity score (0.50) is
below the threshold (0.6).","candidate":null}
```
# EVIDENCE.md

## Low-confidence classifications are flagged instead of accepted

Test: temporarily raised `LOW_CONFIDENCE_THRESHOLD` from 0.6 to 0.99 in
`batchTagImages.js`, deleted dog-01.jpg and dog-02.jpg from the `images`
table, re-ran the batch job.

Terminal output:

FLAGGED (low confidence): dog-01.jpg
Tagged: dog-01.jpg -> golden retriever with a stick
FLAGGED (low confidence): dog-02.jpg
Tagged: dog-02.jpg -> dark fluffy dog
Batch complete: 2 tagged (2 flagged low-confidence), 0 failed


Query confirmation:

SELECT filename, confidence, flagged FROM images WHERE flagged = true;

filename | confidence | flagged
------------+------------+---------
dog-01.jpg | 0.98 | t
dog-02.jpg | 0.98 | t


Threshold reverted to 0.6, both images re-tagged normally, dataset back to
45 images / 0 flagged.

## Idempotency — re-running the batch job does not re-tag or duplicate
Ran `node run-batch.js` a second time with no changes. Output: every one
of the 45 images logged "Skipping X - already tagged". Final line:
"Batch complete: 0 tagged (0 flagged low-confidence), 0 failed".
# Build Log

- Original guide specified `gemini-1.5-flash`, which was fully deprecated.
  Switched to `gemini-flash-latest`, which resolved to `gemini-3.7-flash`
  and hit a 20/day free-tier quota almost immediately. Settled on
  `gemini-3.5-flash-lite` after `gemini-2.5-flash-lite` also turned out to
  be cut off for new accounts. Pulled the model name into `.env` as
  `GEMINI_MODEL` so future renames are a one-line config change.
- Same pattern with the embedding model: `text-embedding-004` was fully
  shut down (deprecated Jan 2026). Used `gemini-embedding-001`, also pulled
  into `.env` as `GEMINI_EMBEDDING_MODEL`.
- Batch job initially found 0 images because `dataset/images/` is organized
  into fox/wolf/dog subfolders and the original flat `readdirSync` didn't
  recurse into them. Rewrote with a recursive `getAllImageFiles()` helper.
- Hit a duplicate `const imagePath` declaration bug (temporal dead zone
  error) after restructuring the batch loop — an old line wasn't fully
  removed when switching to the subfolder-aware version.
- Original 500ms delay between vision API calls was far too aggressive for
  the free tier's real 5 RPM limit on some models; increased to 13s, and
  extended retry backoff to a full 60s (later 30s) specifically on 429/503
  errors rather than the original fast linear backoff.
- Verified the low-confidence flagging mechanism actually fires (not just
  "looks correct in code") by temporarily raising the threshold to 0.99,
  re-tagging two images, confirming `flagged = true`, then reverting.
- Original guard design only checked `category`. Real embedding results on
  the dog-domestication post showed dog-03.jpg and wolf-10.jpg both tagged
  `category=animal` with similarity scores only 0.004 apart (0.613 vs
  0.609) — added subject-level substring matching to `guard.js` specifically
  because of this finding, and used those exact real numbers as a Jest
  regression test.
- Used AI (Claude) throughout for debugging model-name churn, database
  connection issues (a stale port mismatch between `.env` and a recreated
  Docker container), and structuring `guard.js`'s layered rejection logic.
  Wrote the cosine similarity function and the core Express routes with
  guidance but reviewed each addition against real query output before
  accepting it.
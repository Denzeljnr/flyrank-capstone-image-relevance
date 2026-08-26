require('dotenv').config();
const { pool } = require('./db');
const { rankImagesForPost } = require('./matching');
const { evaluateMatch } = require('./guard');

async function testPost(postId) {
  const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
  const post = postResult.rows[0];
  const ranked = await rankImagesForPost(postId);
  const top = ranked[0];
  const result = evaluateMatch(post, top);
  console.log(`\nPost ${postId} (${post.title}):`);
  console.log(`  Top candidate: ${top.filename} (${top.subject}), similarity ${top.similarity.toFixed(3)}`);
  console.log(`  Decision: ${result.decision}`);
  console.log(`  Reason: ${result.reason}`);
}

async function run() {
  await testPost(1); // fox
  await testPost(2); // wolf
  await testPost(3); // dog
  await testForcedMismatch(); // the wolf-on-dog-post rejection demo
  process.exit();
}

async function testForcedMismatch() {
  const postResult = await pool.query('SELECT * FROM posts WHERE id = 3', []); // dog post
  const post = postResult.rows[0];

  // Manually force a wolf image as the "top candidate" instead of the real winner
  const wolfImageResult = await pool.query(
    "SELECT id, filename, subject, category, confidence FROM images WHERE filename = 'wolf-10.jpg'"
  );
  const forcedCandidate = { ...wolfImageResult.rows[0], similarity: 0.609 }; // real score from your earlier test

  const result = evaluateMatch(post, forcedCandidate);
  console.log(`\n--- FORCED MISMATCH DEMO ---`);
  console.log(`Post: ${post.title} (expects subject: "${post.expected_subject}")`);
  console.log(`Forced candidate: ${forcedCandidate.filename} (${forcedCandidate.subject}), similarity ${forcedCandidate.similarity}`);
  console.log(`Decision: ${result.decision}`);
  console.log(`Reason: ${result.reason}`);
}

run();
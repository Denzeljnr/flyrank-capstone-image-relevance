require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());

const { pool, initDb } = require('./db');
const { rankImagesForPost } = require('./matching');
const { evaluateMatch } = require('./guard');

app.get('/posts/:id/images', async (req, res) => {
  const postId = parseInt(req.params.id);
  const postResult = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
  if (postResult.rows.length === 0) {
    return res.status(404).json({ error: 'Post not found' });
  }
  const post = postResult.rows[0];

  const ranked = await rankImagesForPost(postId);
  const topCandidate = ranked[0];
  const guardResult = evaluateMatch(post, topCandidate);

  await pool.query(
    'INSERT INTO suggestions (post_id, image_id, similarity_score, guard_decision, reason) VALUES ($1, $2, $3, $4, $5)',
    [postId, topCandidate ? topCandidate.id : null, topCandidate ? topCandidate.similarity : null, guardResult.decision, guardResult.reason]
  );

  res.json({
    post_title: post.title,
    decision: guardResult.decision,
    reason: guardResult.reason,
    candidate: guardResult.decision === 'approved' ? topCandidate : null
  });
});

app.post('/suggestions/:id/approve', async (req, res) => {
  const id = parseInt(req.params.id);
  await pool.query("UPDATE suggestions SET status = 'approved' WHERE id = $1", [id]);
  res.json({ message: 'Suggestion approved' });
});

app.post('/suggestions/:id/reject', async (req, res) => {
  const id = parseInt(req.params.id);
  await pool.query("UPDATE suggestions SET status = 'rejected' WHERE id = $1", [id]);
  res.json({ message: 'Suggestion rejected' });
});

initDb()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => console.log(`Capstone API running on port ${process.env.PORT || 3000}`));
  })
  .catch(err => console.error('DB init failed:', err));
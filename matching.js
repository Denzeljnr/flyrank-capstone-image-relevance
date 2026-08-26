const { pool } = require('./db');
const { cosineSimilarity } = require('./similarity');

async function rankImagesForPost(postId) {
  const postResult = await pool.query('SELECT embedding FROM posts WHERE id = $1', [postId]);
  if (postResult.rows.length === 0) throw new Error('Post not found');
  const postEmbedding = postResult.rows[0].embedding;

  const imagesResult = await pool.query(
    'SELECT id, filename, subject, category, confidence, embedding FROM images WHERE embedding IS NOT NULL'
  );

  const ranked = imagesResult.rows.map(image => ({
    ...image,
    similarity: cosineSimilarity(postEmbedding, image.embedding)
  }));

  ranked.sort((a, b) => b.similarity - a.similarity);
  return ranked;
}

module.exports = { rankImagesForPost };
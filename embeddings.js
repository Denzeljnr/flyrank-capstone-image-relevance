require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { pool } = require('./db');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({
  model: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'
});

async function embedText(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values; // an array of numbers
}

async function embedAllImages() {
  const { rows } = await pool.query('SELECT id, caption FROM images WHERE embedding IS NULL');
  console.log(`Embedding ${rows.length} images`);
  for (const row of rows) {
    const vector = await embedText(row.caption);
    await pool.query('UPDATE images SET embedding = $1 WHERE id = $2', [vector, row.id]);
    console.log(`Embedded image ${row.id}`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // stay well under free-tier rate limits
  }
}

async function embedAllPosts() {
  const { rows } = await pool.query('SELECT id, title, body_text FROM posts WHERE embedding IS NULL');
  console.log(`Embedding ${rows.length} posts`);
  for (const row of rows) {
    const vector = await embedText(`${row.title}. ${row.body_text}`);
    await pool.query('UPDATE posts SET embedding = $1 WHERE id = $2', [vector, row.id]);
    console.log(`Embedded post ${row.id}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

module.exports = { embedText, embedAllImages, embedAllPosts };
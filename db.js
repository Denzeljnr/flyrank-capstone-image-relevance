require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS images (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      subject TEXT,
      category TEXT,
      attributes TEXT[],
      caption TEXT,
      confidence NUMERIC,
      embedding NUMERIC[],
      flagged BOOLEAN NOT NULL DEFAULT false,
      processed_at TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body_text TEXT NOT NULL,
      embedding NUMERIC[]
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id SERIAL PRIMARY KEY,
      post_id INTEGER REFERENCES posts(id),
      image_id INTEGER REFERENCES images(id),
      similarity_score NUMERIC,
      guard_decision TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_call_log (
      id SERIAL PRIMARY KEY,
      call_type TEXT NOT NULL,
      target TEXT NOT NULL,
      cost_estimate NUMERIC,
      success BOOLEAN NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

module.exports = { pool, initDb };
require('dotenv').config();
const fs = require('fs');
const { pool } = require('./db');

const posts = [
  { title: 'Why Red Foxes Thrive in Winter', file: 'dataset/posts/fox-post.md' },
  { title: 'The Social Life of a Wolf Pack', file: 'dataset/posts/wolf-post.md' },
  { title: 'What 20,000 Years of Domestication Did to the Dog', file: 'dataset/posts/dog-post.md' },
  { title: 'The Basics of Home Espresso Brewing', file: 'dataset/posts/unrelated-post.md' }
];

async function seedPosts() {
  for (const post of posts) {
    const bodyText = fs.readFileSync(post.file, 'utf-8');
    const existing = await pool.query('SELECT id FROM posts WHERE title = $1', [post.title]);
    if (existing.rows.length > 0) {
      console.log(`Skipping "${post.title}" - already seeded`);
      continue;
    }
    const result = await pool.query(
      'INSERT INTO posts (title, body_text) VALUES ($1, $2) RETURNING id',
      [post.title, bodyText]
    );
    console.log(`Inserted post ${result.rows[0].id}: ${post.title}`);
  }
}

seedPosts()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
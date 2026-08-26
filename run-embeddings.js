require('dotenv').config();
const { embedAllImages, embedAllPosts } = require('./embeddings');

async function run() {
  await embedAllImages();
  await embedAllPosts();
}

run()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
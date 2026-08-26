require('dotenv').config();
const { rankImagesForPost } = require('./matching');

const postId = process.argv[2] || 1;

rankImagesForPost(Number(postId))
  .then(ranked => {
    console.log(`Top 5 matches for post ${postId}:`);
    ranked.slice(0, 5).forEach(img => {
      console.log(`  ${img.filename} (${img.subject}) - similarity: ${img.similarity.toFixed(3)}`);
    });
  })
  .catch(err => console.error(err))
  .finally(() => process.exit());
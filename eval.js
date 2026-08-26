require('dotenv').config();
const fs = require('fs');
const { rankImagesForPost } = require('./matching');

async function runEval() {
  const labeledSet = JSON.parse(fs.readFileSync('eval/labeled-set.json', 'utf-8'));
  let correct = 0;

  for (const entry of labeledSet) {
    const ranked = await rankImagesForPost(entry.post_id);
    const top = ranked[0];
    const isCorrect = top && top.filename === entry.correct_image_filename;
    if (isCorrect) correct++;
    console.log(`Post ${entry.post_id}: expected ${entry.correct_image_filename}, got ${top ? top.filename : 'none'} - ${isCorrect ? 'CORRECT' : 'WRONG'}`);
  }

  const precision = correct / labeledSet.length;
  console.log(`\nTop-1 precision: ${(precision * 100).toFixed(1)}%`);
  return precision;
}

runEval()
  .then(() => process.exit())
  .catch(err => { console.error(err); process.exit(1); });
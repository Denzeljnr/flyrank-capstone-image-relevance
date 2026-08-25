require('dotenv').config();
const { runBatchTagging } = require('./batchTagImages');

runBatchTagging()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Batch failed:', err);
    process.exit(1);
  });
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const { tagImage } = require('./vision');
const { logAiCall } = require('./costTracking');

const MAX_RETRIES = 2;
const LOW_CONFIDENCE_THRESHOLD = 0.6;

async function tagImageWithRetries(imagePath, filename) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const result = await tagImage(imagePath);
      await logAiCall('vision_tag', filename, true);
      return result;
    } catch (err) {
      lastError = err;
      console.log(`Attempt ${attempt} failed for ${filename}: ${err.message}`);
      await logAiCall('vision_tag', filename, false);
      if (attempt <= MAX_RETRIES) {
        const isRateLimit = err.message.includes('429') || err.message.includes('Too Many Requests');
        const isOverloaded = err.message.includes('503') || err.message.includes('Service Unavailable');
        const waitMs = (isRateLimit || isOverloaded) ? 30000 : 1000 * attempt;
        console.log(`Waiting ${waitMs / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        }
    }
  }
  throw lastError;
}

function getAllImageFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllImageFiles(fullPath));
    } else if (/\.(jpg|jpeg|png)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function runBatchTagging() {
  const imagesDir = path.join(__dirname, 'dataset', 'images');
  const filePaths = getAllImageFiles(imagesDir);

  console.log(`Found ${filePaths.length} images to process`);

  let succeeded = 0;
  let failed = 0;
  let flagged = 0;

    for (const imagePath of filePaths) {
    const filename = path.basename(imagePath);
    const existing = await pool.query('SELECT id FROM images WHERE filename = $1', [filename]);
    if (existing.rows.length > 0) {
      console.log(`Skipping ${filename} - already tagged`);
      continue;
    }

    try {
      const metadata = await tagImageWithRetries(imagePath, filename);
      const isLowConfidence = metadata.confidence < LOW_CONFIDENCE_THRESHOLD;

      await pool.query(
        `INSERT INTO images (filename, subject, category, attributes, caption, confidence, flagged, processed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [filename, metadata.subject, metadata.category, metadata.attributes, metadata.caption, metadata.confidence, isLowConfidence]
      );

      if (isLowConfidence) {
        flagged++;
        console.log(`FLAGGED (low confidence): ${filename}`);
      }
      succeeded++;
      console.log(`Tagged: ${filename} -> ${metadata.subject}`);
    } catch (err) {
      failed++;
      console.log(`FAILED after retries: ${filename} - ${err.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 13000)); // stay under free-tier 5 req/min limit
  }

  console.log(`\nBatch complete: ${succeeded} tagged (${flagged} flagged low-confidence), ${failed} failed`);
}

module.exports = { runBatchTagging };
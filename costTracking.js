const { pool } = require('./db');

// Gemini Flash free tier pricing reference (per Gemini API pricing page) —
// even on the free tier, track what a call *would* cost, for the habit and the visibility
const ESTIMATED_COST_PER_IMAGE_CALL = 0.0001; // placeholder small estimate; adjust to actual published rate

async function logAiCall(callType, target, success) {
  await pool.query(
    'INSERT INTO ai_call_log (call_type, target, cost_estimate, success) VALUES ($1, $2, $3, $4)',
    [callType, target, ESTIMATED_COST_PER_IMAGE_CALL, success]
  );
}

module.exports = { logAiCall };
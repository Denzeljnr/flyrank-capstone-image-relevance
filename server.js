require('dotenv').config();
const { initDb } = require('./db');

initDb()
  .then(() => console.log('Database initialized'))
  .catch(err => console.error('DB init failed:', err));
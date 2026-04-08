const sqlite3 = require('sqlite3');
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '..', 'database.sqlite'));
db.get('SELECT COUNT(*) as c FROM transactions', (err, row) => {
  console.log('Total DB txs:', row ? row.c : err);
  db.close();
});

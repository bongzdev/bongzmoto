const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN
});

async function migrate() {
  const tableInfo = await client.execute('PRAGMA table_info(workshops);');
  const cols = new Set(tableInfo.rows.map(r => r.name));
  
  const toAdd = [
    ['bank_name', 'TEXT'],
    ['account_holder', 'TEXT'],
    ['account_number', 'TEXT'],
    ['branch_code', 'TEXT'],
    ['branch_name', 'TEXT']
  ];

  for (const [col, type] of toAdd) {
    if (!cols.has(col)) {
      console.log('Adding column', col);
      await client.execute('ALTER TABLE workshops ADD COLUMN ' + col + ' ' + type + ';');
    } else {
      console.log('Column already exists:', col);
    }
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS public_invoice_tokens (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      workshop_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
    );
  `);
  console.log('public_invoice_tokens table ready');
}

migrate()
  .then(() => console.log('Migration successfully completed.'))
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });

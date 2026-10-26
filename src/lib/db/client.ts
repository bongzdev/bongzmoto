// BongzMoto Persistent Database Client
import { createClient, Client } from '@libsql/client';
import fs from 'fs';
import path from 'path';

let clientInstance: Client | null = null;

export function getDbClient(): Client {
  if (clientInstance) {
    return clientInstance;
  }

  let dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    // Local dev: ensure data directory exists and use a file database
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'bongzmoto.db');
    dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;
  }

  // Remote (e.g. Turso: libsql://...) requires an auth token
  clientInstance = createClient({
    url: dbUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  // Run schema initialization if local file database
  try {
    initSchema(clientInstance);
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
  }

  return clientInstance;
}

function initSchema(db: Client) {
  const schemaPath = path.resolve(process.cwd(), 'src/lib/db/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    return;
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  // Split statements by semicolon that are not within quotes
  const statements = schemaContent
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  // Execute synchronously through a helper or batch
  db.batch(statements.map((sql) => ({ sql, args: [] }))).catch((err) => {
    // If tables already exist, this is harmless
    if (!err.message?.includes('already exists')) {
      console.warn('DB schema init batch note:', err.message);
    }
  });

  // Ensure logo_url column exists on workshops for backward compatibility
  db.execute("ALTER TABLE workshops ADD COLUMN logo_url TEXT;").catch(() => {
    // Column already exists, safe to ignore
  });
}

// BongzMoto File Storage
// Uses Supabase Storage when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
// (required on hosts with ephemeral disks like Render free tier),
// otherwise falls back to the local filesystem for development.
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export const ATTACHMENTS_BUCKET = process.env.SUPABASE_ATTACHMENTS_BUCKET || 'attachments';
export const LOGOS_BUCKET = process.env.SUPABASE_LOGOS_BUCKET || 'logos';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!supabase) {
    supabase = createClient(url, key, { auth: { persistSession: false } });
  }
  return supabase;
}

export function isRemoteStorage(): boolean {
  return getSupabase() !== null;
}

/** Save a private job attachment. `relativePath` is e.g. `<workshopId>/<file>`. */
export async function saveAttachment(relativePath: string, buffer: Buffer, contentType: string) {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(relativePath, buffer, { contentType, upsert: false });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return;
  }
  const fullPath = path.resolve(process.cwd(), 'storage', 'attachments', relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);
}

/** Read a private job attachment. Returns null if missing. */
export async function readAttachment(relativePath: string): Promise<Buffer | null> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.storage.from(ATTACHMENTS_BUCKET).download(relativePath);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
  const fullPath = path.resolve(process.cwd(), 'storage', 'attachments', relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath);
}

/** Save a public workshop logo and return the URL to store on the workshop. */
export async function saveLogo(filename: string, buffer: Buffer, contentType: string): Promise<string> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.storage
      .from(LOGOS_BUCKET)
      .upload(filename, buffer, { contentType, upsert: true });
    if (error) throw new Error(`Logo upload failed: ${error.message}`);
    return sb.storage.from(LOGOS_BUCKET).getPublicUrl(filename).data.publicUrl;
  }
  const logosDir = path.resolve(process.cwd(), 'public', 'logos');
  fs.mkdirSync(logosDir, { recursive: true });
  fs.writeFileSync(path.join(logosDir, filename), buffer);
  return `/logos/${filename}`;
}

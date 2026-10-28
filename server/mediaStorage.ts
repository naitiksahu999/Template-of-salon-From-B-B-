import fs from 'fs';
import path from 'path';
import { getSupabase } from './supabase.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const MEDIA_STORE_FILE = path.join(DATA_DIR, 'media_store.json');

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const PUBLIC_UPLOADS_DIR = path.join(PUBLIC_DIR, 'assets', 'uploads');
const PUBLIC_IMAGES_DIR = path.join(PUBLIC_DIR, 'assets', 'images');

export interface StoredMediaItem {
  filename: string;
  mime: string;
  base64: string;
  createdAt: string;
}

/**
 * Ensures persistence directories exist and re-hydrates any missing files from data store and Supabase Cloud
 */
export function initMediaStorage(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_UPLOADS_DIR)) fs.mkdirSync(DATA_UPLOADS_DIR, { recursive: true });
    if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });

    // Restore any persistent uploads from data/uploads to public/assets/uploads
    if (fs.existsSync(DATA_UPLOADS_DIR)) {
      const files = fs.readdirSync(DATA_UPLOADS_DIR);
      for (const file of files) {
        const srcPath = path.join(DATA_UPLOADS_DIR, file);
        const destPath = path.join(PUBLIC_UPLOADS_DIR, file);
        if (!fs.existsSync(destPath)) {
          try {
            fs.copyFileSync(srcPath, destPath);
          } catch {}
        }
      }
    }

    // Restore any items from media_store.json
    if (fs.existsSync(MEDIA_STORE_FILE)) {
      try {
        const raw = fs.readFileSync(MEDIA_STORE_FILE, 'utf8');
        const store: Record<string, StoredMediaItem> = JSON.parse(raw);
        for (const [filename, item] of Object.entries(store)) {
          const destPath = path.join(PUBLIC_UPLOADS_DIR, filename);
          const dataBackupPath = path.join(DATA_UPLOADS_DIR, filename);

          if (!fs.existsSync(destPath) && item.base64) {
            try {
              const buffer = Buffer.from(item.base64, 'base64');
              fs.writeFileSync(destPath, buffer);
              if (!fs.existsSync(dataBackupPath)) {
                fs.writeFileSync(dataBackupPath, buffer);
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error('[MediaStorage] Error loading media store:', err);
      }
    }
  } catch (err) {
    console.error('[MediaStorage] Failed to initialize media storage directories:', err);
  }
}

/**
 * Fully hydrates media files from Supabase Cloud into public and data storage.
 * Awaited during server startup so files are ready immediately.
 */
export async function hydrateMediaStorage(): Promise<void> {
  initMediaStorage();
  try {
    const supabase = getSupabase();
    if (!supabase) return;

    // 1. Pull all stored images from Supabase database table
    const { data, error } = await supabase
      .from('appointments')
      .select('id, service_name, notes')
      .like('id', '__salon_media_%');

    if (error) {
      console.warn('[MediaStorage Hydration Notice]: Unable to query appointments for media:', error.message);
    } else if (data && Array.isArray(data)) {
      let store: Record<string, StoredMediaItem> = {};
      if (fs.existsSync(MEDIA_STORE_FILE)) {
        try {
          store = JSON.parse(fs.readFileSync(MEDIA_STORE_FILE, 'utf8'));
        } catch {}
      }

      let restoredCount = 0;
      for (const row of data) {
        const filename = row.id.replace('__salon_media_', '');
        if (row.notes) {
          const destPath = path.join(PUBLIC_UPLOADS_DIR, filename);
          const dataBackupPath = path.join(DATA_UPLOADS_DIR, filename);

          if (!fs.existsSync(destPath) || !fs.existsSync(dataBackupPath)) {
            try {
              const buffer = Buffer.from(row.notes, 'base64');
              fs.writeFileSync(destPath, buffer);
              fs.writeFileSync(dataBackupPath, buffer);
              restoredCount++;
            } catch (writeErr) {
              console.error(`[MediaStorage] Error restoring ${filename}:`, writeErr);
            }
          }

          if (!store[filename]) {
            store[filename] = {
              filename,
              mime: row.service_name || 'image/jpeg',
              base64: row.notes,
              createdAt: new Date().toISOString()
            };
          }
        }
      }

      try {
        fs.writeFileSync(MEDIA_STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
      } catch {}

      console.log(`[MediaStorage Hydration Complete]: Restored ${restoredCount} media files from Supabase cloud (Total in store: ${Object.keys(store).length}).`);
    }

    // 2. Also check if salon-media bucket has any files
    try {
      const { data: bucketFiles } = await supabase.storage.from('salon-media').list();
      if (bucketFiles && Array.isArray(bucketFiles)) {
        for (const bf of bucketFiles) {
          const destPath = path.join(PUBLIC_UPLOADS_DIR, bf.name);
          if (!fs.existsSync(destPath)) {
            const { data: fileData } = await supabase.storage.from('salon-media').download(bf.name);
            if (fileData) {
              const arrayBuf = await fileData.arrayBuffer();
              const buf = Buffer.from(arrayBuf);
              fs.writeFileSync(destPath, buf);
              fs.writeFileSync(path.join(DATA_UPLOADS_DIR, bf.name), buf);
            }
          }
        }
      }
    } catch {}
  } catch (cloudErr) {
    console.error('[MediaStorage Cloud Hydration Exception]:', cloudErr);
  }
}

/**
 * Saves uploaded image permanently across physical directories, media_store.json,
 * and Supabase Cloud storage.
 */
export async function savePersistentMedia(
  filenamePrefix: string,
  base64Payload: string
): Promise<{ url: string; filename: string }> {
  initMediaStorage();

  const matches = String(base64Payload).match(/^data:([A-Za-z0-9\-+/]+);base64,(.+)$/);
  let buffer: Buffer;
  let ext = 'jpg';
  let mime = 'image/jpeg';
  let pureBase64 = base64Payload;

  if (matches && matches.length === 3) {
    mime = matches[1];
    pureBase64 = matches[2];
    if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('svg')) ext = 'svg+xml';
    else if (mime.includes('gif')) ext = 'gif';
    buffer = Buffer.from(pureBase64, 'base64');
  } else {
    buffer = Buffer.from(base64Payload, 'base64');
  }

  const cleanName = (filenamePrefix || 'media')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  const outputFilename = `upload_${Date.now()}_${cleanName}.${ext}`;

  // 1. Write to public/assets/uploads
  const publicPath = path.join(PUBLIC_UPLOADS_DIR, outputFilename);
  await fs.promises.writeFile(publicPath, buffer);

  // 2. Write to data/uploads
  try {
    const dataPath = path.join(DATA_UPLOADS_DIR, outputFilename);
    await fs.promises.writeFile(dataPath, buffer);
  } catch {}

  // 3. Persist into media_store.json
  try {
    let store: Record<string, StoredMediaItem> = {};
    if (fs.existsSync(MEDIA_STORE_FILE)) {
      try {
        store = JSON.parse(fs.readFileSync(MEDIA_STORE_FILE, 'utf8'));
      } catch {}
    }

    store[outputFilename] = {
      filename: outputFilename,
      mime,
      base64: pureBase64,
      createdAt: new Date().toISOString()
    };

    fs.writeFileSync(MEDIA_STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('[MediaStorage] Failed to update media store json:', err);
  }

  // 4. Asynchronously sync to Supabase Cloud so image persists forever
  (async () => {
    try {
      const supabase = getSupabase();
      if (supabase) {
        // A. Persist into appointments table
        await supabase.from('appointments').upsert({
          id: `__salon_media_${outputFilename}`,
          booking_number: 'MEDIA-001',
          customer_name: outputFilename,
          customer_phone: '0000000000',
          service_id: 'media_file',
          service_name: mime,
          service_price: 0,
          service_duration: 0,
          appointment_date: '2026-01-01',
          appointment_time: '00:00',
          status: 'media_asset',
          notes: pureBase64
        }, { onConflict: 'id' });
        console.log(`[MediaStorage] Persisted image ${outputFilename} to Supabase cloud database.`);

        // B. Also attempt Supabase Storage bucket if created
        try {
          await supabase.storage.from('salon-media').upload(outputFilename, buffer, {
            contentType: mime,
            upsert: true
          });
        } catch {}
      }
    } catch (sbErr) {
      console.warn('[MediaStorage Cloud Sync Notice]:', sbErr);
    }
  })();

  const url = `/assets/uploads/${outputFilename}`;
  return { url, filename: outputFilename };
}

/**
 * On-demand file locator that verifies local file or recovers from Supabase cloud on the fly.
 * NEVER mutates settings or database with fallback images.
 */
export async function ensureMediaFileAvailable(filename: string): Promise<string | null> {
  const safeFilename = path.basename(filename);
  const primaryPath = path.join(PUBLIC_UPLOADS_DIR, safeFilename);

  // 1. Direct hit in public uploads
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }

  // 2. Check data/uploads backup
  const backupPath = path.join(DATA_UPLOADS_DIR, safeFilename);
  if (fs.existsSync(backupPath)) {
    try {
      fs.copyFileSync(backupPath, primaryPath);
      return primaryPath;
    } catch {
      return backupPath;
    }
  }

  // 3. Check media_store.json
  if (fs.existsSync(MEDIA_STORE_FILE)) {
    try {
      const store: Record<string, StoredMediaItem> = JSON.parse(fs.readFileSync(MEDIA_STORE_FILE, 'utf8'));
      const item = store[safeFilename];
      if (item && item.base64) {
        const buffer = Buffer.from(item.base64, 'base64');
        fs.writeFileSync(primaryPath, buffer);
        fs.writeFileSync(backupPath, buffer);
        return primaryPath;
      }
    } catch {}
  }

  // 4. On-demand cloud fetch from Supabase
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase
        .from('appointments')
        .select('notes, service_name')
        .eq('id', `__salon_media_${safeFilename}`)
        .single();

      if (data?.notes) {
        const buffer = Buffer.from(data.notes, 'base64');
        fs.writeFileSync(primaryPath, buffer);
        try { fs.writeFileSync(backupPath, buffer); } catch {}

        // Add to media_store.json
        try {
          let store: Record<string, StoredMediaItem> = {};
          if (fs.existsSync(MEDIA_STORE_FILE)) {
            try { store = JSON.parse(fs.readFileSync(MEDIA_STORE_FILE, 'utf8')); } catch {}
          }
          store[safeFilename] = {
            filename: safeFilename,
            mime: data.service_name || 'image/jpeg',
            base64: data.notes,
            createdAt: new Date().toISOString()
          };
          fs.writeFileSync(MEDIA_STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
        } catch {}

        return primaryPath;
      }

      // 5. Try Supabase Storage bucket
      try {
        const { data: fileData, error: sErr } = await supabase.storage.from('salon-media').download(safeFilename);
        if (fileData && !sErr) {
          const arrayBuf = await fileData.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          fs.writeFileSync(primaryPath, buffer);
          try { fs.writeFileSync(backupPath, buffer); } catch {}
          return primaryPath;
        }
      } catch {}
    }
  } catch (cloudErr) {
    console.error(`[MediaStorage On-Demand Recovery Error for ${safeFilename}]:`, cloudErr);
  }

  return null;
}

/**
 * Locates an uploaded media file synchronously for backward compatibility,
 * returning null fallback if not found.
 */
export function getMediaFilePath(filename: string): { filePath: string; isFallback: boolean } {
  const safeFilename = path.basename(filename);
  const primaryPath = path.join(PUBLIC_UPLOADS_DIR, safeFilename);

  if (fs.existsSync(primaryPath)) {
    return { filePath: primaryPath, isFallback: false };
  }

  const backupPath = path.join(DATA_UPLOADS_DIR, safeFilename);
  if (fs.existsSync(backupPath)) {
    try {
      fs.copyFileSync(backupPath, primaryPath);
      return { filePath: primaryPath, isFallback: false };
    } catch {
      return { filePath: backupPath, isFallback: false };
    }
  }

  if (fs.existsSync(MEDIA_STORE_FILE)) {
    try {
      const store: Record<string, StoredMediaItem> = JSON.parse(fs.readFileSync(MEDIA_STORE_FILE, 'utf8'));
      const item = store[safeFilename];
      if (item && item.base64) {
        const buffer = Buffer.from(item.base64, 'base64');
        fs.writeFileSync(primaryPath, buffer);
        return { filePath: primaryPath, isFallback: false };
      }
    } catch {}
  }

  const defaultFallback = path.join(PUBLIC_IMAGES_DIR, 'hero_salon_interior_1790779465939.jpg');
  if (fs.existsSync(defaultFallback)) {
    return { filePath: defaultFallback, isFallback: true };
  }

  return { filePath: primaryPath, isFallback: false };
}

/**
 * Returns all stored media files for the admin media library
 */
export function getAllStoredMedia(): { name: string; url: string; createdAt?: string }[] {
  initMediaStorage();
  const list: { name: string; url: string; createdAt?: string }[] = [];
  if (fs.existsSync(MEDIA_STORE_FILE)) {
    try {
      const store: Record<string, StoredMediaItem> = JSON.parse(fs.readFileSync(MEDIA_STORE_FILE, 'utf8'));
      for (const [filename, item] of Object.entries(store)) {
        list.push({
          name: filename,
          url: `/assets/uploads/${filename}`,
          createdAt: item.createdAt
        });
      }
    } catch {}
  }

  if (fs.existsSync(DATA_UPLOADS_DIR)) {
    try {
      const files = fs.readdirSync(DATA_UPLOADS_DIR);
      for (const file of files) {
        if (!list.some((m) => m.name === file)) {
          list.push({
            name: file,
            url: `/assets/uploads/${file}`
          });
        }
      }
    } catch {}
  }

  // Sort latest first
  list.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  return list;
}

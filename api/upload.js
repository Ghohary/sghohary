import { createRequire } from 'node:module';
const { requireAdmin } = require('./_utils/admin-auth');
const { S3Client, PutObjectCommand } = createRequire(import.meta.url)('@aws-sdk/client-s3');

export const config = {
  api: {
    bodyParser: false
  }
};

const DEFAULT_UPLOAD_PREFIX = 'ghohary/products';

function resolveR2Config() {
  const accountId = String(process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucketName = String(process.env.R2_BUCKET_NAME || 'ghohary-media').trim();
  const publicUrl = String(process.env.R2_PUBLIC_URL || '').trim();
  const region = String(process.env.R2_REGION || 'auto').trim() || 'auto';

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl: publicUrl.replace(/\/+$/, ''),
    region,
    uploadPrefix: String(process.env.R2_UPLOAD_PREFIX || DEFAULT_UPLOAD_PREFIX).trim() || DEFAULT_UPLOAD_PREFIX
  };
}

function resolveContentType(rawContentType) {
  if (!rawContentType) return 'application/octet-stream';
  return String(rawContentType).split(';')[0].trim().toLowerCase() || 'application/octet-stream';
}

function sanitizeBaseName(filename) {
  return String(filename || `upload-${Date.now()}`)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .slice(0, 96) || `upload-${Date.now()}`;
}

function normalizeExtFromType(contentType = '') {
  const normalized = String(contentType).toLowerCase();
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return '.jpg';
  if (normalized.includes('png')) return '.png';
  if (normalized.includes('webp')) return '.webp';
  if (normalized.includes('avif')) return '.avif';
  if (normalized.includes('heic')) return '.heic';
  if (normalized.includes('heif')) return '.heif';
  if (normalized.includes('gif')) return '.gif';
  if (normalized.includes('mp4')) return '.mp4';
  if (normalized.includes('webm')) return '.webm';
  if (normalized.includes('quicktime')) return '.mov';
  return '.bin';
}

function nowStamp() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildObjectKey(baseName, suffix, ext) {
  const safeName = String(baseName || `upload-${nowStamp()}`).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^\.+/, '');
  const extension = ext && ext.startsWith('.') ? ext : `.bin`;
  const suffixPart = suffix ? `-${suffix}` : '';
  return `${safeName}${suffixPart}${extension}`;
}

async function uploadBufferToR2({
  r2Config,
  buffer,
  contentType,
  publicId,
  filename
}) {
  const key = buildObjectKey(publicId || sanitizeBaseName(filename), undefined, normalizeExtFromType(contentType));
  const objectKey = `${r2Config.uploadPrefix.replace(/\/+$/, '')}/${key}`;
  const endpoint = `https://${r2Config.accountId}.r2.cloudflarestorage.com`;

  const client = new S3Client({
    region: r2Config.region,
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey
    }
  });

  const command = new PutObjectCommand({
    Bucket: r2Config.bucketName,
    Key: objectKey,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream'
  });

  try {
    await client.send(command);
  } catch (error) {
    throw new Error(error?.message || 'R2 upload failed');
  }

  return {
    url: `${r2Config.publicUrl}/${objectKey}`,
    contentType
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdmin(req, res)) {
    return;
  }

  try {
    const r2Config = resolveR2Config();
    if (!r2Config) {
      res.status(500).json({
        error: 'Missing R2 credentials. Configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL.'
      });
      return;
    }

    const rawContentType = req.headers['content-type'];
    const contentType = resolveContentType(rawContentType);
    const filenameParam = req.query?.filename;
    const filename = Array.isArray(filenameParam) ? filenameParam[0] : filenameParam;
    const baseName = sanitizeBaseName(filename);
    const isImageUpload = /^image\/(jpe?g|png|webp|avif|heic|heif|gif)$/i.test(contentType);

    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', resolve);
      req.on('error', reject);
    });

    const buffer = Buffer.concat(chunks);

    if (isImageUpload) {
      try {
        const sharpModule = await import('sharp');
        const sharp = sharpModule.default || sharpModule;
        const normalized = sharp(buffer, { failOnError: false }).rotate();
        const optimizedBuffer = await normalized
          .clone()
          .resize({ width: 2200, withoutEnlargement: true })
          .webp({ quality: 82, effort: 4 })
          .toBuffer();
        const thumbnailBuffer = await normalized
          .clone()
          .resize({ width: 640, height: 840, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 70, effort: 3 })
          .toBuffer();

        const [mainUpload, thumbUpload] = await Promise.all([
          uploadBufferToR2({
            r2Config,
            buffer: optimizedBuffer,
            contentType: 'image/webp',
            publicId: `${baseName}-main-${nowStamp()}`,
            filename: `${baseName}-main.webp`
          }),
          uploadBufferToR2({
            r2Config,
            buffer: thumbnailBuffer,
            contentType: 'image/webp',
            publicId: `${baseName}-thumb-${nowStamp()}`,
            filename: `${baseName}-thumb.webp`
          })
        ]);

        const mainImage = mainUpload.url;
        const thumbImage = thumbUpload.url;

        res.status(200).json({
          url: mainImage,
          downloadUrl: mainImage,
          download_url: mainImage,
          thumbnailUrl: thumbImage,
          thumbnailDownloadUrl: thumbImage,
          thumbnail_download_url: thumbImage,
          contentType: 'image/webp'
        });
        return;
      } catch (imageError) {
        // continue to raw upload fallback
      }
    }

    const upload = await uploadBufferToR2({
      r2Config,
      buffer,
      contentType,
      publicId: baseName,
      filename: baseName
    });

    res.status(200).json({
      url: upload.url,
      downloadUrl: upload.url,
      download_url: upload.url,
      contentType: upload.contentType
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
}

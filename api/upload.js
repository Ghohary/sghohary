import crypto from 'node:crypto';
const { requireAdmin } = require('./_utils/admin-auth');

export const config = {
  api: {
    bodyParser: false
  }
};

function resolveCloudinaryConfig() {
  const cloudName = String(
    process.env.CLOUDINARY_NAME
    || process.env.CLOUDINARY_CLOUD_NAME
    || process.env.CLOUDINARY_CLOUD
    || ''
  ).trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || '').trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    uploadFolder: String(process.env.CLOUDINARY_UPLOAD_FOLDER || 'ghohary/products').trim() || 'ghohary/products'
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

function cloudinarySignature(params, apiSecret) {
  const signBase = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(signBase + apiSecret).digest('hex');
}

async function uploadBufferToCloudinary({
  cloudConfig,
  buffer,
  contentType,
  publicId,
  filename
}) {
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudConfig.cloudName}/auto/upload`;
  const timestamp = Math.floor(Date.now() / 1000);
  const publicIdWithoutExt = String(publicId || '').trim() || 'ghohary-upload';

  const uploadParams = {
    folder: cloudConfig.uploadFolder,
    public_id: publicIdWithoutExt,
    timestamp
  };
  const signature = cloudinarySignature(uploadParams, cloudConfig.apiSecret);

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: contentType }), filename);
  form.append('api_key', cloudConfig.apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('folder', cloudConfig.uploadFolder);
  form.append('public_id', publicIdWithoutExt);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: form
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = data?.error?.message || `Cloudinary upload failed (${response.status})`;
    throw new Error(reason);
  }

  return {
    url: data.secure_url || data.url,
    contentType: data.format ? `image/${data.format}` : contentType
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
    const cloudConfig = resolveCloudinaryConfig();
    if (!cloudConfig) {
      res.status(500).json({
        error: 'Missing Cloudinary credentials. Configure CLOUDINARY_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
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
          uploadBufferToCloudinary({
            cloudConfig,
            buffer: optimizedBuffer,
            contentType: 'image/webp',
            publicId: `${baseName}-main`,
            filename: `${baseName}-main.webp`
          }),
          uploadBufferToCloudinary({
            cloudConfig,
            buffer: thumbnailBuffer,
            contentType: 'image/webp',
            publicId: `${baseName}-thumb`,
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

    const upload = await uploadBufferToCloudinary({
      cloudConfig,
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

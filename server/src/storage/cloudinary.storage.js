import { v2 as cloudinary } from 'cloudinary';
import ApiError from '../utils/ApiError.js';
import { assertObjectStorage } from './objectStorage.js';

const DEFAULT_MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const ALLOWED_SOURCE_HOSTS = new Set([
  'gen.pollinations.ai',
  'image.pollinations.ai',
]);
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const fetchWithTimeout = async (fetchImpl, url, init, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError(504, 'Image source request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const readConfig = overrides => {
  const cloudName = overrides?.cloudName ?? process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = overrides?.apiKey ?? process.env.CLOUDINARY_API_KEY;
  const apiSecret = overrides?.apiSecret ?? process.env.CLOUDINARY_API_SECRET;
  const folder =
    overrides?.folder ??
    process.env.CLOUDINARY_STORY_FOLDER ??
    'talecrafter/stories';

  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(503, 'Cloudinary is not configured');
  }

  return { cloudName, apiKey, apiSecret, folder };
};

const validateSourceUrl = sourceUrl => {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new ApiError(400, 'A valid image source URL is required');
  }

  if (
    parsed.protocol !== 'https:' ||
    !ALLOWED_SOURCE_HOSTS.has(parsed.hostname)
  ) {
    throw new ApiError(400, 'Image source is not allowed');
  }

  return parsed.toString();
};

export const createCloudinaryStorage = (options = {}) => {
  const config = readConfig(options.config);
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxSourceBytes = options.maxSourceBytes ?? DEFAULT_MAX_SOURCE_BYTES;

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  const storage = {
    provider: 'cloudinary',
    container: config.cloudName,

    async uploadFromUrl(sourceUrl, uploadOptions = {}) {
      const safeUrl = validateSourceUrl(String(sourceUrl ?? '').trim());
      const objectKey = String(uploadOptions.objectKey ?? '').trim();
      if (!objectKey) throw new ApiError(400, 'Object key is required');

      const sourceResponse = await fetchWithTimeout(
        fetchImpl,
        safeUrl,
        { cache: 'no-store', redirect: 'error' },
        uploadOptions.sourceTimeoutMs ?? 70_000
      );

      if (!sourceResponse.ok) {
        throw new ApiError(
          502,
          `Image source fetch failed: ${sourceResponse.status}`
        );
      }

      const mimeType = String(sourceResponse.headers.get('content-type') ?? '')
        .split(';', 1)[0]
        .trim()
        .toLowerCase();
      if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
        throw new ApiError(415, 'Image source type is not supported');
      }

      const declaredBytes = Number(
        sourceResponse.headers.get('content-length') ?? 0
      );
      if (declaredBytes > maxSourceBytes) {
        throw new ApiError(413, 'Source image is too large');
      }

      const sourceBytes = await sourceResponse.arrayBuffer();
      if (sourceBytes.byteLength > maxSourceBytes) {
        throw new ApiError(413, 'Source image is too large');
      }

      const timestamp = String(Math.floor(Date.now() / 1000));
      const signatureParams = {
        folder: config.folder,
        overwrite: 'false',
        public_id: objectKey,
        timestamp,
        unique_filename: 'false',
      };
      const signature = cloudinary.utils.api_sign_request(
        signatureParams,
        config.apiSecret
      );
      const formData = new FormData();
      formData.append(
        'file',
        `data:${mimeType};base64,${Buffer.from(sourceBytes).toString('base64')}`
      );
      formData.append('api_key', config.apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', signatureParams.folder);
      formData.append('public_id', objectKey);
      formData.append('resource_type', 'image');
      formData.append('unique_filename', signatureParams.unique_filename);
      formData.append('overwrite', signatureParams.overwrite);

      const uploadResponse = await fetchWithTimeout(
        fetchImpl,
        `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
        { method: 'POST', body: formData, cache: 'no-store' },
        uploadOptions.uploadTimeoutMs ?? 30_000
      );

      if (!uploadResponse.ok) {
        throw new ApiError(
          502,
          `Cloudinary upload failed: ${uploadResponse.status}`
        );
      }

      const payload = await uploadResponse.json();
      const uploadedKey = String(payload?.public_id ?? '').trim();
      if (!uploadedKey) {
        throw new ApiError(502, 'Cloudinary upload returned no object key');
      }

      return {
        provider: storage.provider,
        container: storage.container,
        objectKey: uploadedKey,
        url: String(payload?.secure_url ?? storage.getPublicUrl(uploadedKey)),
        mimeType,
        byteSize: Number(payload?.bytes ?? sourceBytes.byteLength),
      };
    },

    getPublicUrl(objectKey) {
      return cloudinary.url(String(objectKey), {
        resource_type: 'image',
        secure: true,
      });
    },

    async deleteObject(objectKey) {
      const destroy =
        options.destroyImpl ??
        ((key, configOptions) =>
          cloudinary.uploader.destroy(key, configOptions));
      const result = await destroy(String(objectKey), {
        invalidate: true,
        resource_type: 'image',
      });

      if (!['ok', 'not found'].includes(String(result?.result))) {
        throw new ApiError(502, 'Cloudinary object deletion failed');
      }

      return { objectKey: String(objectKey), deleted: result.result === 'ok' };
    },
  };

  return assertObjectStorage(storage);
};

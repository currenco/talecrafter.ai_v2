import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { loadPocEnvironment, requireVariables } from './env.js';

const env = loadPocEnvironment();
requireVariables(env, [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_ENDPOINT_URL_S3',
  'AWS_REGION',
]);

const MAX_STORY_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const body = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=',
  'base64'
);
const objectKey = `phase-1/${randomUUID()}.png`;
const buckets = { private: 'dev', public: 'prod' };
const endpoint = env.AWS_ENDPOINT_URL_S3.replace(/\/$/, '');

const s3 = new S3Client({
  endpoint,
  region: env.AWS_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const validateUpload = ({ contentType, byteLength }) => {
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error(`Unsupported image type: ${contentType}`);
  }
  if (byteLength > MAX_STORY_IMAGE_BYTES) {
    throw new Error('Story image exceeds the 10 MiB application limit');
  }
};

const elapsed = async operation => {
  const startedAt = performance.now();
  const value = await operation();
  return { milliseconds: Math.round(performance.now() - startedAt), value };
};

const directUrl = bucket =>
  `${endpoint}/${bucket}/${objectKey
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

const results = {
  branch: env.NEON_BRANCH,
  validation: {},
  publicObject: {},
  privateObject: {},
  deletion: {},
};

try {
  validateUpload({ contentType: 'image/png', byteLength: body.byteLength });
  results.validation.validImageAccepted = true;

  try {
    validateUpload({ contentType: 'text/plain', byteLength: body.byteLength });
  } catch {
    results.validation.invalidContentTypeRejected = true;
  }

  try {
    validateUpload({
      contentType: 'image/png',
      byteLength: MAX_STORY_IMAGE_BYTES + 1,
    });
  } catch {
    results.validation.oversizedImageRejected = true;
  }

  for (const bucket of Object.values(buckets)) {
    const upload = await elapsed(() =>
      s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: body,
          ContentType: 'image/png',
          CacheControl: 'public, max-age=31536000, immutable',
        })
      )
    );
    results[bucket === buckets.public ? 'publicObject' : 'privateObject'][
      'uploadMilliseconds'
    ] = upload.milliseconds;
  }

  const publicRead = await elapsed(() => fetch(directUrl(buckets.public)));
  results.publicObject.readMilliseconds = publicRead.milliseconds;
  results.publicObject.status = publicRead.value.status;
  results.publicObject.contentType =
    publicRead.value.headers.get('content-type');
  results.publicObject.cacheControl =
    publicRead.value.headers.get('cache-control');
  results.publicObject.bytesMatch = Buffer.from(
    await publicRead.value.arrayBuffer()
  ).equals(body);

  const privateDirectRead = await fetch(directUrl(buckets.private));
  results.privateObject.directStatus = privateDirectRead.status;

  const signedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: buckets.private, Key: objectKey }),
    { expiresIn: 60 }
  );
  const privateRead = await elapsed(() => fetch(signedUrl));
  results.privateObject.signedReadMilliseconds = privateRead.milliseconds;
  results.privateObject.signedStatus = privateRead.value.status;
  results.privateObject.bytesMatch = Buffer.from(
    await privateRead.value.arrayBuffer()
  ).equals(body);

  for (const bucket of Object.values(buckets)) {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
  }

  try {
    await s3.send(
      new HeadObjectCommand({ Bucket: buckets.private, Key: objectKey })
    );
    results.deletion.missingObjectRejected = false;
  } catch (error) {
    results.deletion.missingObjectRejected =
      error?.$metadata?.httpStatusCode === 404;
    results.deletion.status = error?.$metadata?.httpStatusCode;
  }

  console.log(JSON.stringify(results, null, 2));
} finally {
  await Promise.allSettled(
    Object.values(buckets).map(bucket =>
      s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }))
    )
  );
}

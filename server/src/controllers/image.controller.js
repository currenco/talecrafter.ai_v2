import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { persistStandaloneAsset } from '../services/asset.service.js';
import { buildGeneratedImageRequest } from '../services/generation.service.js';
import { isPollinationsImageUrl } from '../services/image.service.js';
import { getPollinationsAccessTokenForProfile } from '../services/pollinations.service.js';
import { syncUserFromAuth } from '../services/user.service.js';

export const createPollinationsImageUrl = asyncHandler(async (req, res) => {
  const user = await syncUserFromAuth(req.auth.userId);
  const accessToken = await getPollinationsAccessTokenForProfile(user.id);
  const request = buildGeneratedImageRequest(
    req.validated.body.prompt,
    accessToken,
    {
      seed: req.validated.body.seed,
      width: req.validated.body.width,
      height: req.validated.body.height,
    }
  );
  const asset = await persistStandaloneAsset({
    ownerId: user.id,
    ...request,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { imageUrl: asset.url }, 'Image generated'));
});

export const persistImage = asyncHandler(async (req, res) => {
  const user = await syncUserFromAuth(req.auth.userId);
  const imageUrl = req.validated.body.imageUrl;
  const sourceHeaders = isPollinationsImageUrl(imageUrl)
    ? {
        Authorization: `Bearer ${await getPollinationsAccessTokenForProfile(user.id)}`,
      }
    : undefined;
  const asset = await persistStandaloneAsset({
    ownerId: user.id,
    sourceUrl: imageUrl,
    sourceHeaders,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        assetId: asset.id,
        dataUrl: asset.url,
        secureUrl: asset.url,
        publicId: asset.objectKey,
        bytes: asset.byteSize,
      },
      'Image persisted successfully'
    )
  );
});

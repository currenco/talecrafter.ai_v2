import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { persistStandaloneAsset } from '../services/asset.service.js';
import { buildGeneratedImageSource } from '../services/generation.service.js';
import { syncUserFromAuth } from '../services/user.service.js';

export const createPollinationsImageUrl = asyncHandler(async (req, res) => {
  const imageUrl = buildGeneratedImageSource(req.validated.body.prompt, {
    seed: req.validated.body.seed,
    width: req.validated.body.width,
    height: req.validated.body.height,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { imageUrl }, 'Image URL generated'));
});

export const persistImage = asyncHandler(async (req, res) => {
  const user = await syncUserFromAuth(req.auth.userId);
  const asset = await persistStandaloneAsset({
    ownerId: user.id,
    sourceUrl: req.validated.body.imageUrl,
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

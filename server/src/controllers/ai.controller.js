import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { generateNarrativeText } from '../services/generation.service.js';
import { syncUserFromAuth } from '../services/user.service.js';
import {
  assertGenerationAccess,
  reserveUsage,
  releaseUsage,
} from '../services/entitlement.service.js';

export const generateGemini = asyncHandler(async (req, res) => {
  const user = await syncUserFromAuth(req.auth.userId);
  const access = await assertGenerationAccess(user.id);
  const reservation = await reserveUsage({
    bucket: `user:${user.id}:${access.period}:ideas`,
    limit: access.plan === 'creator' ? 60 : 6,
  });
  let text;
  try {
    text = await generateNarrativeText(req.validated.body);
  } catch (error) {
    await releaseUsage(reservation);
    throw error;
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { text }, 'Gemini response generated'));
});

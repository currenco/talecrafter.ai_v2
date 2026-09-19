import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { generateNarrativeText } from '../services/generation.service.js';

export const generateGemini = asyncHandler(async (req, res) => {
  const text = await generateNarrativeText(req.validated.body);
  return res
    .status(200)
    .json(new ApiResponse(200, { text }, 'Gemini response generated'));
});

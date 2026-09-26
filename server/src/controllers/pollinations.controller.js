import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  beginPollinationsConnection,
  completePollinationsConnection,
  disconnectPollinations,
  getPollinationsConnectionStatus,
} from '../services/pollinations.service.js';

export const connectPollinations = asyncHandler(async (req, res) => {
  const result = await beginPollinationsConnection({ userId: req.auth.userId });
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Pollinations authorization started'));
});

export const handlePollinationsCallback = asyncHandler(async (req, res) => {
  const result = await completePollinationsConnection({
    userId: req.auth.userId,
    code: req.validated.body.code,
    state: req.validated.body.state,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Pollinations wallet connected'));
});

export const getPollinationsStatus = asyncHandler(async (req, res) => {
  const result = await getPollinationsConnectionStatus({
    userId: req.auth.userId,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Pollinations connection fetched'));
});

export const removePollinationsConnection = asyncHandler(async (req, res) => {
  const result = await disconnectPollinations({ userId: req.auth.userId });
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Pollinations wallet disconnected'));
});

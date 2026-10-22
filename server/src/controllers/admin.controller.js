import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  deleteAdminStory,
  deleteAdminUser,
  listAdminStories,
  listAdminUsers,
  getAdminUserLibrary,
} from '../services/admin.service.js';

export const getAdminUserStories = asyncHandler(async (req, res) => {
  const result = await getAdminUserLibrary(
    req.validated.params.userId,
    req.validated.query
  );
  return res.json(new ApiResponse(200, result, 'User library fetched'));
});

export const getAdminStories = asyncHandler(async (req, res) => {
  const stories = await listAdminStories(req.validated.query);
  return res.status(200).json(new ApiResponse(200, stories, 'Stories fetched'));
});

export const getAdminUsers = asyncHandler(async (req, res) => {
  const users = await listAdminUsers(req.validated.query);
  return res.status(200).json(new ApiResponse(200, users, 'Users fetched'));
});

export const removeAdminStory = asyncHandler(async (req, res) => {
  const story = await deleteAdminStory(req.validated.params.storyId);
  return res.status(200).json(new ApiResponse(200, story, 'Story deleted'));
});

export const removeAdminUser = asyncHandler(async (req, res) => {
  const user = await deleteAdminUser(req.validated.params.userId);
  return res.status(200).json(new ApiResponse(200, user, 'User deleted'));
});

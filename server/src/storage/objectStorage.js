import ApiError from '../utils/ApiError.js';

const REQUIRED_METHODS = ['uploadFromUrl', 'getPublicUrl', 'deleteObject'];

export const assertObjectStorage = storage => {
  if (!storage || typeof storage !== 'object') {
    throw new ApiError(500, 'Object storage adapter is not configured');
  }

  for (const method of REQUIRED_METHODS) {
    if (typeof storage[method] !== 'function') {
      throw new ApiError(500, `Object storage adapter is missing ${method}`);
    }
  }

  if (!storage.provider || !storage.container) {
    throw new ApiError(500, 'Object storage adapter identity is incomplete');
  }

  return storage;
};

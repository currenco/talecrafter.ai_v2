import { createCloudinaryStorage } from './cloudinary.storage.js';

let storage;

export const getObjectStorage = () => {
  storage ??= createCloudinaryStorage();
  return storage;
};

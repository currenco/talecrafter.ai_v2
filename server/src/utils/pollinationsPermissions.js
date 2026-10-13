export const hasImagePermission = (keyDetails, imageModel) => {
  const models = keyDetails?.permissions?.models;
  // Explicit null grants all categories; missing permissions must fail closed.
  if (models === null) return true;
  if (!Array.isArray(models)) return false;
  return (
    models.includes('image') ||
    (typeof imageModel === 'string' &&
      imageModel.length > 0 &&
      models.includes(imageModel))
  );
};

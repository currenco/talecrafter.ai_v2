import {
  generateGeminiText,
  generateStoryJson,
  getGeminiModelName,
} from './gemini.service.js';
import {
  buildPollinationsImageRequest,
  buildPollinationsImageUrl,
} from './image.service.js';

export const getGenerationProviderMetadata = () => ({
  provider: 'gemini',
  model: getGeminiModelName(),
  imageProvider: 'pollinations',
  imageModel:
    process.env.POLLINATIONS_IMAGE_MODEL ?? 'black-forest-labs/flux.1-schnell',
});

export const generateStoryDraft = options => generateStoryJson(options);

export const generateNarrativeText = options => generateGeminiText(options);

export const buildGeneratedImageSource = (prompt, options) =>
  buildPollinationsImageUrl(prompt, options);

export const buildGeneratedImageRequest = (prompt, accessToken, options) =>
  buildPollinationsImageRequest(prompt, accessToken, options);

import {
  generateGeminiText,
  generateStoryJson,
  getGeminiModelName,
} from './gemini.service.js';
import { buildPollinationsImageUrl } from './image.service.js';

export const getGenerationProviderMetadata = () => ({
  provider: 'gemini',
  model: getGeminiModelName(),
  imageProvider: 'pollinations',
});

export const generateStoryDraft = options => generateStoryJson(options);

export const generateNarrativeText = options => generateGeminiText(options);

export const buildGeneratedImageSource = (prompt, options) =>
  buildPollinationsImageUrl(prompt, options);

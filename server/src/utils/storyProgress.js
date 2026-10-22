import { EventEmitter } from 'node:events';

// The current Render service runs generation and HTTP in the same process.
// Use shared pub/sub before deploying multiple API replicas or separate workers.
const events = new EventEmitter();
events.setMaxListeners(100);

export const publishStoryProgress = storyId => events.emit(storyId);
export const subscribeStoryProgress = (storyId, listener) => {
  events.on(storyId, listener);
  return () => events.off(storyId, listener);
};

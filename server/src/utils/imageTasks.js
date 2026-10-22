// Finish in-flight work after an error, but do not schedule more paid requests.
export const runImageTasks = async (items, work, concurrency = 2) => {
  let cursor = 0;
  let failure;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (!failure && cursor < items.length) {
        const item = items[cursor++];
        try {
          await work(item);
        } catch (error) {
          failure ??= error;
        }
      }
    })
  );
  if (failure) throw failure;
};

export const createSerialWriter = () => {
  let tail = Promise.resolve();
  return work => {
    const next = tail.then(work);
    tail = next.catch(() => undefined);
    return next;
  };
};

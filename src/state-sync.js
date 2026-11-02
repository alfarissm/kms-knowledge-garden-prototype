// Serialize commands; retries retain their id so a lost response cannot award twice.
export function createActionQueue({ send, apply, onError = () => {} }) {
  let tail = Promise.resolve();
  let cancelled = false;
  return {
    cancel() { cancelled = true; },
    enqueue(action) {
      const id = crypto.randomUUID();
      const task = tail.then(async () => {
        if (cancelled) return null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const result = await send(action, id);
            if (cancelled) return null;
            apply(result);
            return result;
          } catch (error) {
            if (cancelled) return null;
            const retryable = !error.status || error.status === 409 || error.status >= 500;
            if (retryable && attempt < 2) continue;
            onError(error);
            return null;
          }
        }
      });
      tail = task.catch(() => {});
      return task;
    },
  };
}

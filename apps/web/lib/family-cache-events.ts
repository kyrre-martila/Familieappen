type FamilyCacheResetListener = () => void;

const listeners = new Set<FamilyCacheResetListener>();

export function registerFamilyCacheResetListener(listener: FamilyCacheResetListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function notifyFamilyCacheReset(): void {
  for (const listener of listeners) {
    listener();
  }
}

export type RuntimeTarget = 'web' | 'electron';

function detectRuntimeTarget(): RuntimeTarget {
  const envTarget = (import.meta.env.VITE_RUNTIME_TARGET as RuntimeTarget | undefined)?.trim();
  if (envTarget === 'electron' || envTarget === 'web') {
    return envTarget;
  }

  if (typeof window !== 'undefined' && 'electronAPI' in window) {
    return 'electron';
  }

  return 'web';
}

export const runtimeTarget = detectRuntimeTarget();
export const isElectronRuntimeTarget = runtimeTarget === 'electron';
export const isWebRuntimeTarget = runtimeTarget === 'web';

export interface FrontendFeatureFlags {
  syncSessionV2: boolean;
  queueRunnerV2: boolean;
  historyLoaderV2: boolean;
  virtualizedBrowsersV2: boolean;
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  return defaultValue;
}

export const featureFlags: FrontendFeatureFlags = {
  syncSessionV2: parseBooleanEnv(import.meta.env.VITE_SYNC_SESSION_V2 as string | undefined, true),
  queueRunnerV2: parseBooleanEnv(import.meta.env.VITE_QUEUE_RUNNER_V2 as string | undefined, true),
  historyLoaderV2: parseBooleanEnv(import.meta.env.VITE_HISTORY_LOADER_V2 as string | undefined, true),
  virtualizedBrowsersV2: parseBooleanEnv(
    import.meta.env.VITE_VIRTUALIZED_BROWSERS_V2 as string | undefined,
    true
  ),
};

export function isFeatureEnabled(flag: keyof FrontendFeatureFlags): boolean {
  return featureFlags[flag];
}


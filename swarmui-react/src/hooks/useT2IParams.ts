import { useState, useEffect, useCallback, useMemo } from 'react';
import { swarmClient } from '../api/client';
import { useSessionStore } from '../stores/session';
import type { T2IParam, T2IParamGroup, T2IParamsResponse } from '../api/types';
import type { SamplerOption, SchedulerOption } from '../data/samplerData';
import {
  SAMPLER_OPTIONS as FALLBACK_SAMPLERS,
  SCHEDULER_OPTIONS as FALLBACK_SCHEDULERS,
  createUnknownSamplingOption,
} from '../data/samplerData';
import { logger } from '../utils/logger';

interface ParamRange {
  min: number;
  max: number;
  step?: number;
  default: number | string | boolean;
  viewMax?: number;
}

interface T2IParamsState {
  params: T2IParam[];
  groups: T2IParamGroup[];
  isLoaded: boolean;
  isLoading: boolean;
  samplerOptions: SamplerOption[];
  schedulerOptions: SchedulerOption[];
  paramRanges: Record<string, ParamRange>;
  paramDefaults: Record<string, string | number | boolean>;
  extraParams: T2IParam[];
  reload: () => Promise<void>;
}

// Parameter IDs that have dedicated UI components
const KNOWN_PARAM_IDS = new Set([
  'prompt', 'negativeprompt', 'images', 'steps', 'cfgscale',
  'seed', 'width', 'height', 'model', 'sampler', 'scheduler',
  'clipstopatlayer', 'initimage', 'initimagecreativity',
  'initimageresettonorm', 'initimagenoise',
  'variationseed', 'variationseedstrength', 'vae',
  'refinermodel', 'refinercontrol', 'refinerupscale',
  'refinermethod', 'refinervae', 'refinersteps', 'refinercfgscale',
  'refinerdotiling', 'refinerupscalemethod',
  'loras', 'loraweights',
  'controlnetmodel', 'controlnetstrength', 'controlnetstart',
  'controlnetend', 'controlnetimageinput',
  'controlnettwomodel', 'controlnettwostrength', 'controlnettwostart',
  'controlnettwoend', 'controlnettwoimageinput',
  'controlnetthreemodel', 'controlnetthreestrength', 'controlnetthreestart',
  'controlnetthreeend', 'controlnetthreeimageinput',
  'batchsize', 'maskimage', 'maskblur', 'invertmask',
  'removebackground', 'donotsave', 'dontsaveintermediates',
  'nopreviews',
  'seamlesstileable', 'resizemode', 'coloradjust',
  'freeublockone', 'freeublocktwo', 'freeuskipone', 'freeuskiptwo',
  'videomodel', 'videoframes', 'videosteps', 'videocfg',
  'videofps', 'videoformat', 'videoboomerang',
  'text2videoframes', 'text2videofps', 'text2videoformat',
]);

export function useT2IParams(): T2IParamsState {
  const isInitialized = useSessionStore((state) => state.isInitialized);
  const [rawResponse, setRawResponse] = useState<T2IParamsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadParams = useCallback(async () => {
    if (!isInitialized) return;
    setIsLoading(true);
    try {
      const response = await swarmClient.listT2IParams();
      setRawResponse(response);
    } catch (error) {
      logger.error('Failed to load T2I params:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      loadParams();
    }
  }, [isInitialized, loadParams]);

  const params = rawResponse?.list ?? [];
  const groups = rawResponse?.groups ?? [];

  const samplerLookup = useMemo(() => {
    const map = new Map<string, SamplerOption>();
    FALLBACK_SAMPLERS.forEach((option) => map.set(option.value, option));
    return map;
  }, []);

  const schedulerLookup = useMemo(() => {
    const map = new Map<string, SchedulerOption>();
    FALLBACK_SCHEDULERS.forEach((option) => map.set(option.value, option));
    return map;
  }, []);

  const samplerOptions = useMemo((): SamplerOption[] => {
    const samplerParam = params.find(p => p.id === 'sampler');
    if (samplerParam?.values && samplerParam.values.length > 0) {
      return samplerParam.values.map((value, index) => {
        const fallback = samplerLookup.get(value);
        const backendLabel = samplerParam.value_names?.[index] || undefined;
        if (fallback) {
          return {
            ...fallback,
            label: backendLabel || fallback.label,
          };
        }
        return createUnknownSamplingOption('sampler', value, backendLabel) as SamplerOption;
      });
    }
    return FALLBACK_SAMPLERS;
  }, [params, samplerLookup]);

  const schedulerOptions = useMemo((): SchedulerOption[] => {
    const schedulerParam = params.find(p => p.id === 'scheduler');
    if (schedulerParam?.values && schedulerParam.values.length > 0) {
      return schedulerParam.values.map((value, index) => {
        const fallback = schedulerLookup.get(value);
        const backendLabel = schedulerParam.value_names?.[index] || undefined;
        if (fallback) {
          return {
            ...fallback,
            label: backendLabel || fallback.label,
          };
        }
        return createUnknownSamplingOption('scheduler', value, backendLabel) as SchedulerOption;
      });
    }
    return FALLBACK_SCHEDULERS;
  }, [params, schedulerLookup]);

  const paramRanges = useMemo(() => {
    const ranges: Record<string, ParamRange> = {};
    for (const param of params) {
      if (param.min !== undefined && param.max !== undefined) {
        ranges[param.id] = {
          min: param.min,
          max: param.max,
          step: param.step,
          default: param.default,
          viewMax: param.view_max,
        };
      }
    }
    return ranges;
  }, [params]);

  const paramDefaults = useMemo(() => {
    const defaults: Record<string, string | number | boolean> = {};
    for (const param of params) {
      if (param.default !== undefined) {
        defaults[param.id] = param.default;
      }
    }
    return defaults;
  }, [params]);

  const extraParams = useMemo(
    () => params.filter(p => !KNOWN_PARAM_IDS.has(p.id) && p.visible && !p.extra_hidden),
    [params]
  );

  return {
    params,
    groups,
    isLoaded: rawResponse !== null,
    isLoading,
    samplerOptions,
    schedulerOptions,
    paramRanges,
    paramDefaults,
    extraParams,
    reload: loadParams,
  };
}

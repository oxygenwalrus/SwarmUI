import { useState, useEffect, useCallback, useMemo } from 'react';
import { notifications } from '@mantine/notifications';
import { swarmClient } from '../../../api/client';
import { logger } from '../../../utils/logger';
import type { Model, VAEModel, BackendStatus } from '../../../api/types';
import { createUniqueOptions } from '../../../utils/optionUtils';
import { useSessionStore } from '../../../stores/session';
import { useIsMounted } from '../../../hooks/useAbortController';
import { usePresetsStore } from '../../../stores/presets';

/**
 * Hook for loading all model-related data from the SwarmUI API.
 * Consolidates all data fetching logic from GeneratePage.
 * IMPORTANT: Waits for session initialization before making API calls.
 */
export function useDataLoaders() {
    // Get session initialization status
    const isInitialized = useSessionStore((state) => state.isInitialized);

    // Prevent state updates on unmounted component
    const isMounted = useIsMounted();

    // Model state
    const [models, setModels] = useState<Model[]>([]);
    const [loadingModels, setLoadingModels] = useState(true);

    // VAE state
    const [vaeModels, setVAEModels] = useState<VAEModel[]>([]);
    const [loadingVAEs, setLoadingVAEs] = useState(true);

    // ControlNet state
    const [controlNetModels, setControlNetModels] = useState<any[]>([]);
    const [loadingControlNets, setLoadingControlNets] = useState(true);

    // Backend state
    const [backends, setBackends] = useState<BackendStatus[]>([]);
    const [loadingBackends, setLoadingBackends] = useState(false);

    // Additional model types
    const [upscaleModels, setUpscaleModels] = useState<Model[]>([]);
    const [embeddingModels, setEmbeddingModels] = useState<Model[]>([]);
    const [wildcardModels, setWildcardModels] = useState<Model[]>([]);

    // Load models
    const loadModels = useCallback(async () => {
        if (!isInitialized) return [];
        setLoadingModels(true);
        logger.debug('Fetching model list...');
        try {
            const modelList = await swarmClient.listModels();
            if (!isMounted()) return []; // Guard against unmount
            logger.debug('Loaded models:', modelList);
            setModels(modelList);
            return modelList;
        } catch (error) {
            if (!isMounted()) return [];
            logger.error('Failed to load models:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to load model list',
                color: 'red',
            });
            return [];
        } finally {
            if (isMounted()) setLoadingModels(false);
        }
    }, [isInitialized, isMounted]);

    // Load VAEs
    const loadVAEs = useCallback(async () => {
        if (!isInitialized) return;
        setLoadingVAEs(true);
        logger.debug('Fetching VAE list...');
        try {
            const vaeList = await swarmClient.listVAEs();
            if (!isMounted()) return;
            logger.debug('Loaded VAEs:', vaeList);
            setVAEModels(vaeList);
        } catch (error) {
            if (isMounted()) logger.error('Failed to load VAEs:', error);
        } finally {
            if (isMounted()) setLoadingVAEs(false);
        }
    }, [isInitialized, isMounted]);

    // Load ControlNets
    const loadControlNets = useCallback(async () => {
        if (!isInitialized) return;
        setLoadingControlNets(true);
        try {
            const controlNetList = await swarmClient.listControlNets();
            if (!isMounted()) return;
            setControlNetModels(controlNetList);
        } catch (error) {
            if (isMounted()) logger.error('Failed to load ControlNets:', error);
        } finally {
            if (isMounted()) setLoadingControlNets(false);
        }
    }, [isInitialized, isMounted]);

    // Load backends
    const loadBackends = useCallback(async () => {
        if (!isInitialized) return [];
        setLoadingBackends(true);
        try {
            const backendList = await swarmClient.listBackends();
            if (!isMounted()) return [];
            setBackends(backendList);
            return backendList;
        } catch (error) {
            if (isMounted()) console.error('Failed to load backends:', error);
            return [];
        } finally {
            if (isMounted()) setLoadingBackends(false);
        }
    }, [isInitialized, isMounted]);

    // Load upscalers
    const loadUpscalers = useCallback(async () => {
        if (!isInitialized) return;
        try {
            const list = await swarmClient.listUpscalers();
            if (isMounted()) setUpscaleModels(list);
        } catch (e) {
            if (isMounted()) logger.error('Failed to load upscalers:', e);
        }
    }, [isInitialized, isMounted]);

    // Load embeddings
    const loadEmbeddings = useCallback(async () => {
        if (!isInitialized) return;
        try {
            const list = await swarmClient.listEmbeddings();
            if (isMounted()) setEmbeddingModels(list);
        } catch (e) {
            if (isMounted()) logger.error('Failed to load embeddings:', e);
        }
    }, [isInitialized, isMounted]);

    // Load wildcards
    const loadWildcards = useCallback(async () => {
        if (!isInitialized) return;
        try {
            const list = await swarmClient.listWildcards();
            if (isMounted()) setWildcardModels(list);
        } catch (e) {
            if (isMounted()) logger.error('Failed to load wildcards:', e);
        }
    }, [isInitialized, isMounted]);

    // Load all data when session is initialized
    const loadAll = useCallback(() => {
        if (!isInitialized) return;
        loadModels();
        loadVAEs();
        loadBackends();
        loadControlNets();
        loadUpscalers();
        loadEmbeddings();
        loadWildcards();
        // Load presets from backend
        usePresetsStore.getState().loadFromBackend();
    }, [isInitialized, loadModels, loadVAEs, loadBackends, loadControlNets, loadUpscalers, loadEmbeddings, loadWildcards]);

    // Only load when session becomes initialized
    useEffect(() => {
        if (isInitialized) {
            loadAll();
        }
    }, [isInitialized, loadAll]);

    // Memoized options for Select components
    const vaeOptions = useMemo(() => createUniqueOptions(
        vaeModels,
        (vae) => vae.name,
        (vae) => vae.title || vae.name,
        [{ value: 'Automatic', label: 'Automatic' }, { value: 'None', label: 'None' }]
    ), [vaeModels]);

    const controlNetOptions = useMemo(() => createUniqueOptions(
        controlNetModels,
        (cn) => cn.name,
        (cn) => cn.title || cn.name
    ), [controlNetModels]);

    const backendOptions = useMemo(() => backends.map(backend => ({
        value: backend.id,
        label: `${backend.type} (${backend.status})`,
        disabled: backend.status !== 'running',
    })), [backends]);

    const embeddingOptions = useMemo(() => embeddingModels.map(e => ({
        value: e.name,
        label: e.title || e.name
    })), [embeddingModels]);

    const wildcardOptions = useMemo(() => wildcardModels.map(w => ({
        value: w.name,
        label: w.title || w.name
    })), [wildcardModels]);

    return {
        // Raw data
        models,
        vaeModels,
        controlNetModels,
        backends,
        upscaleModels,
        embeddingModels,
        wildcardModels,

        // Loading states
        loadingModels,
        loadingVAEs,
        loadingControlNets,
        loadingBackends,

        // Loaders (for manual refresh)
        loadModels,
        loadVAEs,
        loadControlNets,
        loadBackends,
        loadUpscalers,
        loadEmbeddings,
        loadWildcards,
        loadAll,

        // Pre-computed options for Select components
        vaeOptions,
        controlNetOptions,
        backendOptions,
        embeddingOptions,
        wildcardOptions,
    };
}

export type DataLoaders = ReturnType<typeof useDataLoaders>;

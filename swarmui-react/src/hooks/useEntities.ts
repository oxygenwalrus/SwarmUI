/**
 * Entity Hooks
 * 
 * React hooks for accessing normalized entities with memoization.
 * Provides backward-compatible access patterns for existing components.
 */

import { useMemo, useCallback } from 'react';
import { useEntityStore } from '../stores/entityStore';
import type {
    EntityType,
    EntityTypeMap,
    JobEntity,
    BatchEntity,
    ImageEntity,
    HistoryEntryEntity,
    FavoriteEntity,
    PresetEntity,
    WorkflowEntity,
} from '../stores/entityTypes';

// ============================================================================
// Generic Entity Hooks
// ============================================================================

/**
 * Get a single entity by ID
 */
export function useEntity<K extends EntityType>(
    type: K,
    id: string | undefined
): EntityTypeMap[K] | undefined {
    return useEntityStore(
        useCallback(
            (state) => (id ? state.entities[type][id] : undefined) as EntityTypeMap[K] | undefined,
            [type, id]
        )
    );
}

/**
 * Get multiple entities by IDs (maintains order)
 */
export function useEntities<K extends EntityType>(
    type: K,
    ids: string[]
): EntityTypeMap[K][] {
    const entities = useEntityStore((state) => state.entities[type]);

    return useMemo(() => {
        return ids
            .map((id) => entities[id])
            .filter(Boolean) as EntityTypeMap[K][];
    }, [entities, ids]);
}

/**
 * Get all entities of a type
 */
export function useAllEntities<K extends EntityType>(
    type: K
): EntityTypeMap[K][] {
    const entities = useEntityStore((state) => state.entities[type]);

    return useMemo(() => {
        return Object.values(entities) as EntityTypeMap[K][];
    }, [entities]);
}

/**
 * Get all entity IDs of a type
 */
export function useEntityIds<K extends EntityType>(type: K): string[] {
    const entities = useEntityStore((state) => state.entities[type]);

    return useMemo(() => Object.keys(entities), [entities]);
}

// ============================================================================
// Typed Entity Hooks (for convenience)
// ============================================================================

// Jobs
export function useJob(id: string | undefined): JobEntity | undefined {
    return useEntity('jobs', id);
}

export function useJobs(ids: string[]): JobEntity[] {
    return useEntities('jobs', ids);
}

export function useAllJobs(): JobEntity[] {
    return useAllEntities('jobs');
}

export function useJobIds(): string[] {
    return useEntityIds('jobs');
}

// Batches
export function useBatch(id: string | undefined): BatchEntity | undefined {
    return useEntity('batches', id);
}

export function useBatches(ids: string[]): BatchEntity[] {
    return useEntities('batches', ids);
}

export function useAllBatches(): BatchEntity[] {
    return useAllEntities('batches');
}

// Images
export function useImage(id: string | undefined): ImageEntity | undefined {
    return useEntity('images', id);
}

export function useImages(ids: string[]): ImageEntity[] {
    return useEntities('images', ids);
}

export function useAllImages(): ImageEntity[] {
    return useAllEntities('images');
}

// History
export function useHistoryEntry(id: string | undefined): HistoryEntryEntity | undefined {
    return useEntity('history', id);
}

export function useHistoryEntries(ids: string[]): HistoryEntryEntity[] {
    return useEntities('history', ids);
}

export function useAllHistoryEntries(): HistoryEntryEntity[] {
    return useAllEntities('history');
}

// Favorites
export function useFavorite(id: string | undefined): FavoriteEntity | undefined {
    return useEntity('favorites', id);
}

export function useFavorites(ids: string[]): FavoriteEntity[] {
    return useEntities('favorites', ids);
}

export function useAllFavorites(): FavoriteEntity[] {
    return useAllEntities('favorites');
}

export function useIsFavorite(path: string): boolean {
    const favorite = useEntity('favorites', path);
    return favorite !== undefined;
}

// Presets
export function usePreset(id: string | undefined): PresetEntity | undefined {
    return useEntity('presets', id);
}

export function usePresets(ids: string[]): PresetEntity[] {
    return useEntities('presets', ids);
}

export function useAllPresets(): PresetEntity[] {
    return useAllEntities('presets');
}

// Workflows
export function useWorkflow(id: string | undefined): WorkflowEntity | undefined {
    return useEntity('workflows', id);
}

export function useWorkflows(ids: string[]): WorkflowEntity[] {
    return useEntities('workflows', ids);
}

export function useAllWorkflows(): WorkflowEntity[] {
    return useAllEntities('workflows');
}

// ============================================================================
// Derived Data Hooks
// ============================================================================

/**
 * Get jobs sorted by priority and creation time
 */
export function useSortedJobs(): JobEntity[] {
    const jobs = useAllJobs();

    return useMemo(() => {
        const priorityWeight: Record<string, number> = {
            urgent: 4,
            high: 3,
            normal: 2,
            low: 1,
        };

        return [...jobs].sort((a, b) => {
            const priorityDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
            if (priorityDiff !== 0) return priorityDiff;
            return a.createdAt - b.createdAt;
        });
    }, [jobs]);
}

/**
 * Get jobs by status
 */
export function useJobsByStatus(status: JobEntity['status']): JobEntity[] {
    const jobs = useAllJobs();

    return useMemo(() => {
        return jobs.filter((job) => job.status === status);
    }, [jobs, status]);
}

/**
 * Get jobs in a batch
 */
export function useJobsInBatch(batchId: string): JobEntity[] {
    const jobs = useAllJobs();

    return useMemo(() => {
        return jobs.filter((job) => job.batchId === batchId);
    }, [jobs, batchId]);
}

/**
 * Get history entries sorted by timestamp (newest first)
 */
export function useSortedHistory(): HistoryEntryEntity[] {
    const entries = useAllHistoryEntries();

    return useMemo(() => {
        return [...entries].sort((a, b) => b.timestamp - a.timestamp);
    }, [entries]);
}

/**
 * Get favorites sorted by timestamp (newest first)
 */
export function useSortedFavorites(): FavoriteEntity[] {
    const favorites = useAllFavorites();

    return useMemo(() => {
        return [...favorites].sort((a, b) => b.timestamp - a.timestamp);
    }, [favorites]);
}

/**
 * Get pending operations count
 */
export function usePendingOperationsCount(): number {
    return useEntityStore((state) => state.pendingOperations.length);
}

/**
 * Check if there are any pending operations
 */
export function useHasPendingOperations(): boolean {
    return useEntityStore((state) => state.pendingOperations.length > 0);
}

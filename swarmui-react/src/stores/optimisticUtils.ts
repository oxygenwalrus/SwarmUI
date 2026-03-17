/**
 * Optimistic Update Utilities
 * 
 * Provides helper functions for creating optimistic updates with automatic rollback.
 */

import { useEntityStore } from './entityStore';
import type {
    EntityType,
    EntityTypeMap,
    OptimisticResult,
} from './entityTypes';

// ============================================================================
// Optimistic Update Functions
// ============================================================================

/**
 * Create an entity optimistically with rollback support
 */
export function optimisticCreate<K extends EntityType>(
    type: K,
    entity: EntityTypeMap[K]
): OptimisticResult<EntityTypeMap[K]> {
    const store = useEntityStore.getState();

    // Add the entity optimistically
    store.setEntity(type, entity);

    // Track the pending operation
    const operationId = store.addPendingOperation({
        entityType: type,
        entityId: entity.id,
        operation: 'create',
        previousState: undefined,
    });

    return {
        optimisticValue: entity,
        operationId,
        commit: () => store.commitOperation(operationId),
        rollback: () => store.rollbackOperation(operationId),
    };
}

/**
 * Update an entity optimistically with rollback support
 */
export function optimisticUpdate<K extends EntityType>(
    type: K,
    id: string,
    updates: Partial<EntityTypeMap[K]>
): OptimisticResult<EntityTypeMap[K]> | null {
    const store = useEntityStore.getState();
    const previousState = store.getEntity(type, id);

    if (!previousState) {
        console.warn(`[optimisticUpdate] Entity not found: ${type}/${id}`);
        return null;
    }

    // Apply the update optimistically
    store.updateEntity(type, id, updates);

    // Track the pending operation
    const operationId = store.addPendingOperation({
        entityType: type,
        entityId: id,
        operation: 'update',
        previousState,
    });

    const updatedEntity = store.getEntity(type, id)!;

    return {
        optimisticValue: updatedEntity,
        operationId,
        commit: () => store.commitOperation(operationId),
        rollback: () => store.rollbackOperation(operationId),
    };
}

/**
 * Delete an entity optimistically with rollback support
 */
export function optimisticDelete<K extends EntityType>(
    type: K,
    id: string
): OptimisticResult<null> | null {
    const store = useEntityStore.getState();
    const previousState = store.getEntity(type, id);

    if (!previousState) {
        console.warn(`[optimisticDelete] Entity not found: ${type}/${id}`);
        return null;
    }

    // Track the pending operation BEFORE removing
    const operationId = store.addPendingOperation({
        entityType: type,
        entityId: id,
        operation: 'delete',
        previousState,
    });

    // Remove the entity optimistically
    store.removeEntity(type, id);

    return {
        optimisticValue: null,
        operationId,
        commit: () => store.commitOperation(operationId),
        rollback: () => store.rollbackOperation(operationId),
    };
}

/**
 * Batch update multiple entities optimistically
 */
export function optimisticBatchUpdate<K extends EntityType>(
    type: K,
    updates: Array<{ id: string; updates: Partial<EntityTypeMap[K]> }>
): Array<OptimisticResult<EntityTypeMap[K]> | null> {
    return updates.map(({ id, updates: entityUpdates }) =>
        optimisticUpdate(type, id, entityUpdates)
    );
}

/**
 * Batch delete multiple entities optimistically
 */
export function optimisticBatchDelete<K extends EntityType>(
    type: K,
    ids: string[]
): Array<OptimisticResult<null> | null> {
    return ids.map((id) => optimisticDelete(type, id));
}

// ============================================================================
// Async Optimistic Helpers
// ============================================================================

/**
 * Execute an async operation with optimistic update
 * Automatically commits on success, rolls back on failure
 */
export async function withOptimisticUpdate<T, K extends EntityType>(
    options: {
        type: K;
        id: string;
        optimisticUpdates: Partial<EntityTypeMap[K]>;
        asyncOperation: () => Promise<T>;
        onSuccess?: (result: T) => void;
        onError?: (error: Error) => void;
    }
): Promise<T> {
    const { type, id, optimisticUpdates, asyncOperation, onSuccess, onError } = options;

    const result = optimisticUpdate(type, id, optimisticUpdates);

    if (!result) {
        throw new Error(`Entity not found: ${type}/${id}`);
    }

    try {
        const asyncResult = await asyncOperation();
        result.commit();
        onSuccess?.(asyncResult);
        return asyncResult;
    } catch (error) {
        result.rollback();
        onError?.(error as Error);
        throw error;
    }
}

/**
 * Execute an async create operation with optimistic update
 */
export async function withOptimisticCreate<T, K extends EntityType>(
    options: {
        type: K;
        entity: EntityTypeMap[K];
        asyncOperation: () => Promise<T>;
        onSuccess?: (result: T) => void;
        onError?: (error: Error) => void;
    }
): Promise<T> {
    const { type, entity, asyncOperation, onSuccess, onError } = options;

    const result = optimisticCreate(type, entity);

    try {
        const asyncResult = await asyncOperation();
        result.commit();
        onSuccess?.(asyncResult);
        return asyncResult;
    } catch (error) {
        result.rollback();
        onError?.(error as Error);
        throw error;
    }
}

/**
 * Execute an async delete operation with optimistic update
 */
export async function withOptimisticDelete<T, K extends EntityType>(
    options: {
        type: K;
        id: string;
        asyncOperation: () => Promise<T>;
        onSuccess?: (result: T) => void;
        onError?: (error: Error) => void;
    }
): Promise<T> {
    const { type, id, asyncOperation, onSuccess, onError } = options;

    const result = optimisticDelete(type, id);

    if (!result) {
        throw new Error(`Entity not found: ${type}/${id}`);
    }

    try {
        const asyncResult = await asyncOperation();
        result.commit();
        onSuccess?.(asyncResult);
        return asyncResult;
    } catch (error) {
        result.rollback();
        onError?.(error as Error);
        throw error;
    }
}

/**
 * Favorites Store
 * 
 * UI slice for favorite images. References favorites in the entity store.
 * Uses image path as the ID for simplicity and deduplication.
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { useEntityStore } from './entityStore';
import type { FavoriteEntity } from './entityTypes';

// Legacy interface for backward compatibility
export interface FavoriteImage {
    path: string;
    timestamp: number;
    prompt?: string;
    model?: string;
}

interface FavoritesUIState {
    favoriteIds: string[];  // Image paths as IDs

    // Memoization cache (not persisted)
    _cachedFavorites: FavoriteImage[];
    _favoritesCacheKey: string | null;
}

interface FavoritesUIActions {
    addFavorite: (image: FavoriteImage) => void;
    removeFavorite: (path: string) => void;
    isFavorite: (path: string) => boolean;
    clearFavorites: () => void;

    // Legacy getter for backward compatibility
    get favorites(): FavoriteImage[];
}

// Convert FavoriteEntity to legacy FavoriteImage format
const toFavoriteImage = (entity: FavoriteEntity): FavoriteImage => ({
    path: entity.id, // ID is the path
    timestamp: entity.timestamp,
    prompt: entity.prompt,
    model: entity.model,
});

// Memoized selector for favorites - only recomputes when dependencies change
export const selectFavorites = (
    state: FavoritesUIState,
    entityFavorites: Record<string, FavoriteEntity>
): FavoriteImage[] => {
    const cacheKey = `${state.favoriteIds.join(',')}:${Object.keys(entityFavorites).length}`;

    if (cacheKey === state._favoritesCacheKey) {
        return state._cachedFavorites;
    }

    const favorites = state.favoriteIds
        .map((id) => entityFavorites[id])
        .filter(Boolean)
        .map(toFavoriteImage);

    queueMicrotask(() => {
        useFavoritesStore.setState({ _cachedFavorites: favorites, _favoritesCacheKey: cacheKey });
    });

    return favorites;
};

export const useFavoritesStore = create<FavoritesUIState & FavoritesUIActions>()(
    devtools(
        persist(
            (set, get) => ({
                favoriteIds: [],

                // Memoization cache initialized
                _cachedFavorites: [],
                _favoritesCacheKey: null,

                // Legacy getter using memoized selector
                get favorites() {
                    const entityStore = useEntityStore.getState();
                    return selectFavorites(get(), entityStore.entities.favorites);
                },

                addFavorite: (image) => {
                    const { favoriteIds } = get();

                    // Use path as ID for deduplication
                    if (favoriteIds.includes(image.path)) {
                        return; // Already a favorite
                    }

                    const favoriteEntity: FavoriteEntity = {
                        id: image.path, // Use path as ID
                        timestamp: image.timestamp,
                        prompt: image.prompt,
                        model: image.model,
                    };

                    // Add to entity store
                    useEntityStore.getState().setEntity('favorites', favoriteEntity);

                    // Update UI state
                    set((state) => ({
                        favoriteIds: [...state.favoriteIds, image.path],
                    }));
                },

                removeFavorite: (path) => {
                    useEntityStore.getState().removeEntity('favorites', path);
                    set((state) => ({
                        favoriteIds: state.favoriteIds.filter((id) => id !== path),
                    }));
                },

                isFavorite: (path) => {
                    return get().favoriteIds.includes(path);
                },

                clearFavorites: () => {
                    const { favoriteIds } = get();
                    useEntityStore.getState().removeEntities('favorites', favoriteIds);
                    set({ favoriteIds: [] });
                },
            }),
            {
                name: 'swarm-favorites',
                partialize: (state) => ({
                    favoriteIds: state.favoriteIds,
                }),
            }
        ),
        { name: 'FavoritesStore' }
    )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HistoryPreferences } from '../features/history/historyUtils';

export interface HistorySavedView {
    id: string;
    name: string;
    currentPath: string;
    query: string;
    preferences: HistoryPreferences;
    createdAt: number;
}

export interface HistoryCollection {
    id: string;
    name: string;
    itemIds: string[];
    createdAt: number;
}

export interface GenerationLineage {
    imageId: string;
    prompt: string | null;
    model: string | null;
    seed: string | null;
    resolution: string | null;
}

interface HistoryWorkspaceState {
    savedViews: HistorySavedView[];
    collections: HistoryCollection[];
    activeViewId: string | null;
    saveView: (input: Omit<HistorySavedView, 'id' | 'createdAt'>) => string;
    setActiveView: (viewId: string | null) => void;
    addToCollection: (collectionName: string, itemIds: string[]) => string;
}

function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useHistoryWorkspaceStore = create<HistoryWorkspaceState>()(
    persist(
        (set) => ({
            savedViews: [],
            collections: [],
            activeViewId: null,

            saveView: (input) => {
                const id = generateId('history-view');
                set((state) => ({
                    savedViews: [
                        {
                            id,
                            name: input.name,
                            currentPath: input.currentPath,
                            query: input.query,
                            preferences: input.preferences,
                            createdAt: Date.now(),
                        },
                        ...state.savedViews,
                    ],
                    activeViewId: id,
                }));
                return id;
            },

            setActiveView: (viewId) => set({ activeViewId: viewId }),

            addToCollection: (collectionName, itemIds) => {
                const existing = collectionName.trim().toLowerCase();
                let createdId = '';
                set((state) => {
                    const collection = state.collections.find((entry) => entry.name.trim().toLowerCase() === existing);
                    if (collection) {
                        createdId = collection.id;
                        return {
                            collections: state.collections.map((entry) => (
                                entry.id === collection.id
                                    ? { ...entry, itemIds: Array.from(new Set([...entry.itemIds, ...itemIds])) }
                                    : entry
                            )),
                        };
                    }

                    const id = generateId('history-collection');
                    createdId = id;
                    return {
                        collections: [
                            {
                                id,
                                name: collectionName,
                                itemIds: itemIds.slice(),
                                createdAt: Date.now(),
                            },
                            ...state.collections,
                        ],
                    };
                });
                return createdId;
            },
        }),
        {
            name: 'swarmui-history-workspace',
        }
    )
);

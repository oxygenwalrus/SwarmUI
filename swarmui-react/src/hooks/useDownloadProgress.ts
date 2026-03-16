/**
 * useDownloadProgress Hook
 * 
 * Reactive hook for model download progress tracking.
 */

import { useCallback, useMemo } from 'react';
import { useWebSocketStore, type DownloadState } from '../stores/websocketStore';

export interface UseDownloadProgressResult {
    // State
    downloads: DownloadState[];
    activeCount: number;

    // Actions
    startDownload: (params: {
        url: string;
        type: string;
        name: string;
        metadata?: string;
    }) => void;
    cancelDownload: (downloadId: string) => void;
    clearDownload: (downloadId: string) => void;
    clearCompleted: () => void;
}

/**
 * Hook for managing model downloads with reactive progress updates.
 * 
 * @example
 * ```tsx
 * function DownloadManager() {
 *   const { downloads, startDownload, cancelDownload } = useDownloadProgress();
 *   
 *   return (
 *     <Stack>
 *       {downloads.map(d => (
 *         <DownloadCard
 *           key={d.id}
 *           name={d.name}
 *           progress={d.progress}
 *           onCancel={() => cancelDownload(d.id)}
 *         />
 *       ))}
 *     </Stack>
 *   );
 * }
 * ```
 */
export function useDownloadProgress(): UseDownloadProgressResult {
    const downloadsMap = useWebSocketStore((state) => state.downloads);
    const startDownloadAction = useWebSocketStore((state) => state.startDownload);
    const cancelDownloadAction = useWebSocketStore((state) => state.cancelDownload);
    const clearDownloadAction = useWebSocketStore((state) => state.clearDownload);

    // Convert map to array for easier consumption
    const downloads = useMemo(
        () => Array.from(downloadsMap.values()),
        [downloadsMap]
    );

    // Count active downloads
    const activeCount = useMemo(
        () => downloads.filter((d) => d.status === 'downloading').length,
        [downloads]
    );

    const startDownload = useCallback(
        (params: { url: string; type: string; name: string; metadata?: string }) => {
            startDownloadAction(params);
        },
        [startDownloadAction]
    );

    const cancelDownload = useCallback(
        (downloadId: string) => {
            cancelDownloadAction(downloadId);
        },
        [cancelDownloadAction]
    );

    const clearDownload = useCallback(
        (downloadId: string) => {
            clearDownloadAction(downloadId);
        },
        [clearDownloadAction]
    );

    const clearCompleted = useCallback(() => {
        for (const download of downloads) {
            if (download.status === 'complete' || download.status === 'error') {
                clearDownloadAction(download.id);
            }
        }
    }, [downloads, clearDownloadAction]);

    return {
        // State
        downloads,
        activeCount,

        // Actions
        startDownload,
        cancelDownload,
        clearDownload,
        clearCompleted,
    };
}

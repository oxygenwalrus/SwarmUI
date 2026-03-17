import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { swarmClient } from '../api/client';
import { extractRelativePath } from '../utils/imageUtils';
import type { ImageListItem } from '../api/types';
import { logger } from '../utils/logger';

interface UseImageActionsOptions {
    /** Callback after toggling star */
    onStarToggled?: (image: ImageListItem, newStarred: boolean) => void;
    /** Callback after deleting */
    onDeleted?: (image: ImageListItem) => void;
    /** Callback after opening folder */
    onFolderOpened?: () => void;
    /** Callback after importing image */
    onImageAdded?: (imagePath: string) => void;
}

interface UseImageActionsReturn {
    /** Toggle star status for an image */
    toggleStar: (image: ImageListItem) => Promise<void>;
    /** Delete an image */
    deleteImage: (image: ImageListItem) => Promise<void>;
    /** Open the folder containing an image in the system file explorer */
    openFolder: (imagePath: string) => Promise<void>;
    /** Import an image file into the generation history */
    addImageToHistory: (file: File, params?: Record<string, unknown>) => Promise<void>;
    /** Whether an action is in progress */
    loading: boolean;
}

/**
 * Hook for common image actions (star/delete/open folder/import).
 * Provides consistent error handling and notifications.
 */
export function useImageActions(
    options: UseImageActionsOptions = {}
): UseImageActionsReturn {
    const { onStarToggled, onDeleted, onFolderOpened, onImageAdded } = options;
    const [loading, setLoading] = useState(false);

    const toggleStar = async (image: ImageListItem) => {
        setLoading(true);
        try {
            // Extract relative path from full URL for API
            const relativePath = extractRelativePath(image.src);
            logger.debug('[useImageActions] Toggling star for:', relativePath);
            await swarmClient.toggleImageStar(relativePath);
            const newStarred = !image.starred;

            notifications.show({
                title: newStarred ? 'Starred' : 'Unstarred',
                message: 'Image updated',
                color: 'blue',
            });

            onStarToggled?.(image, newStarred);
        } catch (error) {
            console.error('Failed to toggle star:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to update image',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const deleteImage = async (image: ImageListItem) => {
        setLoading(true);
        try {
            // Extract relative path from full URL for API
            const relativePath = extractRelativePath(image.src);
            logger.debug('[useImageActions] Deleting image:', relativePath);
            await swarmClient.deleteImage(relativePath);

            notifications.show({
                title: 'Deleted',
                message: 'Image removed',
                color: 'green',
            });

            onDeleted?.(image);
        } catch (error) {
            console.error('Failed to delete image:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to delete image',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const openFolder = async (imagePath: string) => {
        setLoading(true);
        try {
            const relativePath = extractRelativePath(imagePath);
            logger.debug('[useImageActions] Opening folder for:', relativePath);
            const result = await swarmClient.openImageFolder(relativePath);
            if (result.error) {
                notifications.show({
                    title: 'Error',
                    message: result.error,
                    color: 'red',
                });
            } else {
                notifications.show({
                    title: 'Folder Opened',
                    message: 'Image folder opened in file explorer',
                    color: 'blue',
                });
            }
            onFolderOpened?.();
        } catch (error) {
            console.error('Failed to open image folder:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to open image folder',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const addImageToHistory = async (file: File, params: Record<string, unknown> = {}) => {
        setLoading(true);
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            logger.debug('[useImageActions] Adding image to history:', file.name);
            const result = await swarmClient.addImageToHistory(dataUrl, params);

            if (result.images && result.images.length > 0) {
                notifications.show({
                    title: 'Image Imported',
                    message: 'Image added to history',
                    color: 'green',
                });
                onImageAdded?.(result.images[0].image);
            }
        } catch (error) {
            console.error('Failed to add image to history:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to import image',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    return { toggleStar, deleteImage, openFolder, addImageToHistory, loading };
}

/**
 * Utility functions for image URL processing
 */

import { resolveRuntimeEndpoints } from '../config/runtimeEndpoints';

/**
 * Converts a relative image path to a full URL.
 * Handles various path formats from SwarmUI backend.
 * 
 * @param src - The image source (can be relative path or full URL)
 * @param basePath - Optional base path for relative file names
 * @param host - Optional server host override (defaults to resolved runtime asset base URL)
 * @returns Full URL to the image
 */
export function toImageUrl(
    src: string,
    basePath: string = '',
    host: string = resolveRuntimeEndpoints().assetBaseUrl
): string {
    // Already a full URL
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) {
        return src;
    }

    // Normalize slashes
    let normalizedSrc = src.replace(/\\/g, '/');

    // Remove leading slash if present
    if (normalizedSrc.startsWith('/')) {
        normalizedSrc = normalizedSrc.substring(1);
    }

    // Combine path and src if src is just a filename
    let fullPath = (basePath && !normalizedSrc.includes('/'))
        ? `${basePath}/${normalizedSrc}`
        : normalizedSrc;

    // Add 'local/' prefix if needed
    if (!fullPath.startsWith('local/')) {
        fullPath = `local/${fullPath}`;
    }

    // Add 'View/' prefix if needed
    if (!fullPath.startsWith('View/')) {
        fullPath = `View/${fullPath}`;
    }

    const normalizedPath = `/${fullPath}`.replace(/\/+/g, '/');
    if (!host) {
        return normalizedPath;
    }
    return `${host.replace(/\/+$/, '')}${normalizedPath}`;
}

/**
 * Process an array of images from the API response.
 * Converts all relative paths to full URLs.
 * 
 * @param images - Array of image objects with src property
 * @param basePath - Optional base path for relative file names
 * @returns Array with processed src URLs
 */
export function processImageUrls<T extends { src: string }>(
    images: T[],
    basePath: string = ''
): T[] {
    return images.map((img) => ({
        ...img,
        src: toImageUrl(img.src, basePath),
    }));
}

/**
 * Extracts the relative path from a full image URL.
 * This is the inverse of toImageUrl - used for API calls that need relative paths.
 * 
 * @param fullUrl - The full image URL
 * @returns Relative path suitable for API calls (e.g., "raw/2025-12-11/image.png")
 */
export function extractRelativePath(fullUrl: string): string {
    if (!fullUrl) return '';

    // Start with the URL
    let path = fullUrl;

    // Remove protocol and host
    if (path.startsWith('http://') || path.startsWith('https://')) {
        const url = new URL(path);
        path = url.pathname;
    }

    // Decode URL-encoded characters (e.g., %20 -> space)
    try {
        path = decodeURIComponent(path);
    } catch {
        // If decoding fails, continue with original path
    }

    // Remove leading slash
    if (path.startsWith('/')) {
        path = path.substring(1);
    }

    // Remove 'View/' prefix if present - API wants path without View/
    if (path.startsWith('View/')) {
        path = path.substring(5);
    }

    // Remove 'local/' prefix if present - toImageUrl adds this but API doesn't expect it
    if (path.startsWith('local/')) {
        path = path.substring(6);
    }

    return path;
}

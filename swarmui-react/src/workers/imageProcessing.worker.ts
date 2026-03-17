/**
 * Image Processing Web Worker
 * 
 * Handles heavy image operations off the main thread:
 * - Placeholder/blurhash generation
 * - Thumbnail creation
 * - Image hashing for caching
 * - Color extraction
 */

import * as Comlink from 'comlink';

// ============================================================================
// Types
// ============================================================================

interface PlaceholderOptions {
    width: number;
    height: number;
    baseColor: string;
}

interface ThumbnailOptions {
    maxWidth: number;
    maxHeight: number;
    quality: number;
}

interface ColorExtractionResult {
    dominant: string;
    palette: string[];
}

// ============================================================================
// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse hex color to RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
        return { r: 44, g: 46, b: 51 }; // Default dark gray
    }
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    };
}

/**
 * Convert RGB to hex string
 */
function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Lighten a color by a percentage
 */
function lightenColor(hex: string, percent: number): string {
    const { r, g, b } = hexToRgb(hex);
    const amt = Math.round(2.55 * percent);
    return rgbToHex(r + amt, g + amt, b + amt);
}

/**
 * Fast hash using simple algorithm (for caching purposes, not cryptographic)
 */
function fastHash(data: Uint8Array): string {
    let hash = 0;
    const len = data.length;
    // Sample every nth byte for performance on large images
    const step = Math.max(1, Math.floor(len / 10000));

    for (let i = 0; i < len; i += step) {
        hash = ((hash << 5) - hash) + data[i];
        hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16).padStart(8, '0');
}

// ============================================================================
// Worker API
// ============================================================================

const imageProcessingApi = {
    /**
     * Generate a gradient placeholder image
     */
    async generatePlaceholder(options: PlaceholderOptions): Promise<string> {
        const { width, height, baseColor } = options;

        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return '';
        }

        // Create radial gradient
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) / 2
        );

        gradient.addColorStop(0, lightenColor(baseColor, 20));
        gradient.addColorStop(1, baseColor);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Convert to data URL asynchronously
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    /**
     * Generate placeholder synchronously using ImageData
     */
    generatePlaceholderSync(options: PlaceholderOptions): ImageData {
        const { width, height, baseColor } = options;
        const { r, g, b } = hexToRgb(baseColor);
        const lightened = hexToRgb(lightenColor(baseColor, 20));

        const data = new Uint8ClampedArray(width * height * 4);
        const centerX = width / 2;
        const centerY = height / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                const t = dist / maxDist;

                // Interpolate between lightened center and base color edge
                data[idx] = Math.round(lightened.r * (1 - t) + r * t);
                data[idx + 1] = Math.round(lightened.g * (1 - t) + g * t);
                data[idx + 2] = Math.round(lightened.b * (1 - t) + b * t);
                data[idx + 3] = 255;
            }
        }

        return new ImageData(data, width, height);
    },

    /**
     * Create a thumbnail from image data
     */
    async createThumbnail(
        imageData: ArrayBuffer,
        options: ThumbnailOptions
    ): Promise<ArrayBuffer> {
        const { maxWidth, maxHeight, quality } = options;

        // Create blob from ArrayBuffer
        const blob = new Blob([imageData], { type: 'image/jpeg' });
        const bitmap = await createImageBitmap(blob);

        // Calculate dimensions maintaining aspect ratio
        let width = bitmap.width;
        let height = bitmap.height;

        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }

        // Draw to canvas
        const canvas = new OffscreenCanvas(Math.round(width), Math.round(height));
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Failed to get canvas context');
        }

        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        // Convert to blob
        const resultBlob = await canvas.convertToBlob({
            type: 'image/jpeg',
            quality,
        });

        return resultBlob.arrayBuffer();
    },

    /**
     * Calculate a hash for image data (for caching)
     */
    calculateHash(imageData: ArrayBuffer): string {
        const data = new Uint8Array(imageData);
        return fastHash(data);
    },

    /**
     * Extract dominant colors from image
     */
    async extractColors(imageData: ArrayBuffer): Promise<ColorExtractionResult> {
        const blob = new Blob([imageData], { type: 'image/jpeg' });
        const bitmap = await createImageBitmap(blob);

        // Sample at low resolution for performance
        const sampleSize = 32;
        const canvas = new OffscreenCanvas(sampleSize, sampleSize);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return { dominant: '#2c2e33', palette: [] };
        }

        ctx.drawImage(bitmap, 0, 0, sampleSize, sampleSize);
        bitmap.close();

        const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

        // Simple color frequency analysis
        const colorCounts = new Map<string, number>();

        for (let i = 0; i < data.length; i += 4) {
            // Quantize colors to reduce unique values
            const r = Math.round(data[i] / 32) * 32;
            const g = Math.round(data[i + 1] / 32) * 32;
            const b = Math.round(data[i + 2] / 32) * 32;
            const hex = rgbToHex(r, g, b);

            colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
        }

        // Sort by frequency
        const sorted = [...colorCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([color]) => color);

        return {
            dominant: sorted[0] || '#2c2e33',
            palette: sorted.slice(0, 5),
        };
    },

    /**
     * Resize image to specific dimensions
     */
    async resizeImage(
        imageData: ArrayBuffer,
        targetWidth: number,
        targetHeight: number
    ): Promise<ArrayBuffer> {
        const blob = new Blob([imageData], { type: 'image/jpeg' });
        const bitmap = await createImageBitmap(blob);

        const canvas = new OffscreenCanvas(targetWidth, targetHeight);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Failed to get canvas context');
        }

        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
        bitmap.close();

        const resultBlob = await canvas.convertToBlob({
            type: 'image/jpeg',
            quality: 0.9,
        });

        return resultBlob.arrayBuffer();
    },

    /**
     * Process multiple images in batch
     */
    async batchCreateThumbnails(
        images: { id: string; data: ArrayBuffer }[],
        options: ThumbnailOptions
    ): Promise<{ id: string; thumbnail: ArrayBuffer }[]> {
        const results: { id: string; thumbnail: ArrayBuffer }[] = [];

        for (const { id, data } of images) {
            try {
                const thumbnail = await this.createThumbnail(data, options);
                results.push({ id, thumbnail });
            } catch (error) {
                console.error(`Failed to process image ${id}:`, error);
            }
        }

        return results;
    },
};

// Expose the API via Comlink
Comlink.expose(imageProcessingApi);

// Export type for use in hooks
export type ImageProcessingWorkerAPI = typeof imageProcessingApi;

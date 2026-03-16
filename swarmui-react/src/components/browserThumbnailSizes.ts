export type ThumbnailSize = 'x-small' | 'small' | 'medium' | 'large' | 'x-large';

type ThumbnailDimensions = {
    card: number;
    list: number;
    icon: number;
};

export const DEFAULT_THUMBNAIL_SIZE: ThumbnailSize = 'medium';

export const BROWSER_THUMBNAIL_SIZES: Record<ThumbnailSize, ThumbnailDimensions> = {
    'x-small': { card: 104, list: 52, icon: 72 },
    small: { card: 136, list: 68, icon: 92 },
    medium: { card: 168, list: 84, icon: 116 },
    large: { card: 208, list: 104, icon: 144 },
    'x-large': { card: 296, list: 148, icon: 208 },
};

export const BROWSER_THUMBNAIL_SIZE_OPTIONS: { value: ThumbnailSize; label: string }[] = [
    { value: 'x-small', label: 'XS' },
    { value: 'small', label: 'S' },
    { value: 'medium', label: 'M' },
    { value: 'large', label: 'L' },
    { value: 'x-large', label: 'XL' },
];

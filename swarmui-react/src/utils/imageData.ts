import { resolveAssetUrl } from '../config/runtimeEndpoints';

export function toRuntimeImageUrl(path: string): string {
    if (!path) {
        return path;
    }
    if (path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
        try {
            const parsed = new URL(path);
            if (parsed.pathname.startsWith('/View/') || parsed.pathname.startsWith('/Output/')) {
                return `${parsed.pathname}${parsed.search}${parsed.hash}`;
            }
            return path;
        } catch {
            return path;
        }
    }

    if (path.startsWith('/View/') || path.startsWith('/Output/')) {
        return path;
    }
    if (path.startsWith('/')) {
        return resolveAssetUrl(path);
    }
    const cleanPath = path.replace(/^\/?(View\/)?/, '');
    return resolveAssetUrl(`/View/${cleanPath}`);
}

export async function imageUrlToDataUrl(imageUrl: string): Promise<string> {
    if (!imageUrl) {
        return imageUrl;
    }
    if (imageUrl.startsWith('data:')) {
        return imageUrl;
    }

    const runtimeUrl = toRuntimeImageUrl(imageUrl);
    const response = await fetch(runtimeUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

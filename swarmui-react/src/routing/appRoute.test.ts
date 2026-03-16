import { describe, expect, it } from 'vitest';
import { normalizeRoute, parseHashRoute, serializeRoute } from './appRoute';

describe('appRoute', () => {
    it('serializes and parses history route state', () => {
        const serialized = serializeRoute({
            page: 'history',
            history: {
                path: 'Starred/Portraits',
                query: 'cinematic',
                sortBy: 'Name',
                sortReverse: true,
                starredOnly: true,
                mediaType: 'image',
                currentFolderOnly: true,
                image: 'Output/example.png',
                viewId: 'history-view-1',
            },
        });

        expect(serialized).toContain('#/history?');

        const parsed = parseHashRoute(serialized);
        expect(parsed.page).toBe('history');
        expect(parsed.history?.path).toBe('Starred/Portraits');
        expect(parsed.history?.query).toBe('cinematic');
        expect(parsed.history?.sortBy).toBe('Name');
        expect(parsed.history?.sortReverse).toBe(true);
        expect(parsed.history?.starredOnly).toBe(true);
        expect(parsed.history?.mediaType).toBe('image');
        expect(parsed.history?.currentFolderOnly).toBe(true);
        expect(parsed.history?.image).toBe('Output/example.png');
        expect(parsed.history?.viewId).toBe('history-view-1');
    });

    it('normalizes partial routes with defaults', () => {
        const route = normalizeRoute({
            page: 'generate',
            generate: {
                mode: 'advanced',
            },
        });

        expect(route.generate?.mode).toBe('advanced');
        expect(route.history?.sortBy).toBe('Date');
        expect(route.queue?.view).toBe('all');
        expect(route.server?.tab).toBe('backends');
    });
});

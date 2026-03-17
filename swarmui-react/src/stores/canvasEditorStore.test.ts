import { afterEach, describe, expect, it } from 'vitest';
import { useCanvasEditorStore } from './canvasEditorStore';

afterEach(() => {
    useCanvasEditorStore.getState().reset();
});

describe('canvasEditorStore', () => {
    it('keeps the image aligned when extending the canvas from the top or left', () => {
        const store = useCanvasEditorStore.getState();
        store.openEditor('/View/source.png', 512, 512);

        useCanvasEditorStore.getState().extendCanvas('top', 128);
        useCanvasEditorStore.getState().extendCanvas('left', 64);

        const state = useCanvasEditorStore.getState();
        expect(state.canvasWidth).toBe(576);
        expect(state.canvasHeight).toBe(640);
        expect(state.imageOffsetX).toBe(64);
        expect(state.imageOffsetY).toBe(128);
    });

    it('centers and clamps the base image inside the transparent outpaint workspace', () => {
        const store = useCanvasEditorStore.getState();
        store.openEditor('/View/source.png', 400, 300);
        store.extendCanvas('right', 200);
        store.extendCanvas('bottom', 100);
        store.centerImage();
        store.setImageOffset(999, 999);

        const state = useCanvasEditorStore.getState();
        expect(state.canvasWidth).toBe(600);
        expect(state.canvasHeight).toBe(400);
        expect(state.imageOffsetX).toBe(200);
        expect(state.imageOffsetY).toBe(100);
    });
});

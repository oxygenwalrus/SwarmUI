import { describe, expect, it } from 'vitest';
import type { CanvasApplyPayload } from '../promptBuilder';
import { PROMPT_BUILDER_BLOCK_END, PROMPT_BUILDER_BLOCK_START } from '../promptBuilder';
import {
  CANVAS_SAFE_GENERATE_KEYS,
  buildCanvasApplyPatch,
  buildCanvasPrompt,
  buildCanvasRefinePatch,
  isCanvasSafeGenerateKey,
} from './compat';

function makePayload(overrides: Partial<CanvasApplyPayload> = {}): CanvasApplyPayload {
  return {
    mode: 'regional',
    sourceImageUrl: 'data:image/png;base64,source',
    sourceImageWidth: 1024,
    sourceImageHeight: 1024,
    maskDataUrl: null,
    hasMask: false,
    regions: [],
    segments: [],
    managedBlock: '',
    managedBlockHash: 'hash',
    syncState: 'synced',
    ...overrides,
  };
}

describe('canvas workflow compatibility helpers', () => {
  it('always builds an init-image apply patch and adds a mask only when present', () => {
    const initOnlyPatch = buildCanvasApplyPatch(makePayload());
    const patch = buildCanvasApplyPatch(makePayload({
      maskDataUrl: 'data:image/png;base64,mask',
      hasMask: true,
    }));
    const outpaintPatch = buildCanvasApplyPatch(makePayload({
      sourceImageWidth: 1536,
      sourceImageHeight: 1024,
      initImageDataUrl: 'data:image/png;base64,expanded',
      maskDataUrl: 'data:image/png;base64,auto-mask',
      hasMask: true,
      hasOutpaintCanvas: true,
    }));

    expect(initOnlyPatch).toEqual({
      initimage: 'data:image/png;base64,source',
      width: 1024,
      height: 1024,
    });
    expect(patch).toEqual({
      initimage: 'data:image/png;base64,source',
      width: 1024,
      height: 1024,
      maskimage: 'data:image/png;base64,mask',
    });
    expect(outpaintPatch).toEqual({
      initimage: 'data:image/png;base64,expanded',
      width: 1536,
      height: 1024,
      maskimage: 'data:image/png;base64,auto-mask',
      maskblur: 0,
    });
    expect(Object.keys(patch).every((key) => isCanvasSafeGenerateKey(key))).toBe(true);
    expect(Object.keys(outpaintPatch).every((key) => isCanvasSafeGenerateKey(key))).toBe(true);
  });

  it('updates or removes the managed block without touching user prompt text', () => {
    const prompt = `portrait of two characters\n\n${PROMPT_BUILDER_BLOCK_START}\nold block\n${PROMPT_BUILDER_BLOCK_END}`;
    const updated = buildCanvasPrompt(prompt, makePayload({
      managedBlock: `${PROMPT_BUILDER_BLOCK_START}\n<region:0.10,0.10,0.30,0.30,0.50> red shirt\n${PROMPT_BUILDER_BLOCK_END}`,
    }));
    const cleared = buildCanvasPrompt(prompt, makePayload());

    expect(updated).toContain('portrait of two characters');
    expect(updated).toContain('<region:0.10,0.10,0.30,0.30,0.50> red shirt');
    expect(cleared).toBe('portrait of two characters');
  });

  it('builds a refine patch using only existing refiner-compatible params', () => {
    const patch = buildCanvasRefinePatch({
      initimage: '/View/image.png',
      initimagecreativity: 0.2,
      refinerupscale: 4,
      refinerupscalemethod: 'pixel-lanczos',
      refinermethod: 'PostApply',
    });

    expect(patch).toEqual({
      initimage: '/View/image.png',
      initimagecreativity: 0.2,
      refinerupscale: 4,
      refinerupscalemethod: 'pixel-lanczos',
      refinermethod: 'PostApply',
      refinercontrol: 0,
      refinercontrolpercentage: 0,
      images: 1,
    });
    expect(Object.keys(patch).every((key) => CANVAS_SAFE_GENERATE_KEYS.includes(key as (typeof CANVAS_SAFE_GENERATE_KEYS)[number]))).toBe(true);
  });
});

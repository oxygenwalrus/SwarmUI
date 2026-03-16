import { describe, expect, it } from 'vitest';
import { SwarmUIClient } from './client';

describe('SwarmUIClient listBackends normalization', () => {
  it('normalizes backend object-map payloads', async () => {
    const client = new SwarmUIClient('http://example.test');
    (client as unknown as { post: () => Promise<unknown> }).post = async () => ({
      backends: {
        '1': {
          status: 'running',
          type: 'comfy',
          class: 'ComfyUIAPIAbstractBackend',
          modcount: 2,
        },
      },
    });

    const result = await client.listBackends();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
    expect(result[0].status).toBe('running');
    expect(result[0].type).toBe('comfy');
  });

  it('normalizes backend array payloads', async () => {
    const client = new SwarmUIClient('http://example.test');
    (client as unknown as { post: () => Promise<unknown> }).post = async () => ({
      backends: [
        {
          id: 'backend-a',
          status: 'idle',
          type: 'other',
          class: 'OtherBackend',
          modcount: 0,
        },
      ],
    });

    const result = await client.listBackends();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('backend-a');
    expect(result[0].status).toBe('idle');
  });

  it('accepts unwrapped backend map payloads', async () => {
    const client = new SwarmUIClient('http://example.test');
    (client as unknown as { post: () => Promise<unknown> }).post = async () => ({
      alpha: {
        status: 'loading',
        type: 'comfy',
        class: 'ComfyUIAPIAbstractBackend',
        modcount: 4,
      },
    });

    const result = await client.listBackends();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('alpha');
    expect(result[0].status).toBe('loading');
  });
});


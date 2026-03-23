import { describe, expect, it } from 'vitest';
import { resolveInitialWorkflow } from './VideoWorkflowToggle';

describe('resolveInitialWorkflow', () => {
    it('defaults to t2v when no init image is present', () => {
        expect(resolveInitialWorkflow(null)).toBe('t2v');
    });

    it('defaults to t2v for empty string', () => {
        expect(resolveInitialWorkflow('')).toBe('t2v');
    });

    it('returns i2v when an init image preview string is present', () => {
        expect(resolveInitialWorkflow('data:image/png;base64,abc')).toBe('i2v');
    });

    it('returns i2v for any non-empty string', () => {
        expect(resolveInitialWorkflow('/path/to/image.png')).toBe('i2v');
    });
});

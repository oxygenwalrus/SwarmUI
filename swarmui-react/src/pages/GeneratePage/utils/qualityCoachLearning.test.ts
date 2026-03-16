import { describe, expect, it } from 'vitest';
import { analyzeGenerateQuality } from './qualityCoach';
import { getCurrentMatrixCell } from './qualityCoachLearningData';

describe('quality coach learning engine', () => {
    it('flags the SDXL sweet spot as balanced in the matrix', () => {
        const cell = getCurrentMatrixCell(7, 28);

        expect(cell.title).toBe('Sweet spot');
        expect(cell.severity).toBe('balanced');
    });

    it('flags high CFG with low steps as a high-risk bake state', () => {
        const cell = getCurrentMatrixCell(20, 8);

        expect(cell.title).toBe('Burnt outside, raw inside');
        expect(cell.severity).toBe('high-risk');
    });

    it('marks extreme SDXL settings as high risk', () => {
        const result = analyzeGenerateQuality(
            {
                model: 'sdxl-test',
                cfgscale: 27,
                steps: 1,
                width: 1024,
                height: 1024,
            },
            {
                name: 'sdxl-test',
                class: 'sdxl',
                architecture: 'sdxl',
            }
        );

        expect(result.overallSeverity).toBe('high-risk');
        expect(result.overallLabel).toBe('High Risk');
        expect(result.issues.some((issue) => issue.id === 'cfg-high')).toBe(true);
        expect(result.issues.some((issue) => issue.id === 'steps-low')).toBe(true);
    });

    it('falls back unknown families to the illustrious profile', () => {
        const result = analyzeGenerateQuality(
            {
                model: 'mystery-checkpoint',
                cfgscale: 7,
                steps: 28,
                width: 1024,
                height: 1024,
            },
            {
                name: 'mystery-checkpoint',
            }
        );

        expect(result.familyLabel).toBe('Illustrious / SDXL Derivative');
    });
});

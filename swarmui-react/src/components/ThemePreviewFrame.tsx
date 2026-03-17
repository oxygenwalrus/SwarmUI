import { Box } from '@mantine/core';
import type { ReactNode } from 'react';
import { resolveThemeStyle, type ThemePalette } from '../store/themeStore';

interface ThemePreviewFrameProps {
    theme: ThemePalette;
    children: ReactNode;
    height?: number;
}

export function ThemePreviewFrame({ theme, children, height = 206 }: ThemePreviewFrameProps) {
    const { colors } = theme;
    const style = resolveThemeStyle(theme);
    const accent2 = colors.secondaryAccent || `color-mix(in srgb, ${colors.accent} 66%, ${colors.brand})`;
    const accent3 = colors.tertiaryAccent || `color-mix(in srgb, ${colors.success} 58%, ${colors.accent})`;
    const motifOpacity = Math.max(0, Math.min(style.motifIntensity ?? 0, 1));
    const shellBackground = style.surfaceMode === 'tonal'
        ? `linear-gradient(180deg, color-mix(in srgb, ${colors.gray7} 92%, ${colors.gray8}), color-mix(in srgb, ${colors.gray8} 95%, ${colors.gray9}))`
        : `linear-gradient(180deg, color-mix(in srgb, ${colors.gray8} 84%, ${colors.gray9}), color-mix(in srgb, ${colors.gray9} 92%, #11111b))`;
    const ambientOverlay = style.family === 'material'
        ? `linear-gradient(180deg, color-mix(in srgb, ${colors.brand} 12%, transparent), transparent 62%), ` +
        `radial-gradient(circle at 78% 12%, color-mix(in srgb, ${accent2} 16%, transparent), transparent 46%), ` +
        `radial-gradient(circle at 18% 88%, color-mix(in srgb, ${accent3} 12%, transparent), transparent 54%)`
        : `radial-gradient(circle at 18% 8%, color-mix(in srgb, ${colors.brand} 22%, transparent), transparent 55%), ` +
        `radial-gradient(circle at 84% 10%, color-mix(in srgb, ${accent2} 20%, transparent), transparent 52%), ` +
        `radial-gradient(circle at 56% 92%, color-mix(in srgb, ${accent3} 18%, transparent), transparent 62%)`;
    const motifOverlay = style.motif === 'dot-grid'
        ? `radial-gradient(circle at 1.5px 1.5px, color-mix(in srgb, ${accent2} ${3 + Math.round(motifOpacity * 10)}%, transparent) 0.82px, transparent 1.1px) 0 0 / 16px 16px, ` +
        `radial-gradient(circle at 50% 50%, color-mix(in srgb, ${colors.brand} ${2 + Math.round(motifOpacity * 7)}%, transparent) 0.45px, transparent 0.72px) 8px 8px / 16px 16px`
        : style.motif === 'glyph-field'
            ? `repeating-linear-gradient(135deg, color-mix(in srgb, ${accent2} ${4 + Math.round(motifOpacity * 9)}%, transparent) 0 1.4px, transparent 1.4px 20px), ` +
            `repeating-linear-gradient(90deg, color-mix(in srgb, ${colors.brand} ${2 + Math.round(motifOpacity * 6)}%, transparent) 0 1px, transparent 1px 28px)`
            : 'none';
    const frameRadius = style.family === 'glyph' ? 6 : style.family === 'material' ? 12 : 8;
    const frameBorder = style.family === 'glyph'
        ? `1px solid color-mix(in srgb, ${accent2} 34%, transparent)`
        : style.family === 'material'
            ? `1px solid color-mix(in srgb, ${colors.brand} 18%, ${colors.gray5})`
            : `1px solid color-mix(in srgb, ${colors.gray5} 86%, transparent)`;
    const frameShadow = style.family === 'glyph'
        ? `inset 0 0 0 1px color-mix(in srgb, ${accent2} 12%, transparent), 0 14px 30px color-mix(in srgb, ${colors.gray9} 72%, transparent)`
        : style.family === 'material'
            ? `inset 0 1px 0 color-mix(in srgb, ${colors.gray0} 6%, transparent), 0 16px 34px color-mix(in srgb, ${colors.gray9} 70%, transparent)`
            : 'var(--elevation-shadow-sm)';

    return (
        <Box
            style={{
                width: '100%',
                height,
                background: shellBackground,
                padding: 10,
                borderRadius: frameRadius,
                border: frameBorder,
                boxShadow: frameShadow,
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            <Box
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background: motifOverlay === 'none'
                        ? ambientOverlay
                        : `${ambientOverlay}, ${motifOverlay}`,
                    opacity: style.family === 'glyph' ? 0.46 : style.family === 'material' ? 0.72 : 0.9,
                }}
            />
            <Box style={{ position: 'relative', zIndex: 1, height: '100%' }}>
                {children}
            </Box>
        </Box>
    );
}

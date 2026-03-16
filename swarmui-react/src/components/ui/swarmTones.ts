export type SwarmTone = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type SwarmToneInput = SwarmTone | 'brand';
export type SwarmEmphasis = 'solid' | 'soft' | 'outline' | 'ghost';

type LegacyColor =
    | 'invokeBrand'
    | 'invokeGray'
    | 'gray'
    | 'dark'
    | 'blue'
    | 'cyan'
    | 'teal'
    | 'green'
    | 'lime'
    | 'yellow'
    | 'orange'
    | 'red'
    | 'pink'
    | 'grape'
    | 'indigo'
    | 'violet';

const LEGACY_COLOR_TO_TONE: Record<LegacyColor, SwarmTone> = {
    invokeBrand: 'primary',
    invokeGray: 'secondary',
    gray: 'secondary',
    dark: 'secondary',
    blue: 'info',
    cyan: 'info',
    teal: 'info',
    green: 'success',
    lime: 'success',
    yellow: 'warning',
    orange: 'warning',
    red: 'danger',
    pink: 'danger',
    grape: 'primary',
    indigo: 'primary',
    violet: 'primary',
};

const warnedLegacyKeys = new Set<string>();

function warnLegacyColor(component: string, color: string) {
    if (!import.meta.env.DEV) return;
    const key = `${component}:${color}`;
    if (warnedLegacyKeys.has(key)) return;
    warnedLegacyKeys.add(key);
    console.warn(`[theme] ${component} received legacy color="${color}". Prefer tone props instead.`);
}

export function resolveSwarmTone(
    tone: SwarmToneInput | undefined,
    legacyColor: string | undefined,
    fallback: SwarmTone,
    component: string
): SwarmTone {
    if (tone) {
        if (tone === 'brand') {
            warnLegacyColor(component, 'brand');
            return 'primary';
        }
        return tone;
    }
    if (!legacyColor) return fallback;

    const mapped = LEGACY_COLOR_TO_TONE[legacyColor as LegacyColor];
    if (mapped) {
        warnLegacyColor(component, legacyColor);
        return mapped;
    }

    return fallback;
}

export function mapVariantToEmphasis(variant?: string): SwarmEmphasis | undefined {
    if (!variant) return undefined;
    if (variant === 'filled') return 'solid';
    if (variant === 'light') return 'soft';
    if (variant === 'outline') return 'outline';
    if (variant === 'dot') return 'ghost';
    if (variant === 'subtle') return 'ghost';
    return undefined;
}

export function mapEmphasisToButtonVariant(emphasis: SwarmEmphasis): 'filled' | 'light' | 'outline' | 'subtle' {
    if (emphasis === 'solid') return 'filled';
    if (emphasis === 'soft') return 'light';
    if (emphasis === 'outline') return 'outline';
    return 'subtle';
}

export function mapEmphasisToBadgeVariant(emphasis: SwarmEmphasis): 'filled' | 'light' | 'outline' | 'dot' {
    if (emphasis === 'solid') return 'filled';
    if (emphasis === 'soft') return 'light';
    if (emphasis === 'outline') return 'outline';
    return 'dot';
}

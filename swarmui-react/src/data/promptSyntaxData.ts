/**
 * Prompt Syntax Data
 * 
 * Defines all SwarmUI prompt syntax features with metadata for the UI dropdown.
 * Based on backend prompttools.js and Prompt Syntax.md documentation.
 */

export type PromptSyntaxCategory =
    | 'basic'
    | 'sections'
    | 'regional'
    | 'resources'
    | 'variables'
    | 'advanced';

export interface PromptSyntaxItem {
    /** Unique identifier */
    id: string;
    /** Display label */
    label: string;
    /** Template to insert (cursor position marked with |) */
    template: string;
    /** Brief description for tooltip */
    description: string;
    /** Category for menu grouping */
    category: PromptSyntaxCategory;
    /** If true, opens a modal instead of direct insert */
    hasModal?: boolean;
    /** If true, tag is self-closing (no colon/data) */
    selfClosing?: boolean;
}

export const PROMPT_SYNTAX_CATEGORIES: Record<PromptSyntaxCategory, { label: string; color: string }> = {
    basic: { label: 'Basic', color: 'blue' },
    sections: { label: 'Sections', color: 'green' },
    regional: { label: 'Regional', color: 'orange' },
    resources: { label: 'Resources', color: 'violet' },
    variables: { label: 'Variables', color: 'cyan' },
    advanced: { label: 'Advanced', color: 'gray' },
};

export const PROMPT_SYNTAX_ITEMS: PromptSyntaxItem[] = [
    // Basic Syntax
    {
        id: 'random',
        label: 'Random',
        template: '<random:option1,option2,option3>',
        description: 'Randomly select from a list of options',
        category: 'basic',
    },
    {
        id: 'alternate',
        label: 'Alternate',
        template: '<alternate:optionA,optionB>',
        description: 'Alternate between options each step',
        category: 'basic',
    },
    {
        id: 'fromto',
        label: 'From-To',
        template: '<fromto[0.5]:before,after>',
        description: 'Switch between phrases at a timestep',
        category: 'basic',
    },
    {
        id: 'wildcard',
        label: 'Wildcard',
        template: '<wildcard:wildcardname>',
        description: 'Random line from a wildcard file',
        category: 'basic',
    },
    {
        id: 'repeat',
        label: 'Repeat',
        template: '<repeat[3]:text>',
        description: 'Repeat text multiple times',
        category: 'basic',
    },

    // Section Markers
    {
        id: 'break',
        label: 'Break',
        template: '<break>',
        description: 'Manual CLIP section break for long prompts',
        category: 'sections',
        selfClosing: true,
    },
    {
        id: 'base',
        label: 'Base',
        template: '<base>',
        description: 'Prompt for base model only (not refiner)',
        category: 'sections',
        selfClosing: true,
    },
    {
        id: 'refiner',
        label: 'Refiner',
        template: '<refiner>',
        description: 'Prompt for refiner/upscale model only',
        category: 'sections',
        selfClosing: true,
    },
    {
        id: 'video',
        label: 'Video',
        template: '<video>',
        description: 'Alternate prompt for image-to-video',
        category: 'sections',
        selfClosing: true,
    },
    {
        id: 'videoswap',
        label: 'Video Swap',
        template: '<videoswap>',
        description: 'Prompt for video swap model (e.g., Wan 2.2)',
        category: 'sections',
        selfClosing: true,
    },

    // Regional Features
    {
        id: 'segment',
        label: 'Auto Segment',
        template: '<segment:face,0.6,0.5>',
        description: 'Auto-segment and refine (like ADetailer)',
        category: 'regional',
        hasModal: true,
    },
    {
        id: 'clear',
        label: 'Clear',
        template: '<clear:background>',
        description: 'Clear matching area to transparent',
        category: 'regional',
    },
    {
        id: 'region',
        label: 'Regional Prompt',
        template: '<region:0.25,0.25,0.5,0.5,0.5>',
        description: 'Different prompt for a region of the image',
        category: 'regional',
        hasModal: true,
    },
    {
        id: 'object',
        label: 'Object',
        template: '<object:0.25,0.25,0.5,0.5,0.5,0.5>',
        description: 'Regional prompt with automatic inpainting',
        category: 'regional',
        hasModal: true,
    },
    {
        id: 'extend',
        label: 'Extend Video',
        template: '<extend:81>',
        description: 'Extend video by specified frames',
        category: 'regional',
    },

    // Resources
    {
        id: 'lora',
        label: 'LoRA',
        template: '<lora:modelname:1>',
        description: 'Apply a LoRA model with weight',
        category: 'resources',
    },
    {
        id: 'embed',
        label: 'Embedding',
        template: '<embed:embeddingname>',
        description: 'Use a textual inversion embedding',
        category: 'resources',
    },
    {
        id: 'preset',
        label: 'Preset',
        template: '<preset:presetname>',
        description: 'Apply a saved preset',
        category: 'resources',
    },
    {
        id: 'trigger',
        label: 'Trigger',
        template: '<trigger>',
        description: 'Insert model/LoRA trigger phrases',
        category: 'resources',
        selfClosing: true,
    },

    // Variables & Macros
    {
        id: 'setvar',
        label: 'Set Variable',
        template: '<setvar[varname]:value>',
        description: 'Store a value for later use',
        category: 'variables',
    },
    {
        id: 'var',
        label: 'Use Variable',
        template: '<var:varname>',
        description: 'Recall a stored variable',
        category: 'variables',
    },
    {
        id: 'setmacro',
        label: 'Set Macro',
        template: '<setmacro[macroname]:value>',
        description: 'Store a macro (re-evaluated each use)',
        category: 'variables',
    },
    {
        id: 'macro',
        label: 'Use Macro',
        template: '<macro:macroname>',
        description: 'Recall and evaluate a stored macro',
        category: 'variables',
    },

    // Advanced
    {
        id: 'param',
        label: 'Parameter',
        template: '<param[cfgscale]:7>',
        description: 'Set a generation parameter directly',
        category: 'advanced',
    },
    {
        id: 'comment',
        label: 'Comment',
        template: '<comment:note here>',
        description: 'Personal comment (ignored in generation)',
        category: 'advanced',
    },
];

/**
 * Get syntax items grouped by category
 */
export function getSyntaxByCategory(): Record<PromptSyntaxCategory, PromptSyntaxItem[]> {
    const grouped: Record<PromptSyntaxCategory, PromptSyntaxItem[]> = {
        basic: [],
        sections: [],
        regional: [],
        resources: [],
        variables: [],
        advanced: [],
    };

    for (const item of PROMPT_SYNTAX_ITEMS) {
        grouped[item.category].push(item);
    }

    return grouped;
}

/**
 * Find a syntax item by ID
 */
export function getSyntaxById(id: string): PromptSyntaxItem | undefined {
    return PROMPT_SYNTAX_ITEMS.find(item => item.id === id);
}

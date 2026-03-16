import type { GenerateParams } from '../../api/types';
import type { GenerateWorkspaceMode } from '../../stores/navigationStore';
import type { QuickModuleKey, GalleryDensity } from '../../stores/layoutStore';

export interface GenerationIssue {
    id: string;
    severity: 'warning' | 'blocking';
    message: string;
    field?: keyof GenerateParams | string;
}

export interface GenerationRecipe {
    id: string;
    name: string;
    description?: string;
    mode: GenerateWorkspaceMode;
    promptTemplate?: string;
    params: Partial<GenerateParams>;
    tags: string[];
    createdAt: number;
    updatedAt: number;
}

export interface GenerationComparison {
    leftImage: string;
    rightImage: string;
    leftLabel?: string;
    rightLabel?: string;
}

export interface WorkspaceSnapshot {
    id: string;
    capturedAt: number;
    mode: GenerateWorkspaceMode;
    params: Partial<GenerateParams>;
    openQuickModules: QuickModuleKey[];
    openInspectorSections: string[];
    galleryDensity: GalleryDensity;
    sidebarWidth: number;
    galleryWidth: number;
    sessionImages: string[];
}

export function validateGeneration(
    params: Partial<GenerateParams>,
    context: {
        selectedBackend?: string;
        enableControlNet: boolean;
        enableVideo: boolean;
        enableInitImage: boolean;
    },
): GenerationIssue[] {
    const issues: GenerationIssue[] = [];

    if (!params.model || !String(params.model).trim()) {
        issues.push({
            id: 'missing-model',
            severity: 'blocking',
            field: 'model',
            message: 'Select a base model before generating or queueing a run.',
        });
    }

    if (!params.prompt || !String(params.prompt).trim()) {
        issues.push({
            id: 'missing-prompt',
            severity: 'warning',
            field: 'prompt',
            message: 'Prompt is empty. Add a prompt for more predictable results.',
        });
    }

    if (context.enableControlNet && !params.controlnetimageinput) {
        issues.push({
            id: 'missing-controlnet-input',
            severity: 'warning',
            field: 'controlnetimageinput',
            message: 'ControlNet is enabled without a guidance image.',
        });
    }

    if (context.enableVideo && !params.videomodel && !params.text2videoframes) {
        issues.push({
            id: 'missing-video-model',
            severity: 'warning',
            field: 'videomodel',
            message: 'Video mode is enabled but no dedicated video model is selected.',
        });
    }

    if (context.enableInitImage && !params.initimage) {
        issues.push({
            id: 'missing-init-image',
            severity: 'warning',
            field: 'initimage',
            message: 'Img2Img is enabled but no init image is attached.',
        });
    }

    if (context.selectedBackend && String(context.selectedBackend).toLowerCase().includes('comfy') && params.scheduler === 'ddim_uniform') {
        issues.push({
            id: 'backend-scheduler-mismatch',
            severity: 'warning',
            field: 'scheduler',
            message: 'Current backend may not support the selected scheduler consistently.',
        });
    }

    return issues;
}

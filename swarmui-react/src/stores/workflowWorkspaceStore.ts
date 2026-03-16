import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GenerateParams } from '../api/types';

export type WorkflowWorkspaceMode = 'wizard' | 'comfy';

export interface WorkflowHandoff {
    source: 'generate' | 'history';
    templateId: string | null;
    params: Partial<GenerateParams>;
    imageSrc?: string | null;
    note?: string;
}

interface WorkflowWorkspaceState {
    lastWorkflowMode: WorkflowWorkspaceMode;
    lastWizardTemplate: string | null;
    hasSeenComfyIntro: boolean;
    handoff: WorkflowHandoff | null;
    setLastWorkflowMode: (mode: WorkflowWorkspaceMode) => void;
    setLastWizardTemplate: (templateId: string | null) => void;
    setHasSeenComfyIntro: (seen: boolean) => void;
    setHandoff: (handoff: WorkflowHandoff | null) => void;
}

export const useWorkflowWorkspaceStore = create<WorkflowWorkspaceState>()(
    persist(
        (set) => ({
            lastWorkflowMode: 'wizard',
            lastWizardTemplate: null,
            hasSeenComfyIntro: false,
            handoff: null,
            setLastWorkflowMode: (mode) => set({ lastWorkflowMode: mode }),
            setLastWizardTemplate: (templateId) => set({ lastWizardTemplate: templateId }),
            setHasSeenComfyIntro: (seen) => set({ hasSeenComfyIntro: seen }),
            setHandoff: (handoff) => set({ handoff }),
        }),
        {
            name: 'swarmui-workflow-workspace',
            partialize: (state) => ({
                lastWorkflowMode: state.lastWorkflowMode,
                lastWizardTemplate: state.lastWizardTemplate,
                hasSeenComfyIntro: state.hasSeenComfyIntro,
                handoff: state.handoff,
            }),
        }
    )
);

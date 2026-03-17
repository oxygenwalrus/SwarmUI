/**
 * Workflows Store
 * 
 * UI slice for workflow management. References workflows in the entity store.
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { Workflow } from '../api/types';
import { useEntityStore } from './entityStore';
import type { WorkflowEntity } from './entityTypes';

// Default workflow templates
const DEFAULT_WORKFLOWS: Workflow[] = [
  {
    id: 'default-txt2img',
    name: 'Text to Image',
    description: 'Basic text-to-image generation workflow',
    data: {
      nodes: [
        { id: 'prompt', type: 'PromptNode', position: { x: 100, y: 100 } },
        { id: 'sampler', type: 'SamplerNode', position: { x: 400, y: 100 } },
        { id: 'output', type: 'OutputNode', position: { x: 700, y: 100 } },
      ],
      connections: [
        { from: 'prompt', to: 'sampler' },
        { from: 'sampler', to: 'output' },
      ],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'default-img2img',
    name: 'Image to Image',
    description: 'Image-to-image transformation workflow',
    data: {
      nodes: [
        { id: 'input', type: 'ImageInputNode', position: { x: 100, y: 100 } },
        { id: 'prompt', type: 'PromptNode', position: { x: 100, y: 250 } },
        { id: 'sampler', type: 'SamplerNode', position: { x: 400, y: 175 } },
        { id: 'output', type: 'OutputNode', position: { x: 700, y: 175 } },
      ],
      connections: [
        { from: 'input', to: 'sampler' },
        { from: 'prompt', to: 'sampler' },
        { from: 'sampler', to: 'output' },
      ],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'default-upscale',
    name: 'Upscale Workflow',
    description: 'Image upscaling pipeline',
    data: {
      nodes: [
        { id: 'input', type: 'ImageInputNode', position: { x: 100, y: 100 } },
        { id: 'upscaler', type: 'UpscalerNode', position: { x: 400, y: 100 } },
        { id: 'output', type: 'OutputNode', position: { x: 700, y: 100 } },
      ],
      connections: [
        { from: 'input', to: 'upscaler' },
        { from: 'upscaler', to: 'output' },
      ],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

interface WorkflowsUIState {
  workflowIds: string[];
  initialized: boolean;
}

interface WorkflowsUIActions {
  addWorkflow: (workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateWorkflow: (id: string, updates: Partial<Omit<Workflow, 'id' | 'createdAt'>>) => void;
  deleteWorkflow: (id: string) => void;
  getWorkflow: (id: string) => Workflow | undefined;

  // Legacy getter for backward compatibility
  get workflows(): Workflow[];
}

// Convert WorkflowEntity to Workflow format
const toWorkflow = (entity: WorkflowEntity): Workflow => ({
  id: entity.id,
  name: entity.name,
  description: entity.description,
  data: entity.data,
  preview: entity.preview,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});

// Initialize default workflows in entity store
const initializeDefaultWorkflows = () => {
  const entityStore = useEntityStore.getState();
  const workflowIds: string[] = [];

  for (const workflow of DEFAULT_WORKFLOWS) {
    if (!entityStore.entities.workflows[workflow.id]) {
      const workflowEntity: WorkflowEntity = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        data: workflow.data,
        preview: workflow.preview,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      };
      entityStore.setEntity('workflows', workflowEntity);
    }
    workflowIds.push(workflow.id);
  }

  return workflowIds;
};

export const useWorkflowsStore = create<WorkflowsUIState & WorkflowsUIActions>()(
  devtools(
    persist(
      (set, get) => ({
        workflowIds: [],
        initialized: false,

        // Legacy getter for backward compatibility
        get workflows() {
          const { workflowIds, initialized } = get();

          // Initialize defaults if needed
          if (!initialized) {
            const defaultIds = initializeDefaultWorkflows();
            set({
              workflowIds: [...new Set([...defaultIds, ...workflowIds])],
              initialized: true
            });
          }

          const entityStore = useEntityStore.getState();
          const currentIds = get().workflowIds;
          return currentIds
            .map((id) => entityStore.entities.workflows[id])
            .filter(Boolean)
            .map(toWorkflow);
        },

        addWorkflow: (workflow) => {
          const id = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const now = Date.now();

          const workflowEntity: WorkflowEntity = {
            id,
            name: workflow.name,
            description: workflow.description,
            data: workflow.data,
            preview: workflow.preview,
            createdAt: now,
            updatedAt: now,
          };

          // Add to entity store
          useEntityStore.getState().setEntity('workflows', workflowEntity);

          // Update UI state
          set((state) => ({
            workflowIds: [...state.workflowIds, id],
          }));
        },

        updateWorkflow: (id, updates) => {
          useEntityStore.getState().updateEntity('workflows', id, {
            ...updates,
            updatedAt: Date.now(),
          });
        },

        deleteWorkflow: (id) => {
          // Don't allow deleting default workflows
          if (id.startsWith('default-')) {
            return;
          }

          useEntityStore.getState().removeEntity('workflows', id);
          set((state) => ({
            workflowIds: state.workflowIds.filter((wid) => wid !== id),
          }));
        },

        getWorkflow: (id) => {
          const entity = useEntityStore.getState().entities.workflows[id];
          return entity ? toWorkflow(entity) : undefined;
        },
      }),
      {
        name: 'swarmui-workflows',
        partialize: (state) => ({
          workflowIds: state.workflowIds,
          initialized: state.initialized,
        }),
      }
    ),
    { name: 'WorkflowsStore' }
  )
);

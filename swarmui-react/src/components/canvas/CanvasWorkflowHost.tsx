import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { CanvasEditor } from './CanvasEditor';
import { ImageUpscaler } from '../ImageUpscaler';
import { useCanvasWorkflowStore } from '../../stores/canvasWorkflowStore';
import { useGenerationStore } from '../../store/generationStore';
import { useNavigationStore } from '../../stores/navigationStore';
import type { GenerateParams } from '../../api/types';
import type { CanvasApplyPayload } from '../../features/promptBuilder';
import { buildCanvasApplyPatch, buildCanvasPrompt } from '../../features/canvasWorkflow/compat';
import { imageUrlToDataUrl } from '../../utils/imageData';

function hasSelectedModel(params: Partial<GenerateParams> | null): boolean {
  return typeof params?.model === 'string' && params.model.trim().length > 0;
}

export function CanvasWorkflowHost() {
  const navigateToGenerate = useNavigationStore((state) => state.navigateToGenerate);
  const generationParams = useGenerationStore((state) => state.params);
  const {
    isOpen,
    sessionId,
    currentStep,
    sourceImageWidth,
    sourceImageHeight,
    workingImageUrl,
    workingImageMetadata,
    fallbackParams,
    pendingResult,
    clearMaskVersion,
    upscalerOpen,
    closeSession,
    setStep,
    setFallbackParams,
    recordApplyPayload,
    openUpscaler,
    closeUpscaler,
    queueGenerateRequest,
    setPendingResult,
    usePendingResult,
    continueRefining,
  } = useCanvasWorkflowStore();

  const decoratePayload = useCallback((payload: CanvasApplyPayload): CanvasApplyPayload => ({
    ...payload,
    sessionId: sessionId ?? undefined,
    workflowStep: currentStep,
  }), [currentStep, sessionId]);

  const syncCanvasToGenerate = useCallback(async (payload: CanvasApplyPayload) => {
    const nextPayload = decoratePayload(payload);
    const resolvedPayload = nextPayload.initImageDataUrl
      ? nextPayload
      : {
        ...nextPayload,
        initImageDataUrl: await imageUrlToDataUrl(nextPayload.sourceImageUrl),
      };
    const generationStore = useGenerationStore.getState();
    const baseParams: GenerateParams = {
      ...generationStore.params,
      ...(fallbackParams ?? {}),
    };
    const nextPrompt = buildCanvasPrompt(baseParams.prompt || '', resolvedPayload);
    const patch = buildCanvasApplyPatch(resolvedPayload);
    const nextParams: GenerateParams = {
      ...baseParams,
      ...patch,
      prompt: nextPrompt,
    };

    generationStore.setParams(nextParams);
    if (patch.initimage) {
      generationStore.setEnableInitImage(true);
    }

    setFallbackParams(nextParams);
    recordApplyPayload(resolvedPayload);

    const updatedPrompt = nextPrompt !== (baseParams.prompt || '');
    const updatedMask = Boolean(patch.maskimage);

    if (updatedPrompt && updatedMask) {
      notifications.show({
        title: 'Canvas Synced',
        message: 'Prompt builder rules and inpaint mask were sent back to Generate.',
        color: 'green',
      });
    } else if (updatedPrompt) {
      notifications.show({
        title: 'Prompt Builder Updated',
        message: 'Your regional and segment rules were synced back to Generate.',
        color: 'blue',
      });
    } else if (updatedMask) {
      notifications.show({
        title: 'Mask Ready',
        message: 'The current image and mask are ready for inpainting on Generate.',
        color: 'green',
      });
    } else {
      notifications.show({
        title: 'Canvas Synced',
        message: 'The current canvas workspace was synced back to Generate.',
        color: 'blue',
      });
    }

    return { nextPayload: resolvedPayload, nextParams };
  }, [decoratePayload, fallbackParams, recordApplyPayload, setFallbackParams]);

  const handleApplyToGenerate = useCallback(async (payload: CanvasApplyPayload) => {
    try {
      await syncCanvasToGenerate(payload);
      closeSession();
      navigateToGenerate();
    } catch (error) {
      notifications.show({
        title: 'Canvas Sync Failed',
        message: error instanceof Error ? error.message : 'Failed to prepare the init image for Generate.',
        color: 'red',
      });
    }
  }, [closeSession, navigateToGenerate, syncCanvasToGenerate]);

  const handleGenerateFromCanvas = useCallback(async (payload: CanvasApplyPayload) => {
    try {
      const { nextPayload, nextParams } = await syncCanvasToGenerate(payload);

      if (!hasSelectedModel(nextParams)) {
        notifications.show({
          title: 'Model Required',
          message: 'Select a model on Generate before running the canvas generation step.',
          color: 'yellow',
        });
        return;
      }

      queueGenerateRequest(nextPayload);
      setStep('generate');

      notifications.show({
        title: 'Canvas Generation Queued',
        message: 'The inpaint request is being sent through the normal Generate pipeline.',
        color: 'teal',
      });
    } catch (error) {
      notifications.show({
        title: 'Canvas Generation Failed',
        message: error instanceof Error ? error.message : 'Failed to prepare the init image for Generate.',
        color: 'red',
      });
    }
  }, [queueGenerateRequest, setStep, syncCanvasToGenerate]);

  if (!isOpen || !workingImageUrl) {
    return null;
  }

  return (
    <>
      <CanvasEditor
        imageUrl={workingImageUrl}
        width={sourceImageWidth ?? undefined}
        height={sourceImageHeight ?? undefined}
        mode="workflow"
        workflowStep={currentStep}
        pendingResult={pendingResult}
        clearMaskVersion={clearMaskVersion}
        sam2BaseParams={{
          ...generationParams,
          ...(fallbackParams ?? {}),
        }}
        onClose={closeSession}
        onApply={(payload) => recordApplyPayload(decoratePayload(payload))}
        onWorkflowStepChange={setStep}
        onApplyToGenerate={handleApplyToGenerate}
        onGenerateFromCanvas={handleGenerateFromCanvas}
        onOpenUpscaler={openUpscaler}
        onUsePendingResult={() => usePendingResult('source')}
        onContinueRefining={continueRefining}
      />
      <ImageUpscaler
        opened={upscalerOpen}
        onClose={closeUpscaler}
        imagePath={workingImageUrl}
        imageMetadata={workingImageMetadata}
        fallbackParams={fallbackParams}
        onUpscaleComplete={(upscaledPath) => {
          setPendingResult({
            imageUrl: upscaledPath,
            metadata: null,
            source: 'upscale',
          });
          setStep('generate');
          closeUpscaler();
        }}
      />
    </>
  );
}

export default CanvasWorkflowHost;

import { Alert, Text } from '@mantine/core';
import type { ModelMediaCapabilities } from '../../../../utils/modelCapabilities';

export type VideoWorkflow = 't2v' | 'i2v';

/**
 * Pure function — exported for testing.
 * Returns a warning message string or null if capabilities match the workflow.
 */
export function getVideoCapabilityWarning(
    capabilities: ModelMediaCapabilities,
    workflow: VideoWorkflow,
): string | null {
    if (!capabilities.supportsVideo) {
        return 'This model does not support video generation. Select a video-capable model.';
    }
    if (workflow === 't2v' && !capabilities.supportsTextToVideo) {
        return 'This model supports image-to-video only. Switch to Image-to-Video or load a T2V-capable model.';
    }
    if (workflow === 'i2v' && !capabilities.supportsImageToVideo) {
        return 'This model supports text-to-video only. Switch to Text-to-Video or load an I2V-capable model.';
    }
    return null;
}

interface VideoModelWarningProps {
    capabilities: ModelMediaCapabilities;
    workflow: VideoWorkflow;
}

export function VideoModelWarning({ capabilities, workflow }: VideoModelWarningProps) {
    const message = getVideoCapabilityWarning(capabilities, workflow);
    if (!message) return null;

    return (
        <Alert color="yellow" variant="light">
            <Text size="sm">{message}</Text>
        </Alert>
    );
}

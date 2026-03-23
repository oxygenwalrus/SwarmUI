import { memo, useEffect, useState } from 'react';
import {
    Box,
    Divider,
    FileButton,
    Image,
    ScrollArea,
    Select,
    Stack,
    Text,
    Textarea,
} from '@mantine/core';
import { IconHistory, IconUpload, IconX } from '@tabler/icons-react';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams, LoRASelection, Model } from '../../../../api/types';
import type { ModelMediaCapabilities } from '../../../../utils/modelCapabilities';
import { SectionHero } from '../../../../components/ui';
import { SwarmActionIcon, SwarmButton } from '../../../../components/ui';
import { GenerateButton } from '../ParameterPanel/GenerateButton';
import { SliderWithInput } from '../../../../components/SliderWithInput';
import { SeedInput } from '../../../../components/SeedInput';
import { SamplingSelect } from '../../../../components/ui';
import { ActiveLoRAs } from '../ParameterPanel/ActiveLoRAs';
import { VideoModelWarning } from './VideoModelWarning';
import { VideoWorkflowToggle, resolveInitialWorkflow } from './VideoWorkflowToggle';
import { VideoParameters } from './VideoParameters';
import { VideoResolution } from './VideoResolution';
import type { VideoWorkflow } from './VideoModelWarning';
import { useT2IParams } from '../../../../hooks/useT2IParams';

export interface VideoSidebarProps {
    // Form
    form: UseFormReturnType<GenerateParams>;
    onGenerate: (values: GenerateParams) => void;

    // Models
    models: Model[];
    loadingModels: boolean;
    loadingModel: boolean;
    onModelSelect: (modelName: string | null) => void;
    modelMediaCapabilities: ModelMediaCapabilities;

    // Generation control
    generating: boolean;
    onStop: () => void;
    onOpenSchedule: () => void;

    // History
    onOpenHistory: () => void;

    // Init image (I2V)
    initImagePreview: string | null;
    onInitImageUpload: (file: File | null) => void;
    onClearInitImage: () => void;

    // LoRAs
    activeLoras: LoRASelection[];
    onLoraChange: (loras: LoRASelection[]) => void;
    onOpenLoraBrowser: () => void;
}

export const VideoSidebar = memo(function VideoSidebar({
    form,
    onGenerate,
    models,
    loadingModels,
    loadingModel,
    onModelSelect,
    modelMediaCapabilities,
    generating,
    onStop,
    onOpenSchedule,
    onOpenHistory,
    initImagePreview,
    onInitImageUpload,
    onClearInitImage,
    activeLoras,
    onLoraChange,
    onOpenLoraBrowser,
}: VideoSidebarProps) {
    const { samplerOptions, schedulerOptions } = useT2IParams();
    const [workflow, setWorkflow] = useState<VideoWorkflow>(
        () => resolveInitialWorkflow(initImagePreview),
    );

    // Re-sync toggle if init image changes externally (e.g. restored session)
    useEffect(() => {
        setWorkflow(resolveInitialWorkflow(initImagePreview));
    }, [initImagePreview]);

    function handleWorkflowChange(next: VideoWorkflow) {
        if (next === 't2v') {
            onClearInitImage();
        }
        setWorkflow(next);
    }

    const modelOptions = models.map((m) => ({
        value: m.name,
        label: m.title || m.name,
    }));

    return (
        <Box
            className="surface-table panel-gradient-subtle"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* Sticky header */}
            <Box p="sm" style={{ borderBottom: 'var(--elevation-border)', flexShrink: 0 }}>
                <SectionHero
                    title="Video Workspace"
                    rightSection={
                        <SwarmActionIcon
                            tone="secondary"
                            emphasis="ghost"
                            size="sm"
                            title="History"
                            onClick={onOpenHistory}
                        >
                            <IconHistory size={14} />
                        </SwarmActionIcon>
                    }
                />
            </Box>

            {/* Scrollable body */}
            <ScrollArea style={{ flex: 1 }} p="sm">
                <form onSubmit={form.onSubmit(onGenerate)}>
                    <Stack gap="md">
                        {/* Model selector */}
                        <Select
                            label="Model"
                            placeholder={loadingModels ? 'Loading...' : 'Select a model'}
                            data={modelOptions}
                            searchable
                            size="sm"
                            disabled={loadingModel}
                            value={form.values.model ?? null}
                            onChange={onModelSelect}
                        />

                        {/* Capability warning */}
                        <VideoModelWarning
                            capabilities={modelMediaCapabilities}
                            workflow={workflow}
                        />

                        {/* LoRA browser */}
                        <SwarmButton
                            size="xs"
                            tone="secondary"
                            emphasis="soft"
                            onClick={onOpenLoraBrowser}
                        >
                            Browse LoRAs
                        </SwarmButton>

                        <Divider />

                        {/* Prompt */}
                        <Textarea
                            label="Prompt"
                            placeholder="Describe the video..."
                            minRows={3}
                            autosize
                            size="sm"
                            {...form.getInputProps('prompt')}
                        />
                        <Textarea
                            label="Negative Prompt"
                            placeholder="What to avoid..."
                            minRows={2}
                            autosize
                            size="sm"
                            {...form.getInputProps('negativeprompt')}
                        />

                        <Divider />

                        {/* Workflow toggle */}
                        <VideoWorkflowToggle
                            workflow={workflow}
                            onChange={handleWorkflowChange}
                        />

                        {/* Init image (I2V only) */}
                        {workflow === 'i2v' && (
                            <Stack gap="xs">
                                {initImagePreview ? (
                                    <Box style={{ position: 'relative', display: 'inline-block' }}>
                                        <Image
                                            src={initImagePreview}
                                            mah={180}
                                            fit="contain"
                                            radius="sm"
                                        />
                                        <SwarmActionIcon
                                            tone="danger"
                                            emphasis="soft"
                                            size="xs"
                                            title="Clear init image"
                                            style={{ position: 'absolute', top: 4, right: 4 }}
                                            onClick={onClearInitImage}
                                        >
                                            <IconX size={10} />
                                        </SwarmActionIcon>
                                    </Box>
                                ) : (
                                    <FileButton
                                        onChange={(file) => file && onInitImageUpload(file)}
                                        accept="image/*"
                                    >
                                        {(props) => (
                                            <SwarmButton
                                                {...props}
                                                tone="secondary"
                                                emphasis="soft"
                                                leftSection={<IconUpload size={14} />}
                                            >
                                                Upload Init Image
                                            </SwarmButton>
                                        )}
                                    </FileButton>
                                )}
                            </Stack>
                        )}

                        <Divider />

                        {/* Video parameters */}
                        <VideoParameters form={form} workflow={workflow} />

                        <Divider />

                        {/* Resolution */}
                        <VideoResolution form={form} />

                        <Divider />

                        {/* Sampler */}
                        <Stack gap="sm">
                            <Text size="xs" fw={600} c="invokeGray.2" tt="uppercase">Sampler</Text>
                            <SamplingSelect
                                kind="sampler"
                                label="Sampler"
                                data={samplerOptions}
                                size="sm"
                                {...form.getInputProps('sampler')}
                            />
                            <SamplingSelect
                                kind="scheduler"
                                label="Schedule"
                                data={schedulerOptions}
                                size="sm"
                                {...form.getInputProps('scheduler')}
                            />
                            <SliderWithInput
                                label="Steps"
                                value={form.values.steps ?? 20}
                                onChange={(value) => form.setFieldValue('steps', value)}
                                min={1}
                                max={150}
                                marks={[{ value: 20, label: '20' }, { value: 50, label: '50' }]}
                            />
                            <SeedInput
                                value={form.values.seed ?? -1}
                                onChange={(value) => form.setFieldValue('seed', value)}
                            />
                        </Stack>

                        <Divider />

                        {/* LoRAs */}
                        <ActiveLoRAs
                            form={form}
                            activeLoras={activeLoras}
                            onLoraChange={onLoraChange}
                            onOpenLoraBrowser={onOpenLoraBrowser}
                        />

                        <Divider />

                        {/* Generate button */}
                        <GenerateButton
                            generating={generating}
                            onStop={onStop}
                            onOpenSchedule={onOpenSchedule}
                            currentValues={form.values}
                        />
                    </Stack>
                </form>
            </ScrollArea>
        </Box>
    );
});

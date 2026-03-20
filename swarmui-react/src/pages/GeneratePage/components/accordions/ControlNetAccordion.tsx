import { memo } from 'react';
import {
    Accordion,
    Stack,
    Switch,
    Text,
    Select,
    Button,
    FileButton,
    Group,
    Image,
    Badge,
} from '@mantine/core';
import { IconUpload, IconX } from '@tabler/icons-react';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';
import { SliderWithInput } from '../../../../components/SliderWithInput';

type ControlNetFieldKey =
    | 'controlnetimageinput'
    | 'controlnetmodel'
    | 'controlnetstrength'
    | 'controlnetstart'
    | 'controlnetend'
    | 'controlnettwoimageinput'
    | 'controlnettwomodel'
    | 'controlnettwostrength'
    | 'controlnettwostart'
    | 'controlnettwoend'
    | 'controlnetthreeimageinput'
    | 'controlnetthreemodel'
    | 'controlnetthreestrength'
    | 'controlnetthreestart'
    | 'controlnetthreeend'
    | 'controlnetpreprocessor'
    | 'controlnettwopreprocessor'
    | 'controlnetthreepreprocessor';

interface ControlNetSlotConfig {
    value: string;
    title: string;
    imageKey: ControlNetFieldKey;
    modelKey: ControlNetFieldKey;
    strengthKey: ControlNetFieldKey;
    startKey: ControlNetFieldKey;
    endKey: ControlNetFieldKey;
    preprocessorKey: ControlNetFieldKey;
}

const CONTROL_NET_SLOTS: ControlNetSlotConfig[] = [
    {
        value: 'controlnet-primary',
        title: 'ControlNet',
        imageKey: 'controlnetimageinput',
        modelKey: 'controlnetmodel',
        strengthKey: 'controlnetstrength',
        startKey: 'controlnetstart',
        endKey: 'controlnetend',
        preprocessorKey: 'controlnetpreprocessor',
    },
    {
        value: 'controlnet-secondary',
        title: 'ControlNet Two',
        imageKey: 'controlnettwoimageinput',
        modelKey: 'controlnettwomodel',
        strengthKey: 'controlnettwostrength',
        startKey: 'controlnettwostart',
        endKey: 'controlnettwoend',
        preprocessorKey: 'controlnettwopreprocessor',
    },
    {
        value: 'controlnet-tertiary',
        title: 'ControlNet Three',
        imageKey: 'controlnetthreeimageinput',
        modelKey: 'controlnetthreemodel',
        strengthKey: 'controlnetthreestrength',
        startKey: 'controlnetthreestart',
        endKey: 'controlnetthreeend',
        preprocessorKey: 'controlnetthreepreprocessor',
    },
];

export const PREPROCESSOR_OPTIONS = [
    { value: '',                        label: 'Auto (recommended)' },
    { value: 'None',                    label: 'None (raw image)' },
    { value: 'Canny',                   label: 'Canny' },
    { value: 'SDPoseDrawKeypoints',     label: 'OpenPose - Draw Keypoints' },
    { value: 'SDPoseFaceBBoxes',        label: 'OpenPose - Face Boxes' },
    { value: 'SDPoseKeypointExtractor', label: 'OpenPose - Extract Keypoints' },
    { value: 'CropByBBoxes',            label: 'Crop by Bounding Boxes' },
];

export interface ControlNetAccordionProps {
    form: UseFormReturnType<GenerateParams>;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    controlNetOptions: { value: string; label: string }[];
    loadingControlNets: boolean;
    onRefreshModels?: () => void;
}

/**
 * ControlNet accordion section.
 * Use structural input to guide generation.
 */
export const ControlNetAccordion = memo(function ControlNetAccordion({
    form,
    enabled,
    onToggle,
    controlNetOptions = [],
    loadingControlNets,
    onRefreshModels,
}: ControlNetAccordionProps) {
    const handleImageUpload = (key: ControlNetFieldKey, file: File | null) => {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                form.setFieldValue(key, e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClearImage = (key: ControlNetFieldKey) => {
        form.setFieldValue(key, '');
    };

    return (
        <Accordion.Item value="controlnet">
            <Accordion.Control>ControlNet</Accordion.Control>
            <Accordion.Panel>
                <Stack gap="md">
                    <Switch
                        label="Enable ControlNet"
                        size="xs"
                        checked={enabled}
                        onChange={(e) => onToggle(e.currentTarget.checked)}
                    />

                    <Group justify="space-between" align="center">
                        <Text size="xs" c="invokeGray.3">
                            Use up to three ControlNet layers to guide generation with structural input.
                        </Text>
                        <Button
                            size="xs"
                            variant="subtle"
                            onClick={onRefreshModels}
                            disabled={loadingControlNets}
                        >
                            {loadingControlNets ? 'Loading...' : 'Refresh Models'}
                        </Button>
                    </Group>

                    <Accordion multiple defaultValue={['controlnet-primary']}>
                        {CONTROL_NET_SLOTS.map((slot) => (
                            <Accordion.Item key={slot.value} value={slot.value}>
                                <Accordion.Control>{slot.title}</Accordion.Control>
                                <Accordion.Panel>
                                    <Stack gap="md">
                                        <div>
                                            <FileButton
                                                onChange={(file) => handleImageUpload(slot.imageKey, file)}
                                                accept="image/*"
                                            >
                                                {(props) => (
                                                    <Button
                                                        {...props}
                                                        leftSection={<IconUpload size={16} />}
                                                        variant="light"
                                                        fullWidth
                                                        size="xs"
                                                    >
                                                        Upload {slot.title} Image
                                                    </Button>
                                                )}
                                            </FileButton>

                                            {form.values[slot.imageKey] && (
                                                <Stack gap="xs" mt="sm">
                                                    <Group justify="space-between" align="flex-start">
                                                        <Badge size="sm" variant="dot">
                                                            Image Uploaded
                                                        </Badge>
                                                        <Button
                                                            size="xs"
                                                            variant="subtle"
                                                            color="red"
                                                            leftSection={<IconX size={14} />}
                                                            onClick={() => handleClearImage(slot.imageKey)}
                                                        >
                                                            Clear
                                                        </Button>
                                                    </Group>
                                                    <Image
                                                        src={form.values[slot.imageKey] as string}
                                                        alt="ControlNet input"
                                                        radius="md"
                                                        fit="contain"
                                                        height={150}
                                                    />
                                                </Stack>
                                            )}
                                        </div>

                                        <Select
                                            label={`${slot.title} Model`}
                                            placeholder={
                                                loadingControlNets
                                                    ? 'Loading ControlNets...'
                                                    : 'Select ControlNet model'
                                            }
                                            data={controlNetOptions}
                                            {...form.getInputProps(slot.modelKey)}
                                            searchable
                                            clearable
                                            description={`Model for ${slot.title.toLowerCase()} guidance`}
                                        />

                                        <Select
                                            label="Preprocessor"
                                            description="Auto selects based on model. Use None if your image is already preprocessed."
                                            data={PREPROCESSOR_OPTIONS}
                                            value={(form.values[slot.preprocessorKey] as string | undefined) ?? ''}
                                            onChange={(value) =>
                                                form.setFieldValue(
                                                    slot.preprocessorKey,
                                                    value == null || value === '' ? undefined : value
                                                )
                                            }
                                        />

                                        <SliderWithInput
                                            label={`${slot.title} Strength`}
                                            value={(form.values[slot.strengthKey] as number | undefined) || 1}
                                            onChange={(value) => form.setFieldValue(slot.strengthKey, value)}
                                            min={0}
                                            max={2}
                                            step={0.05}
                                            decimalScale={2}
                                            marks={[
                                                { value: 0, label: '0' },
                                                { value: 1, label: '1' },
                                                { value: 2, label: '2' },
                                            ]}
                                        />

                                        <Group grow>
                                            <SliderWithInput
                                                label="Start Step"
                                                value={(form.values[slot.startKey] as number | undefined) || 0}
                                                onChange={(value) => form.setFieldValue(slot.startKey, value)}
                                                min={0}
                                                max={1}
                                                step={0.05}
                                                decimalScale={2}
                                                description="When to start applying"
                                            />
                                            <SliderWithInput
                                                label="End Step"
                                                value={(form.values[slot.endKey] as number | undefined) || 1}
                                                onChange={(value) => form.setFieldValue(slot.endKey, value)}
                                                min={0}
                                                max={1}
                                                step={0.05}
                                                decimalScale={2}
                                                description="When to stop applying"
                                            />
                                        </Group>
                                    </Stack>
                                </Accordion.Panel>
                            </Accordion.Item>
                        ))}
                    </Accordion>
                </Stack>
            </Accordion.Panel>
        </Accordion.Item>
    );
});

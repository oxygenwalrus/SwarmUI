import { memo } from 'react';
import {
    Accordion,
    Stack,
    Switch,
    Button,
    Box,
    Image,
    ActionIcon,
    Select,
    FileButton,
    Group,
} from '@mantine/core';
import { IconUpload, IconX } from '@tabler/icons-react';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';
import { SliderWithInput } from '../../../../components/SliderWithInput';

export interface InitImageAccordionProps {
    form: UseFormReturnType<GenerateParams>;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    initImagePreview: string | null;
    onUpload: (file: File | null) => void;
    onClear: () => void;
}

/**
 * Init Image (Img2Img) accordion section.
 * Allows uploading an init image and adjusting creativity/noise settings.
 */
export const InitImageAccordion = memo(function InitImageAccordion({
    form,
    enabled,
    onToggle,
    initImagePreview,
    onUpload,
    onClear,
}: InitImageAccordionProps) {
    return (
        <Accordion.Item value="initimage">
            <Accordion.Control>
                Init Image (Img2Img)
            </Accordion.Control>
            <Accordion.Panel>
                <Stack gap="md">
                    <Switch
                        label="Enable Init Image"
                        size="xs"
                        checked={enabled}
                        onChange={(e) => onToggle(e.currentTarget.checked)}
                    />

                    <FileButton
                        onChange={onUpload}
                        accept="image/png,image/jpeg,image/webp"
                    >
                        {(props) => (
                            <Button
                                {...props}
                                leftSection={<IconUpload size={16} />}
                                variant="light"
                                fullWidth
                            >
                                {initImagePreview ? 'Change Init Image' : 'Upload Init Image'}
                            </Button>
                        )}
                    </FileButton>

                    {initImagePreview && (
                        <Box style={{ position: 'relative' }}>
                            <Image
                                src={initImagePreview}
                                alt="Init Image Preview"
                                radius="sm"
                                style={{ maxHeight: '200px' }}
                            />
                            <ActionIcon
                                style={{ position: 'absolute', top: 8, right: 8 }}
                                color="red"
                                variant="filled"
                                aria-label="Remove init image"
                                onClick={onClear}
                            >
                                <IconX size={16} />
                            </ActionIcon>
                        </Box>
                    )}

                    <SliderWithInput
                        label="Creativity"
                        tooltip="How much to change from the original image (Denoising Strength). 0.0 = no change, 1.0 = full replacement."
                        value={form.values.initimagecreativity ?? 0.6}
                        onChange={(value) => form.setFieldValue('initimagecreativity', value)}
                        min={0}
                        max={1}
                        step={0.05}
                        decimalScale={2}
                    />

                    <SliderWithInput
                        label="Reset To Norm"
                        tooltip="How much to reset the image to 'normal' before processing."
                        value={form.values.initimageresettonorm ?? 1}
                        onChange={(value) => form.setFieldValue('initimageresettonorm', value)}
                        min={0}
                        max={1}
                        step={0.05}
                        decimalScale={2}
                    />

                    <SliderWithInput
                        label="Init Image Noise"
                        tooltip="How much noise to add to the init image."
                        value={form.values.initimagenoise ?? 0}
                        onChange={(value) => form.setFieldValue('initimagenoise', value)}
                        min={0}
                        max={1}
                        step={0.05}
                        decimalScale={2}
                    />

                    <Select
                        label="Resize Mode"
                        description="How to resize the init image to match target dimensions"
                        data={[
                            { value: 'strech', label: 'Just Resize (Stretch)' },
                            { value: 'crop', label: 'Crop and Resize' },
                            { value: 'fill', label: 'Fill and Resize' },
                            { value: 'focus', label: 'Focus and Resize' },
                        ]}
                        value={form.values.resizemode || 'crop'}
                        onChange={(value) => form.setFieldValue('resizemode', value || 'crop')}
                    />

                    <Group grow>
                        <Select
                            label="Seamless Tileable"
                            placeholder="None"
                            data={[
                                { value: '', label: 'None' },
                                { value: 'both', label: 'Both' },
                                { value: 'horizontal', label: 'Horizontal' },
                                { value: 'vertical', label: 'Vertical' },
                            ]}
                            value={form.values.seamlesstileable || ''}
                            onChange={(value) => form.setFieldValue('seamlesstileable', value || '')}
                            clearable
                            size="xs"
                        />
                        <Switch
                            label="Invert Mask"
                            size="xs"
                            checked={form.values.invertmask || false}
                            onChange={(e) => form.setFieldValue('invertmask', e.currentTarget.checked)}
                            disabled={!form.values.maskimage}
                        />
                    </Group>

                    {form.values.maskimage && (
                        <SliderWithInput
                            label="Mask Blur"
                            value={form.values.maskblur || 0}
                            onChange={(value) => form.setFieldValue('maskblur', value)}
                            min={0}
                            max={64}
                            step={1}
                        />
                    )}
                </Stack>
            </Accordion.Panel>
        </Accordion.Item>
    );
});

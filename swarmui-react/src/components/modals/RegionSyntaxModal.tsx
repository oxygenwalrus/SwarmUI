import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    Modal,
    Stack,
    Group,
    Text,
    Textarea,
    Divider,
    Alert,
    Box,
} from '@mantine/core';
import { IconInfoCircle, IconExternalLink } from '@tabler/icons-react';
import { buildRegionTag, type BuilderRegionRule } from '../../features/promptBuilder';
import { SwarmButton, SwarmSlider, SwarmSwitch } from '../ui';

interface RegionSyntaxModalProps {
    /** Whether the modal is open */
    opened: boolean;
    /** Callback to close the modal */
    onClose: () => void;
    /** Callback with the generated syntax string */
    onSubmit: (syntax: string) => void;
}

/**
 * Modal for configuring <region:> and <object:> syntax with visual preview.
 */
export const RegionSyntaxModal = React.memo(function RegionSyntaxModal({
    opened,
    onClose,
    onSubmit,
}: RegionSyntaxModalProps) {
    // Form state
    const [x, setX] = useState(0.25);
    const [y, setY] = useState(0.25);
    const [width, setWidth] = useState(0.5);
    const [height, setHeight] = useState(0.5);
    const [strength, setStrength] = useState(0.5);
    const [doInpaint, setDoInpaint] = useState(false);
    const [inpaintStrength, setInpaintStrength] = useState(0.5);
    const [genPrompt, setGenPrompt] = useState('');

    // Canvas preview
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragHandle, setDragHandle] = useState<string | null>(null);

    const resetForm = useCallback(() => {
        setX(0.25);
        setY(0.25);
        setWidth(0.5);
        setHeight(0.5);
        setStrength(0.5);
        setDoInpaint(false);
        setInpaintStrength(0.5);
        setGenPrompt('');
    }, []);

    const handleClose = useCallback(() => {
        resetForm();
        onClose();
    }, [onClose, resetForm]);

    // Draw canvas preview
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const cw = canvas.width;
        const ch = canvas.height;

        // Clear
        ctx.fillStyle = '#2b2b2b';
        ctx.fillRect(0, 0, cw, ch);

        // Draw border
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, cw - 2, ch - 2);

        // Draw region
        const rx = x * cw;
        const ry = y * ch;
        const rw = width * cw;
        const rh = height * ch;

        // Fill region
        ctx.fillStyle = 'rgba(200, 100, 100, 0.4)';
        ctx.fillRect(rx, ry, rw, rh);

        // Stroke region
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, ry, rw, rh);

        // Draw corner handles
        const handles = [
            { x: rx, y: ry },
            { x: rx + rw, y: ry },
            { x: rx, y: ry + rh },
            { x: rx + rw, y: ry + rh },
            { x: rx + rw / 2, y: ry + rh / 2 }, // center
        ];

        handles.forEach((h, i) => {
            ctx.beginPath();
            ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = i === 4 ? '#3498db' : '#2ecc71';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    }, [x, y, width, height]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / rect.width;
        const my = (e.clientY - rect.top) / rect.height;

        // Check if near a handle
        const handles = [
            { id: 'tl', x, y },
            { id: 'tr', x: x + width, y },
            { id: 'bl', x, y: y + height },
            { id: 'br', x: x + width, y: y + height },
            { id: 'center', x: x + width / 2, y: y + height / 2 },
        ];

        for (const h of handles) {
            const dist = Math.sqrt((mx - h.x) ** 2 + (my - h.y) ** 2);
            if (dist < 0.05) {
                setIsDragging(true);
                setDragHandle(h.id);
                return;
            }
        }
    }, [x, y, width, height]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging || !dragHandle) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        let mx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        let my = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

        // Round to 2 decimal places
        mx = Math.round(mx * 100) / 100;
        my = Math.round(my * 100) / 100;

        if (dragHandle === 'center') {
            const newX = Math.max(0, Math.min(1 - width, mx - width / 2));
            const newY = Math.max(0, Math.min(1 - height, my - height / 2));
            setX(newX);
            setY(newY);
        } else if (dragHandle === 'tl') {
            const newWidth = Math.max(0.05, x + width - mx);
            const newHeight = Math.max(0.05, y + height - my);
            setX(mx);
            setY(my);
            setWidth(newWidth);
            setHeight(newHeight);
        } else if (dragHandle === 'tr') {
            const newWidth = Math.max(0.05, mx - x);
            const newHeight = Math.max(0.05, y + height - my);
            setY(my);
            setWidth(newWidth);
            setHeight(newHeight);
        } else if (dragHandle === 'bl') {
            const newWidth = Math.max(0.05, x + width - mx);
            const newHeight = Math.max(0.05, my - y);
            setX(mx);
            setWidth(newWidth);
            setHeight(newHeight);
        } else if (dragHandle === 'br') {
            setWidth(Math.max(0.05, mx - x));
            setHeight(Math.max(0.05, my - y));
        }
    }, [isDragging, dragHandle, x, y, width, height]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setDragHandle(null);
    }, []);

    const handleSubmit = useCallback(() => {
        const rule: BuilderRegionRule = {
            id: 'modal',
            shape: 'rectangle',
            x,
            y,
            width,
            height,
            strength,
            useInpaint: doInpaint,
            inpaintStrength,
            prompt: genPrompt,
            enabled: true,
        };
        const syntax = buildRegionTag(rule);

        onSubmit(syntax);
        handleClose();
    }, [doInpaint, x, y, width, height, strength, inpaintStrength, genPrompt, onSubmit, handleClose]);

    return (
            <Modal
            opened={opened}
            onClose={handleClose}
            title={doInpaint ? "Object (Region + Inpaint)" : "Regional Prompt"}
            size="lg"
        >
            <Stack gap="md">
                <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                    <Text size="sm">
                        Apply a different prompt to a specific region of your image.
                        Drag the corners or center handle to adjust the region.
                    </Text>
                    <Text
                        size="xs"
                        c="blue"
                        component="a"
                        href="https://github.com/mcmonkeyprojects/SwarmUI/blob/master/docs/Features/Prompt%20Syntax.md#regional-prompting"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}
                    >
                        Learn more <IconExternalLink size={12} />
                    </Text>
                </Alert>

                {/* Canvas Preview */}
                <Box style={{ display: 'flex', justifyContent: 'center' }}>
                    <canvas
                        ref={canvasRef}
                        width={256}
                        height={256}
                        style={{
                            cursor: isDragging ? 'grabbing' : 'grab',
                            border: '1px solid var(--theme-gray-4)',
                            borderRadius: 4,
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    />
                </Box>

                {/* Sliders for precise control */}
                <Group grow>
                    <div>
                        <Text size="sm" fw={500}>X: {x.toFixed(2)}</Text>
                        <SwarmSlider value={x} onChange={setX} min={0} max={1} step={0.01} />
                    </div>
                    <div>
                        <Text size="sm" fw={500}>Y: {y.toFixed(2)}</Text>
                        <SwarmSlider value={y} onChange={setY} min={0} max={1} step={0.01} />
                    </div>
                </Group>

                <Group grow>
                    <div>
                        <Text size="sm" fw={500}>Width: {width.toFixed(2)}</Text>
                        <SwarmSlider value={width} onChange={setWidth} min={0.05} max={1} step={0.01} />
                    </div>
                    <div>
                        <Text size="sm" fw={500}>Height: {height.toFixed(2)}</Text>
                        <SwarmSlider value={height} onChange={setHeight} min={0.05} max={1} step={0.01} />
                    </div>
                </Group>

                <div>
                    <Text size="sm" fw={500} mb={4}>Region Strength: {strength.toFixed(2)}</Text>
                    <Text size="xs" c="dimmed" mb={8}>
                        How strongly to apply the regional prompt vs global prompt
                    </Text>
                    <SwarmSlider
                        value={strength}
                        onChange={setStrength}
                        min={0}
                        max={1}
                        step={0.05}
                        marks={[
                            { value: 0, label: '0' },
                            { value: 0.5, label: '0.5' },
                            { value: 1, label: '1' },
                        ]}
                    />
                </div>

                <Divider />

                <SwarmSwitch
                    label="Also Inpaint Region"
                    description="After generation, automatically inpaint the region (uses <object:> tag)"
                    checked={doInpaint}
                    onChange={(e) => setDoInpaint(e.currentTarget.checked)}
                />

                {doInpaint && (
                    <div>
                        <Text size="sm" fw={500} mb={4}>Inpaint Strength: {inpaintStrength.toFixed(2)}</Text>
                        <SwarmSlider
                            value={inpaintStrength}
                            onChange={setInpaintStrength}
                            min={0}
                            max={1}
                            step={0.05}
                        />
                    </div>
                )}

                <Divider />

                <Textarea
                    label="Region Generation Prompt"
                    description="The prompt to use for this region"
                    placeholder="a photo of a cat..."
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.currentTarget.value)}
                    minRows={2}
                    maxRows={4}
                    autosize
                />

                <Group justify="flex-end" mt="md">
                    <SwarmButton emphasis="ghost" tone="secondary" onClick={handleClose}>Cancel</SwarmButton>
                    <SwarmButton emphasis="solid" onClick={handleSubmit}>Add to Prompt</SwarmButton>
                </Group>
            </Stack>
        </Modal>
    );
});

RegionSyntaxModal.displayName = 'RegionSyntaxModal';

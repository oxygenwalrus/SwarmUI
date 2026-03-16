/**
 * HeadlessDialog Component
 *
 * A wrapper around Radix UI Dialog that provides built-in:
 * - Focus trapping
 * - ESC key handling
 * - Click-outside handling
 * - ARIA attributes
 *
 * Uses existing Mantine CSS classes for styling.
 */

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconX } from '@tabler/icons-react';
import { ActionIcon, Text } from '@mantine/core';
import './headless-dialog.css';

export interface HeadlessDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Called when the dialog should close */
    onOpenChange: (open: boolean) => void;
    /** Dialog title */
    title: string;
    /** Optional description for accessibility */
    description?: string;
    /** Dialog size - maps to max-width */
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    /** Whether to center the dialog */
    centered?: boolean;
    /** Z-index for stacking */
    zIndex?: number;
    /** Children content */
    children: React.ReactNode;
    /** Whether to show close button */
    withCloseButton?: boolean;
}

const SIZE_MAP = {
    sm: '400px',
    md: '500px',
    lg: '700px',
    xl: '900px',
    full: '100%',
};

export function HeadlessDialog({
    open,
    onOpenChange,
    title,
    description,
    size = 'md',
    centered = true,
    zIndex = 1200,
    children,
    withCloseButton = true,
}: HeadlessDialogProps) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay
                    className="headless-dialog-overlay"
                    style={{ zIndex }}
                />
                <Dialog.Content
                    className={`headless-dialog-content ${centered ? 'centered' : ''}`}
                    style={{
                        zIndex: zIndex + 1,
                        maxWidth: SIZE_MAP[size],
                    }}
                    aria-describedby={description ? 'dialog-description' : undefined}
                >
                    {/* Header */}
                    <div className="headless-dialog-header">
                        <Dialog.Title asChild>
                            <Text fw={600} size="lg">
                                {title}
                            </Text>
                        </Dialog.Title>
                        {withCloseButton && (
                            <Dialog.Close asChild>
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="sm"
                                    aria-label="Close"
                                >
                                    <IconX size={16} />
                                </ActionIcon>
                            </Dialog.Close>
                        )}
                    </div>

                    {/* Description (visually hidden but accessible) */}
                    {description && (
                        <Dialog.Description id="dialog-description" className="sr-only">
                            {description}
                        </Dialog.Description>
                    )}

                    {/* Body */}
                    <div className="headless-dialog-body">{children}</div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

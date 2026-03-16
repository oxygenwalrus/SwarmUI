import { Accordion, Group, Stack, Text, Switch } from '@mantine/core';
import { memo } from 'react';

export interface ElevatedAccordionItem {
    /** Unique value for the accordion item */
    value: string;
    /** Display label for the accordion header */
    label: string;
    /** Optional icon before the label */
    icon?: React.ReactNode;
    /** Content inside the accordion panel */
    children: React.ReactNode;
    /** Optional right section (e.g., toggle switch) */
    rightSection?: React.ReactNode;
    /** Optional: controlled toggle state */
    enabled?: boolean;
    /** Optional: callback when toggle changes */
    onToggle?: (enabled: boolean) => void;
}

export interface ElevatedAccordionProps {
    /** Array of accordion items */
    items: ElevatedAccordionItem[];
    /** Default values to have open */
    defaultValue?: string[];
    /** Allow multiple items open at once */
    multiple?: boolean;
}

/**
 * An elevation-aware accordion component styled as nested cards.
 * Each accordion item appears as a distinct "paper" level card
 * with smooth animations and optional toggle controls.
 *
 * Uses the global CSS styles defined in index.css for
 * .mantine-Accordion-* classes with elevation system.
 */
export const ElevatedAccordion = memo(function ElevatedAccordion({
    items,
    defaultValue,
    multiple = true,
}: ElevatedAccordionProps) {
    return (
        <Accordion
            variant="filled"
            multiple={multiple}
            defaultValue={defaultValue}
            transitionDuration={200}
        >
            {items.map((item) => (
                <Accordion.Item key={item.value} value={item.value}>
                    {item.rightSection || item.onToggle ? (
                        <Group
                            justify="space-between"
                            wrap="nowrap"
                            gap="xs"
                            style={{ width: '100%' }}
                        >
                            <Accordion.Control icon={item.icon} style={{ flex: 1 }}>
                                {item.label}
                            </Accordion.Control>
                            {item.onToggle ? (
                                <Switch
                                    size="xs"
                                    checked={item.enabled}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        item.onToggle?.(e.currentTarget.checked);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ marginRight: 12 }}
                                />
                            ) : (
                                <div style={{ marginRight: 12 }}>{item.rightSection}</div>
                            )}
                        </Group>
                    ) : (
                        <Accordion.Control icon={item.icon}>{item.label}</Accordion.Control>
                    )}
                    <Accordion.Panel>
                        <Stack gap="md">{item.children}</Stack>
                    </Accordion.Panel>
                </Accordion.Item>
            ))}
        </Accordion>
    );
});

/**
 * A simple elevated section header for use outside accordions.
 * Creates a visually distinct section title with consistent styling.
 */
export const ElevatedSectionHeader = memo(function ElevatedSectionHeader({
    children,
    rightSection,
}: {
    children: React.ReactNode;
    rightSection?: React.ReactNode;
}) {
    return (
        <Group
            justify="space-between"
            style={{
                background:
                    'linear-gradient(155deg, color-mix(in srgb, var(--theme-brand-soft) 40%, transparent), transparent 62%), var(--elevation-paper)',
                border: 'var(--theme-border-width) var(--theme-border-style) var(--theme-border-subtle)',
                borderRadius: 'calc(10px * var(--theme-radius-multiplier))',
                padding: '10px 12px',
                marginBottom: '8px',
                boxShadow: 'var(--elevation-shadow-sm)',
            }}
        >
            <Text
                size="xs"
                fw={600}
                tt="uppercase"
                style={{ letterSpacing: '0.5px', color: 'var(--theme-gray-0)' }}
            >
                {children}
            </Text>
            {rightSection}
        </Group>
    );
});

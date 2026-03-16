import { memo } from 'react';
import {
    Group,
    Text,
    Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconRefresh } from '@tabler/icons-react';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';
import { SwarmActionIcon } from '../../../../components/ui';

export interface ParameterHeaderProps {
    /** Form instance for resetting */
    form: UseFormReturnType<GenerateParams>;
    /** Reset store to defaults */
    resetStore: () => void;
}

/**
 * Header section of the Parameter Panel.
 * Contains title and action buttons.
 */
export const ParameterHeader = memo(function ParameterHeader({
    form,
    resetStore,
}: ParameterHeaderProps) {
    const handleReset = () => {
        resetStore();
        form.reset();
        notifications.show({
            title: 'Settings Reset',
            message: 'All parameters restored to defaults',
            color: 'blue',
        });
    };

    return (
        <Group justify="space-between">
            <Text
                size="md"
                fw={600}
                tt="uppercase"
                className="text-gradient"
                style={{ letterSpacing: '0.5px' }}
            >
                Parameters
            </Text>
            <Group gap="xs">
                <Tooltip label="Reset all parameters to factory defaults" withArrow>
                    <SwarmActionIcon
                        size="sm"
                        tone="warning"
                        emphasis="ghost"
                        label="Reset all parameters to factory defaults"
                        onClick={handleReset}
                    >
                        <IconRefresh size={16} />
                    </SwarmActionIcon>
                </Tooltip>
            </Group>
        </Group>
    );
});

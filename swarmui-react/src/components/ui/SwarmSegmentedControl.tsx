import { SegmentedControl, type SegmentedControlProps } from '@mantine/core';
import { forwardRef } from 'react';

export interface SwarmSegmentedControlProps extends SegmentedControlProps {
    compact?: boolean;
}

export const SwarmSegmentedControl = forwardRef<HTMLDivElement, SwarmSegmentedControlProps>(
    function SwarmSegmentedControl(
        {
            className,
            size,
            compact = true,
            transitionDuration,
            ...props
        },
        ref
    ) {
        return (
            <SegmentedControl
                ref={ref}
                {...props}
                size={size ?? 'xs'}
                transitionDuration={transitionDuration ?? 120}
                className={`swarm-segmented-control ${compact ? 'swarm-segmented-control--compact' : ''} ${className ?? ''}`.trim()}
            />
        );
    }
);

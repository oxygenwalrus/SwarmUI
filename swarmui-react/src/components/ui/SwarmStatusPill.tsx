import { forwardRef } from 'react';
import { SwarmBadge, type SwarmBadgeProps } from './SwarmBadge';

export interface SwarmStatusPillProps extends SwarmBadgeProps {
    pulse?: boolean;
}

export const SwarmStatusPill = forwardRef<HTMLDivElement, SwarmStatusPillProps>(function SwarmStatusPill(
    {
        pulse = false,
        className,
        ...props
    },
    ref
) {
    return (
        <SwarmBadge
            ref={ref}
            {...props}
            radius="xl"
            className={`swarm-status-pill ${pulse ? 'swarm-status-pill--pulse' : ''} ${className ?? ''}`.trim()}
        />
    );
});

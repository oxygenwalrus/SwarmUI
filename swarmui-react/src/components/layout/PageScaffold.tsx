import { Box } from '@mantine/core';
import type { ReactNode } from 'react';

interface PageScaffoldProps {
    header?: ReactNode;
    children: ReactNode;
    className?: string;
    headerClassName?: string;
    contentClassName?: string;
    density?: 'compact' | 'comfortable';
}

export function PageScaffold({
    header,
    children,
    className,
    headerClassName,
    contentClassName,
    density = 'comfortable',
}: PageScaffoldProps) {
    return (
        <Box className={`swarm-page-scaffold swarm-page-scaffold--${density} ${className ?? ''}`.trim()}>
            {header ? (
                <Box className={`swarm-page-scaffold__header swarm-page-scaffold__header--${density} ${headerClassName ?? ''}`.trim()}>
                    {header}
                </Box>
            ) : null}
            <Box className={`swarm-page-scaffold__content swarm-page-scaffold__content--${density} ${contentClassName ?? ''}`.trim()}>
                {children}
            </Box>
        </Box>
    );
}

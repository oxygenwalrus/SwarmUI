import { Box } from '@mantine/core';

interface ResizeHandleProps {
    /** Resize direction */
    direction: 'horizontal' | 'vertical';
    /** Pointer down handler from useResizablePanel */
    onPointerDown: (e: React.PointerEvent) => void;
    /** Keyboard nudging function from useResizablePanel */
    onNudge: (delta: number) => void;
    /** Whether currently resizing */
    isResizing: boolean;
}

/**
 * A draggable resize handle for resizable panels.
 * Used between collapsible panels to allow user resizing.
 */
export function ResizeHandle({ direction, onPointerDown, onNudge, isResizing }: ResizeHandleProps) {
    const isHorizontal = direction === 'horizontal';

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const step = e.shiftKey ? 24 : 8;

        if (isHorizontal && e.key === 'ArrowLeft') {
            e.preventDefault();
            onNudge(-step);
            return;
        }
        if (isHorizontal && e.key === 'ArrowRight') {
            e.preventDefault();
            onNudge(step);
            return;
        }
        if (!isHorizontal && e.key === 'ArrowUp') {
            e.preventDefault();
            onNudge(-step);
            return;
        }
        if (!isHorizontal && e.key === 'ArrowDown') {
            e.preventDefault();
            onNudge(step);
        }
    };

    return (
        <Box
            role="separator"
            tabIndex={0}
            aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
            aria-label={isHorizontal ? 'Resize horizontal panels' : 'Resize vertical panels'}
            className={`swarm-resize-handle ${isHorizontal ? 'swarm-resize-handle--horizontal' : 'swarm-resize-handle--vertical'} ${isResizing ? 'swarm-resize-handle--active' : ''}`.trim()}
            onPointerDown={onPointerDown}
            onKeyDown={handleKeyDown}
        >
            <span className="swarm-resize-handle__visual" />
        </Box>
    );
}

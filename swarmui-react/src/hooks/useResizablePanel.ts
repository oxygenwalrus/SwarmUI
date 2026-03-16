import { useState, useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface UseResizablePanelOptions {
    initialSize: number;
    minSize: number;
    maxSize: number;
    direction: 'horizontal' | 'vertical';
    onResize?: (size: number) => void;
}

interface UseResizablePanelReturn {
    size: number;
    isResizing: boolean;
    handlePointerDown: (e: ReactPointerEvent) => void;
    nudgeSize: (delta: number) => void;
    setSize: (size: number) => void;
}

export function useResizablePanel({
    initialSize,
    minSize,
    maxSize,
    direction,
    onResize,
}: UseResizablePanelOptions): UseResizablePanelReturn {
    const [size, setSize] = useState(initialSize);
    const [isResizing, setIsResizing] = useState(false);
    const startPosRef = useRef(0);
    const startSizeRef = useRef(0);
    const activePointerIdRef = useRef<number | null>(null);

    const clampSize = useCallback((nextSize: number) => (
        Math.max(minSize, Math.min(maxSize, nextSize))
    ), [minSize, maxSize]);

    const commitSize = useCallback((nextSize: number) => {
        const clamped = clampSize(nextSize);
        setSize(clamped);
        onResize?.(clamped);
    }, [clampSize, onResize]);

    const handlePointerDown = useCallback(
        (e: ReactPointerEvent) => {
            e.preventDefault();
            e.stopPropagation();

            activePointerIdRef.current = e.pointerId;
            if (e.currentTarget.setPointerCapture) {
                e.currentTarget.setPointerCapture(e.pointerId);
            }

            setIsResizing(true);
            startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
            startSizeRef.current = size;
        },
        [direction, size]
    );

    useEffect(() => {
        if (!isResizing) return;

        const handlePointerMove = (e: PointerEvent) => {
            if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
                return;
            }
            const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
            const diff = currentPos - startPosRef.current;
            commitSize(startSizeRef.current + diff);
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
                return;
            }
            activePointerIdRef.current = null;
            setIsResizing(false);
        };

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerUp);

        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [isResizing, direction, commitSize]);

    const nudgeSize = useCallback((delta: number) => {
        commitSize(size + delta);
    }, [commitSize, size]);

    return {
        size,
        isResizing,
        handlePointerDown,
        nudgeSize,
        setSize,
    };
}

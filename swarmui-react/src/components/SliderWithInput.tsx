import { memo, useState, useEffect, useCallback } from 'react';
import { Group, Slider, NumberInput, Text, Stack, Box, Tooltip } from '@mantine/core';

interface SliderWithInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  marks?: { value: number; label?: string }[];
  decimalScale?: number;
  description?: string;
  tooltip?: string;
}

// Memoized component to prevent unnecessary re-renders
export const SliderWithInput = memo(function SliderWithInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  marks,
  decimalScale = 0,
  description,
  tooltip,
}: SliderWithInputProps) {
  // Local state for smooth slider dragging
  const [localValue, setLocalValue] = useState(value);

  // Sync local value when prop changes (from parent)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Determine if marks have labels (affects spacing needed)
  const hasMarkLabels = marks?.some(m => m.label);

  // Handle slider drag - update local state immediately for smooth feedback
  const handleSliderChange = useCallback((val: number) => {
    setLocalValue(val);
    onChange(val);
  }, [onChange]);

  // Handle slider drag end - update parent with final value
  const handleSliderChangeEnd = useCallback((val: number) => {
    onChange(val);
  }, [onChange]);

  // Handle number input change - update both local and parent
  const handleNumberChange = useCallback((val: string | number) => {
    if (typeof val === 'number') {
      setLocalValue(val);
      onChange(val);
    }
  }, [onChange]);

  const labelElement = (
    <Text
      size="sm"
      fw={500}
      style={{ whiteSpace: 'nowrap', cursor: tooltip ? 'help' : undefined, color: 'var(--theme-gray-0)' }}
    >
      {label}
    </Text>
  );

  return (
    <Stack gap="sm">
      <Group justify="space-between" gap="xs" wrap="nowrap">
        {tooltip ? (
          <Tooltip label={tooltip} multiline w={250} withArrow>
            {labelElement}
          </Tooltip>
        ) : (
          labelElement
        )}
        <NumberInput
          value={localValue}
          onChange={handleNumberChange}
          min={min}
          max={max}
          step={step}
          decimalScale={decimalScale}
          variant="unstyled"
          hideControls
          size="xs"
          styles={{
            input: {
              width: 65,
              textAlign: 'right',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--mantine-color-invokeBrand-6)',
              backgroundColor: 'var(--mantine-color-invokeGray-7)',
              borderRadius: 4,
            },
          }}
        />
      </Group>
      <Box style={{ paddingBottom: hasMarkLabels ? 20 : 0 }}>
        <Slider
          value={localValue}
          onChange={handleSliderChange}
          onChangeEnd={handleSliderChangeEnd}
          min={min}
          max={max}
          step={step}
          marks={marks}
          styles={{
            root: {
              marginTop: 4,
            },
            markLabel: {
              fontSize: '10px',
              color: 'var(--mantine-color-invokeGray-3)',
              marginTop: 6,
            },
            mark: {
              borderColor: 'var(--mantine-color-invokeGray-4)',
            },
          }}
        />
      </Box>
      {description && (
        <Text size="xs" c="invokeGray.4" style={{ lineHeight: 1.4 }}>
          {description}
        </Text>
      )}
    </Stack>
  );
});

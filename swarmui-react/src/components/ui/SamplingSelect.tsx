import { memo, useMemo } from 'react';
import { Box, Select, Stack, Text, Tooltip, type SelectProps } from '@mantine/core';
import type { SamplerOption, SchedulerOption } from '../../data/samplerData';

type SamplingKind = 'sampler' | 'scheduler';
type SamplingOption = SamplerOption | SchedulerOption;

export interface SamplingSelectProps extends Omit<SelectProps, 'data' | 'renderOption'> {
    kind: SamplingKind;
    data: SamplingOption[];
    withSelectedDescription?: boolean;
    tooltipWidth?: number;
}

function SamplingTooltipContent({ option }: { option: SamplingOption }) {
    return (
        <Stack gap={6}>
            <Stack gap={2}>
                <Text size="sm" fw={700}>{option.label}</Text>
                <Text size="xs" c="dimmed">{option.description}</Text>
            </Stack>
            <Text size="xs">
                <Text span fw={700}>What it is:</Text> {option.whatItIs}
            </Text>
            <Text size="xs">
                <Text span fw={700}>Good at:</Text> {option.goodAt}
            </Text>
            <Text size="xs">
                <Text span fw={700}>Works best with:</Text> {option.bestWith}
            </Text>
            <Text size="xs">
                <Text span fw={700}>Recommended styles:</Text> {option.recommendedStyles}
            </Text>
            {option.notes ? (
                <Text size="xs">
                    <Text span fw={700}>Notes:</Text> {option.notes}
                </Text>
            ) : null}
        </Stack>
    );
}

export const SamplingSelect = memo(function SamplingSelect({
    kind,
    data,
    value,
    description,
    withSelectedDescription = true,
    tooltipWidth = 360,
    nothingFoundMessage,
    ...props
}: SamplingSelectProps) {
    const optionMap = useMemo(
        () => new Map(data.map((option) => [option.value, option])),
        [data],
    );

    const selectedOption = typeof value === 'string' ? optionMap.get(value) : undefined;

    return (
        <Select
            {...props}
            value={value}
            data={data.map((option) => ({
                value: option.value,
                label: option.label,
            }))}
            description={description ?? (withSelectedDescription ? selectedOption?.description : undefined)}
            nothingFoundMessage={nothingFoundMessage ?? `No ${kind} options found`}
            renderOption={({ option }) => {
                const detailedOption = optionMap.get(option.value);
                return (
                    <Tooltip
                        label={detailedOption ? <SamplingTooltipContent option={detailedOption} /> : option.label}
                        position="right-start"
                        withArrow
                        multiline
                        w={tooltipWidth}
                        openDelay={120}
                    >
                        <Box style={{ width: '100%' }}>
                            <Stack gap={2}>
                                <Text size="sm" fw={600}>{option.label}</Text>
                                {detailedOption?.description ? (
                                    <Text size="xs" c="dimmed" lineClamp={2}>
                                        {detailedOption.description}
                                    </Text>
                                ) : null}
                            </Stack>
                        </Box>
                    </Tooltip>
                );
            }}
        />
    );
});

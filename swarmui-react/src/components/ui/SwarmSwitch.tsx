import { Switch, type SwitchProps } from '@mantine/core';

export interface SwarmSwitchProps extends SwitchProps {}

export function SwarmSwitch(props: SwarmSwitchProps) {
    return <Switch {...props} />;
}

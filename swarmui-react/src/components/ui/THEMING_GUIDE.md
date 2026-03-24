# Swarm UI Theming Guide

## Semantic Tone System
- `SwarmTone`: `primary | secondary | success | warning | danger | info`
- `SwarmEmphasis`: `solid | soft | outline | ghost`

## Use These Primitives
- `SwarmButton`
- `SwarmActionIcon`
- `SwarmBadge`
- `SwarmStatusPill`
- `SwarmSwitch`
- `SwarmSlider`
- `SwarmSliderField`

## Mapping Rules
- Primary CTA: `tone="primary"`, usually `emphasis="solid"`
- Neutral/passive actions: `tone="secondary"`, `emphasis="soft"` or `ghost`
- Destructive actions: `tone="danger"`
- Success state labels: `tone="success"`
- Warning state labels: `tone="warning"`
- Informational state labels: `tone="info"`

## Compatibility Shim
- Legacy props are still accepted for one migration cycle:
  - `color="blue"` etc.
  - Mantine `variant` values
- New code should prefer `tone` + `emphasis`.
- Dev builds log warnings when legacy color props are used through Swarm primitives.

## Styling Contract
- Tone variables are generated in `src/store/themeStore.ts` via `applyThemeToCSS`.
- Global classes are defined in `src/index.css`:
  - `.swarm-tone--*`
  - `.swarm-emphasis--*`
  - `.swarm-button`, `.swarm-action-icon`, `.swarm-badge`, `.swarm-status-pill`

## Motion Guardrail
- Buttons, sliders, and other primary controls should stay visually anchored to the UI plane.
- Avoid hover or active effects that make controls feel like they pop out of the layout:
  - no upward `translateY(...)` lift for buttons
  - no hover or active `scale(...)` on slider thumbs
  - no exaggerated glow that visually detaches the control from nearby surfaces
- Prefer in-plane feedback:
  - color and border shifts
  - subtle inset or ambient shadow changes
  - highlight sweeps or contrast changes that preserve layout stability
- If a control needs stronger emphasis, increase contrast and clarity before adding motion.

## Guardrail
- Run `npm run theme:audit` to report hardcoded color props/hex literals and legacy Mantine dark references.

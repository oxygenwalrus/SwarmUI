# Swarm UI Theming Guide

## Semantic Tone System
- `SwarmTone`: `primary | secondary | success | warning | danger | info`
- `SwarmEmphasis`: `solid | soft | outline | ghost`

## Use These Primitives
- `SwarmButton`
- `SwarmActionIcon`
- `SwarmBadge`
- `SwarmStatusPill`

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

## Guardrail
- Run `npm run theme:audit` to report hardcoded color props/hex literals and legacy Mantine dark references.

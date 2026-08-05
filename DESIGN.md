# SAM Design System

## Direction

SAM uses the **Living Ledger** product direction: a calm, auditable financial
workspace with terminal lineage. Navigation and actions remain familiar; mono
typography, ledger rows, command receipts and precise data formatting carry the
terminal character.

The desktop composition is built from a compact index, command bar, continuous
ledger canvas, contextual inspector and action tray. The phone/PWA composition
keeps the existing full-viewport mobile shell.

## Typography

- Native system sans stack: navigation, headings, labels and prose.
- JetBrains Mono: money, dates, identifiers, filters and compact receipts.
- Product headings use a fixed rem scale. Body copy stays between 65 and 75ch.

## Semantic color roles

Every SAM palette maps to the same roles. Colors never change meaning between
themes.

| Role | Ayu-based desktop reference | Usage |
| --- | --- | --- |
| Canvas | `#07131c` | Application background |
| Index | `#0b1822` | Navigation and command bars |
| Surface | `#10212d` | Tables, menus and raised controls |
| Inspector | `#0d1c27` | Contextual detail panels |
| Ink | `#e6f0f2` | Primary text |
| Muted ink | `#9cb0b8` | Secondary text |
| Hairline | `#24404b` | Dividers and boundaries |
| Information | `#54d8e4` | Links, focus and informational state |
| Positive | `#a8e63b` | Selection, income, saving and success |
| Pending | `#f3b63f` | Due items and warnings |
| Risk | `#ff6b5e` | Overspend, errors and destructive actions |

All seven existing palettes remain selectable. Contrast must be verified per
palette rather than assuming the reference colors apply unchanged.

## Layout and density

- Spacing follows a 4px base: 4, 8, 12, 16, 24, 32 and 48px.
- Panels use 6 to 14px radii. Pills are reserved for filters and statuses.
- Desktop index: 184px expanded, 56px collapsed.
- Desktop command bar: 56px.
- Desktop inspector: 320 to 360px.
- Desktop action tray: 64px.
- Cards are used only for independently actionable objects. Ledger sections use
  alignment, bands and dividers instead of nested containers.

## Motion

- UI transitions run 150 to 220ms with an ease-out-quart curve.
- Motion communicates selection, state change, loading or updated context.
- Layout properties are not animated.
- `prefers-reduced-motion` replaces drawing and sliding with instant changes or
  a short crossfade.
- Product pages do not use orchestrated load sequences.

## Interaction

- Every control defines default, hover, focus-visible, active, disabled,
  loading, error and success states.
- Focus rings use the information color and remain at least 2px thick.
- Routine create/edit flows use the contextual inspector. Destructive actions
  use explicit confirmation when recovery is not possible.
- Keyboard shortcuts never fire while focus is inside an editable field.

## Chart language

SAM uses semantic HTML and SVG for cash-flow braids, budget-pressure matrices,
goal runways, recurrence bands and slope comparisons. Every chart has a text or
table equivalent. Investment and market-chart vocabulary is not part of SAM.

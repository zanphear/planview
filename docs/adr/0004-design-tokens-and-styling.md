# ADR 0004: Design tokens (OKLCH semantic layer) and styling cleanup

## Status
Accepted, in progress (2026-06-27)

## Context
Forbidden-8: no raw palette or arbitrary literals in `*.tsx`; semantic tokens only, colour authored in OKLCH. The audit found roughly 270 arbitrary-bracket literals (`bg-[var(--color-grey-1)]`), 103 raw palette utilities (`bg-red-*`), 386 `text-xs` plus 46 sub-`text-sm` font sizes, no `@theme` semantic utilities, hex (not OKLCH) token values, no `-foreground` partners, and no shadcn/Radix primitive layer. Accessibility gaps compound this: hand-rolled modals with no `role="dialog"`/focus trap, no `focus-visible` ring, no `aria-live`.

## Decision
Build the semantic token target first (done in this change, additive and non-breaking), then migrate consumers and accessibility incrementally. Do not rewrite the palette to OKLCH blind without visual QA, since rendered colour must be verified in a browser.

## What landed now (foundation)
- `src/styles/globals.css` gains a Tailwind v4 `@theme inline` block exposing semantic utilities (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-accent`, `bg-destructive`, `border-outline`, etc.) that resolve to the existing runtime CSS vars, so dark mode stays a token swap.
- New `-foreground` partner tokens and a focus ring token, authored in OKLCH.
- A global `:focus-visible` ring (forbidden-26).
- Existing brand hex values are preserved to keep rendering identical pending verified migration.

## Plan (deferred, needs browser QA)
1. Convert the existing brand palette from hex to OKLCH primitives, verifying colour fidelity in light and dark.
2. Adopt shadcn/Radix for Dialog/Button/Select/Table, which fixes the modal a11y findings (role, focus trap, focus restore) wholesale.
3. Mechanical sweep of the ~270 bracket literals and 103 palette utilities onto the semantic utilities.
4. Raise body copy to `text-sm`; eliminate `text-[8-11px]`.
5. Add `aria-live` announcers, chart text alternatives, and a SkipLink.

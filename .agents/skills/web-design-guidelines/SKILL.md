---
name: web-design-guidelines
description: >-
  Review and build UI code in compliance with Vercel Web Interface Guidelines while strictly preserving the project's Global CSS design tokens (frontend/src/assets/css/style.css).
  Use when building, editing, or reviewing Vue components, CSS, forms, buttons, tables, or UI/UX in this project.
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines (Vercel Labs)

Review and build UI files in compliance with the Vercel Web Interface Guidelines and the project's Global CSS (`frontend/src/assets/css/style.css`).

## Project Design System Lock (`frontend/src/assets/css/style.css`)

1. **Reuse Existing Design Tokens (`:root`):**
   - Never hardcode random hex colors, font families, or AI-slop purple/blue gradients.
   - Always use CSS variables defined in `frontend/src/assets/css/style.css` (`--bg-primary`, `--bg-secondary`, `--primary`, `--accent`, `--success`, `--warning`, `--danger`, `--text-primary`, `--text-secondary`, `--border-color`, `--space-*`, `--radius-*`, `--shadow-*`).
2. **Reuse Global Component Classes:**
   - Reuse `.card`, `.card-title`, `.btn`, `.btn-primary`, `.btn-secondary` and existing layout utilities from `frontend/src/assets/css/style.css` before writing scoped CSS.
3. **Typography Scale:**
   - Respect `--font-family` (`'Prompt', 'Noto Sans Thai', sans-serif`) and the capped font scale (`--font-xxs` through `--font-lg`).

## Core Web Interface Checklist

1. **Numbers, Prices & Stock Quantities (`tabular-nums`):**
   - Apply `font-variant-numeric: tabular-nums` to prices, totals, receipt amounts, stock counts, timers, and table columns so digits align vertically and never jitter when values change.
2. **Touch & Click Targets (POS Screen Usability):**
   - Set `touch-action: manipulation` on interactive buttons and tap controls to prevent 300ms double-tap delay.
   - Ensure interactive hit targets are at least `44x44px` on touch screens with zero dead zones between label and input.
3. **Forms & Inputs:**
   - Always pair `<label>` with inputs, use appropriate `type` and `inputmode` (`numeric`, `decimal`, `tel`) for POS keypad entry, and disable submit buttons while requests are in flight to prevent duplicate orders/saves.
4. **Layout Stability & Overflow:**
   - Prevent layout shifts when switching states (loading, empty, error, active).
   - Handle long product names or notes gracefully with `text-overflow: ellipsis` or `min-width: 0` inside flex/grid items.
5. **Animations & Transitions:**
   - Animate only compositor-friendly properties (`transform`, `opacity`) or explicit properties (`background-color`, `border-color`) using `--transition-fast` / `--transition-base`. Avoid expensive layout thrashing.
6. **Accessibility & Focus:**
   - Maintain visible `:focus-visible` states using `--border-color-focus` and semantic HTML elements (`<button>`, `<dialog>`, `<table>`).

## Upstream Source Reference

For full audits against the latest upstream rules:
`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`

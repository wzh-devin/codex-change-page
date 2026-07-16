# Codex 换肤助手 Design System

## Intent

An understated macOS studio interface for managing decorative Codex themes. The manager uses restrained system surfaces and lets the selected theme image carry the visual personality.

## Theme

- Follow `prefers-color-scheme` and never force dark mode.
- Use a cool neutral light palette and a graphite dark palette.
- Use one indigo accent for primary actions, selection, and focus.
- Theme artwork may use any palette inside preview surfaces; manager chrome remains neutral.

## Color Tokens

```css
:root {
  --app-bg: #f4f5f7;
  --sidebar-bg: #eceef2;
  --surface: #ffffff;
  --surface-raised: #ffffff;
  --surface-muted: #f7f8fa;
  --text: #20242a;
  --text-muted: #626a76;
  --border: #d8dce3;
  --accent: #5865d8;
  --accent-hover: #4855c5;
  --accent-soft: #e9ebff;
  --success: #19734b;
  --warning: #9a5b08;
  --danger: #b53535;
  --info: #28699c;
  --focus: #6976e8;
}

@media (prefers-color-scheme: dark) {
  :root {
    --app-bg: #17191d;
    --sidebar-bg: #1d2025;
    --surface: #22252b;
    --surface-raised: #282c33;
    --surface-muted: #1c1f24;
    --text: #f1f3f6;
    --text-muted: #a9b0ba;
    --border: #363b44;
    --accent: #8790f2;
    --accent-hover: #9ba3fa;
    --accent-soft: #292e55;
    --success: #65c99a;
    --warning: #e3ad59;
    --danger: #ef8181;
    --info: #75b9e8;
    --focus: #a0a7ff;
  }
}
```

## Typography

- Font stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif`.
- Page title: 22 px / 28 px, weight 650.
- Section title: 15 px / 20 px, weight 650.
- Body: 13 px / 19 px, weight 400.
- Labels and buttons: 13 px / 16 px, weight 550.
- Metadata: 12 px / 17 px, weight 400.
- No uppercase tracking, gradient text, or display typefaces.

## Layout

- Main window minimum: 960 × 640 px.
- Native hidden-inset title bar with standard traffic lights.
- Sidebar: 208 px, fixed on desktop.
- Content width: fluid, with 32 px outer padding and 24 px section rhythm.
- Theme editing uses a two-column layout above 1040 px and stacks below it.
- Prose and help text max width: 72 characters.

## Components

- Buttons use 8 px radius. Primary buttons use the accent fill; secondary buttons use a neutral surface; destructive buttons use danger only when the action is truly destructive.
- Panels use 12 px radius and either a 1 px border or a compact shadow, never both.
- Inputs use native-like 8 px radius, 36 px minimum height, visible focus rings, and inline validation.
- Status rows always combine icon, label, state text, and optional remediation.
- Empty states teach the next action and avoid decorative illustrations.
- Skeletons are used for loading state; progress bars are used for engine operations.
- Dialogs are reserved for restart confirmation, restore, uninstall, and clear-data confirmation.

## Motion

- Standard transition: 180 ms ease-out.
- Use motion only for navigation state, disclosure, progress, and success/error feedback.
- Do not animate layout size during engine operations.
- Under `prefers-reduced-motion: reduce`, remove transforms and reduce transitions to instant state changes.

## Accessibility

- All interactive elements are reachable by keyboard.
- Focus indicators remain visible in light and dark appearance.
- Controls expose accessible names and descriptions.
- Status is never expressed by color alone.
- Preview image controls provide numeric values and reset actions for users who cannot use drag interactions.

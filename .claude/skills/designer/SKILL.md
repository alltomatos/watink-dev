---
name: designer
description: Visualize and modify Watink frontend design tokens, themes, and component styles. Use when asked to audit colors, change themes, preview UI, check design consistency, or modify design tokens.
---

# Watink Designer — Frontend Design System Skill

Visualize, audit, and modify the Watink frontend design system. The driver (`designer.mjs`) parses MUI theme tokens, scans for hardcoded colors, takes UI screenshots, and writes changes directly to source files.

All paths below are relative to the repo root (`/home/ronaldo/watinkdev`).

## Architecture

```
frontend/src/context/DarkMode/index.js   ← Theme tokens (palette, typography, shape, overrides)
frontend/src/layout/MainLayoutSaaS.js    ← SaaS layout styles (makeStyles)
frontend/src/layout/MainLayoutDefault.js ← Default layout styles (makeStyles)
frontend/src/components/**/*.js          ← 63 components, 112 files with makeStyles
```

## Prerequisites

- Node.js 20+ (already available)
- Frontend source available at `frontend/src/`
- For `preview`: app running on localhost:3000 (use `run-watink` skill) + chromium-cli or puppeteer

## Commands

```bash
node .claude/skills/designer/designer.mjs <command> [options]
```

| Command | What it does |
|---|---|
| `tokens` | Extract and display all theme tokens from `createTheme()` |
| `audit` | Scan for hardcoded colors, dark-mode gaps, and duplications |
| `preview` | Take screenshot of the running app (requires app up) |
| `modify --token <path> --value <val>` | Change a theme token in source file |
| `themes [--diff <a,b>] [--switch <name>]` | List, compare, or switch themes |

### `tokens`

```bash
node .claude/skills/designer/designer.mjs tokens
node .claude/skills/designer/designer.mjs tokens --json  # raw JSON output
```

Extracts the `createTheme({})` object from `DarkMode/index.js` and displays:
- **palette**: primary, secondary, background, text colors
- **typography**: fontFamily, button styles
- **shape**: borderRadius
- **overrides**: MuiButton, MuiPaper, MuiTab overrides

### `audit`

```bash
node .claude/skills/designer/designer.mjs audit
node .claude/skills/designer/designer.mjs audit --verbose  # show per-file details
```

Scans all 112+ `makeStyles` files and reports:
- Hardcoded colors not referencing `theme.palette.*`
- Colors that should be in the theme but are inline
- Duplicate hex values across files
- Components that lack dark-mode variants
- Top duplicated colors with file counts

### `preview`

```bash
node .claude/skills/designer/designer.mjs preview
node .claude/skills/designer/designer.mjs preview --route /tickets
node .claude/skills/designer/designer.mjs preview --theme saas --mode dark
node .claude/skills/designer/designer.mjs preview --wait 3000
```

Takes a screenshot of the running frontend. Options:
- `--route <path>` — navigate to a specific route before capturing
- `--theme <apple|saas>` — set theme via localStorage before capture
- `--mode <light|dark>` — set dark mode via localStorage before capture
- `--wait <ms>` — wait N ms after navigation before capturing (default 2000)
- `--output <file>` — output filename (default: `watink-design-preview.png`)

Requires the app to be running. Uses puppeteer or chromium-cli (same as `run-watink` driver).

### `modify`

```bash
node .claude/skills/designer/designer.mjs modify --token palette.primary.main --value "#0066FF"
node .claude/skills/designer/designer.mjs modify --token palette.background.default --value "#FAFAFA"
node .claude/skills/designer/designer.mjs modify --token shape.borderRadius --value 8
```

Modifies a theme token directly in `frontend/src/context/DarkMode/index.js`. The `--token` path uses dot-notation matching the `createTheme` object structure. Changes are written to the source file immediately.

For hardcoded colors in components, use the Claude Code Edit tool directly — the `audit` command identifies which files and lines to change.

### `themes`

```bash
node .claude/skills/designer/designer.mjs themes           # list available themes
node .claude/skills/designer/designer.mjs themes --diff apple,saas  # compare token differences
node .claude/skills/designer/designer.mjs themes --switch saas      # change default theme
```

## Gotchas

- **MUI v4 only** — this skill targets `@material-ui/core` v4.12, NOT MUI v5+. Theme structure differs significantly.
- **Hardcoded colors in makeStyles** — many layout/component styles use hex colors directly instead of `theme.palette.*`. The `audit` command finds these; `modify` only handles theme-level tokens.
- **Two layout themes** — `MainLayoutDefault` and `MainLayoutSaaS` have separate `makeStyles` with different color schemes. Changing one doesn't affect the other.
- **Frontend rebuild needed** — after `modify`, run `cd frontend && npm run build` to update the embedded build in the Go backend.
- **Screenshot requires running app** — `preview` needs the frontend dev server on port 3000 or the backend on port 8082.

## Troubleshooting

- **`tokens` shows incomplete data**: The parser reads `DarkMode/index.js` via regex. If the theme object structure changes significantly, the regex may need updating.
- **`audit` misses colors**: Only scans `.js` files in `frontend/src/`. CSS/SCSS files are not included.
- **`preview` fails with "No screenshot tool"**: Install puppeteer (`npm install puppeteer`) or chromium-cli.
- **`modify` says "token not found"**: Check the exact path with `tokens --json` first. Only tokens in the `createTheme` object are modifiable.

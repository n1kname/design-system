# Design system

Design tokens, a chart palette and chart helpers. Every chart demo in this repo uses synthetic data.

```
packages/tokens       DTCG 2025.10 tokens, built by Style Dictionary into CSS, with contrast checks
packages/charts       Observable Plot presets and a donut, rendered at build time to SVG
packages/components   Astro components
demo                  One static page showing every palette in both themes
```

## Use

```bash
pnpm install
pnpm build
pnpm check
```

`pnpm build` writes `packages/tokens/dist/tokens.css` and `demo/dist/index.html`. It exits non-zero if any colour
pairing fails.

## Tokens

`packages/tokens/src/generate.mjs` computes every ramp in OKLCH and writes the DTCG files in `packages/tokens/tokens`.
`tokens.resolver.json` names the sets and the light and dark contexts. Style Dictionary reads them, and `check.mjs`
asserts the result.

CSS names: `--c-*` for colour, `--sp-*`, `--radius-*`, `--layout-*`, `--font-*`, and `--text-*`, `--leading-*`,
`--tracking-*` for type. Dark mode is `data-theme="dark"`, or the system setting when `data-theme` is absent.

## Chart colours

| Job | Tokens | Rule |
|---|---|---|
| Identity | `--c-chart-1` to `8` | Fixed order, never cycled. A ninth series folds into Other. |
| One thing matters | `--c-chart-1` and `--c-chart-neutral` | Highlight it, grey the rest. |
| How much | `--c-seq-1` to `7`, `--c-seq2-1` to `7` | One hue. Step 1 means little, in both themes. |
| Above or below | `--c-div-neg-*`, `--c-div-mid`, `--c-div-pos-*` | Two hues, near-grey midpoint. |
| Good or bad | `--c-status-*` | Reserved. Always with an icon and a label. |

Text in a chart wears text tokens, never a series colour. Scatter plots, maps and small multiples stop at three series.

Charts render at build time, so a page ships no chart JavaScript and its data stays in that page's HTML.

`scripts/check-public.mjs` fails on anything shaped like an email address, an IP address, coordinates or a home path.
Set `PRIVATE_TERMS_FILE` to also check a list kept outside the repo.

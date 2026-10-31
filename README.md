# Design system

Design tokens, a chart palette and chart helpers. Every chart example in this repo uses synthetic data.

```
packages/tokens       DTCG 2025.10 tokens, built by Style Dictionary into CSS, with contrast checks
packages/charts       Observable Plot presets and a donut, rendered at build time to SVG
packages/components   Astro components
docs                  The docs site, built with Starlight
```

## Use

```bash
pnpm install
pnpm build
pnpm check
```

`pnpm build` writes `packages/tokens/dist/tokens.css` and the docs site to `docs/dist`. It exits non-zero if any colour
pairing fails. `pnpm run docs` runs the docs site locally.

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

Text in a chart wears text tokens, never a series colour. Scatter plots, maps and small multiples stop at three series:
past that, some non-neighbouring pairs get too close for colour-blind readers. A label inside a fill takes white or the
dark ink, whichever passes 4.5:1, and should stay large or move outside the mark. Slot 1 is the brand orange each theme
uses, so the dark lightness ceiling sits at 0.76, not the usual 0.67.

Charts render at build time, so a page ships no chart JavaScript and its data stays in that page's HTML. Text inside an
SVG shrinks with it, so `renderResponsive` draws a chart for wide and narrow columns and CSS shows one.

`scripts/check-public.mjs` fails on anything shaped like an email address, an IP address, coordinates or a home path.
Set `PRIVATE_TERMS_FILE` to also check a list kept outside the repo.

## Licence

MIT. See [LICENSE](LICENSE).

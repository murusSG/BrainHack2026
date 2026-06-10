# MURUS SG Command UI Redesign

## Direction

The selected direction is **Civic Signal Grid**: a calm, high-density public-service command
surface using cool operational neutrals, teal for routine actions, and Singapore red only for
urgent or nationally branded states.

The background treatment is generated with CSS gradients and route/grid lines. It does not add
image downloads, web fonts, animation libraries, or runtime rendering work.

## Figma

- File: [MURUS SG Civic Signal Grid Redesign](https://www.figma.com/design/L4DOZfwMNVhCzjG3z7Rs3U)
- Status: the design file was created, but the connected Figma Starter workspace reached its MCP
  call quota before foundations and mockups could be committed to the canvas.
- Intended canvases: design system, Overview mockup, Dispatcher mockup, Incident Map mockup, and
  asset-direction comparison.

## Foundations

### Colour

| Role | Value | Usage |
| --- | --- | --- |
| Canvas | `#F2F6F5` | Command workspace background |
| Surface | `#FFFFFF` | Cards, panels, controls |
| Ink | `#102C30` | Primary text |
| Muted | `#5F7477` | Secondary text and metadata |
| Border | `#CFDCDA` | Dividers and control boundaries |
| Operational teal | `#0C6B67` | Routine actions, selected states |
| Singapore red | `#D62F43` | Critical incidents and emergency emphasis |
| Amber | `#B87516` | Warnings and degraded states |
| Green | `#287A58` | Available, online, dispatched states |
| Blue | `#2F6F9F` | Informational and low-severity map states |

### Type And Shape

- Type: local system fonts headed by Segoe UI Variable/Aptos, avoiding an extra font request.
- Radius: `10px` controls, `12-14px` cards, `16-18px` major surfaces.
- Elevation: restrained teal-black shadows; no glow-heavy or glass-heavy treatment.
- Focus: visible teal focus ring on command and dispatcher controls.
- Motion: reduced-motion support disables decorative transitions and animations.

## Asset Directions Explored

1. Singapore map-grid: geographic grid with national red waypoints.
2. Routing-line: thin multi-agency paths connecting operational nodes.
3. Radial command gradient: soft teal command-centre focus.
4. Incident pulse network: expanding status nodes and connection lines.
5. Civic-tech texture: low-contrast institutional paper/grid texture.
6. Contour route lines: topographic route bands for map-led pages.

**Selected:** a map-grid and routing-line hybrid. It is the clearest match for a single-source-of-
truth command product and can be rendered entirely in CSS without adding asset weight.

## Implemented Surfaces

- Shared command shell: grouped navigation, clearer product identity, truthful footer states,
  compact topbar, search affordance, and service status.
- Overview: stronger operational hierarchy, three-step command principle strip, calmer cards,
  consistent severity semantics, and unified Foresight/allocation surfaces.
- Dispatcher: operational summary strip, denser priority queue, clearer selected state, explicit
  human-authority indicator, and shared map legend.
- Incident Map: unified map context card, reusable legend, keyboard-native incident buttons,
  selected-incident summary, and improved empty/loading/error styling.
- Theme: centralized Mantine colour scales, typography, radius, and shadow choices.

## Validation

Run from `frontend/`:

```powershell
npm run build
& 'C:\Users\yunka\AppData\Local\npm-cache\_npx\39eeea3b362d2c2d\node_modules\node\bin\node.exe' .\node_modules\vitest\vitest.mjs run
```

The default Node `v20.17.0` cannot start Vitest because the installed jsdom dependency chain mixes
CommonJS `html-encoding-sniffer` with ESM-only `@exodus/bytes`. The project declares Node
`>=20.19.0`; the full suite passes with Node `v20.19.0`.

## Manual Review Checklist

- Profile Overview scrolling and Foresight expansion in Chrome Performance.
- Confirm OneMap tile latency and marker interaction on the deployed Vercel site.
- Check 1280px, 1024px, 768px, and mobile navigation/layout breakpoints.
- Verify contrast with real incident severity combinations and long agency names.
- Confirm Vercel uses Node `>=20.19.0` for reproducible test tooling.

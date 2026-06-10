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

## Singapore Visual Assets

The command surfaces use reusable inline SVG components from `src/components/visuals/`:

- `SingaporeSkylineBackground`: lower-edge skyline divider in the Overview hero.
- `MerlionWatermark`: low-opacity watermark in the resident response summary.
- `SupertreeGroveAccent`: restrained advisory-panel corner detail.
- `SingaporeLandmarkFrame`: Marina Bay Sands and Singapore Flyer frame in Dispatcher.
- `CivicGridBackground`: low-opacity operational grid behind Dispatcher incident details.
- `SingaporeRoutePattern`: connecting-route texture behind Dispatcher and the map sidebar.
- `MarinaBaySandsSilhouette` and `SingaporeFlyerAccent`: standalone landmark primitives used by
  the composite frame and available for future section-level layouts.

All drawings use `currentColor`, are hidden from assistive technology, ignore pointer events, and
render without raster assets, external requests, filters, or animation.

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

## Site-Wide Audit

The route audit covers every route declared in `src/App.jsx`.

| Route | Surface | Previous state | Current visual treatment |
| --- | --- | --- | --- |
| `/` | Landing | Missed | Marina Bay hero, network texture, unified cards |
| `/login` | Authentication | Missed | Flyer-backed auth canvas and elevated form card |
| `/signup` | Registration | Missed | Marina Bay-backed auth canvas and elevated form card |
| `/auth/callback` | Auth loading | Partial | Shared loading shell and global civic-tech theme |
| `/public-dashboard` | Resident public dashboard | Missed | Network canvas, skyline incident banner, refined cards |
| `/resident` | Resident tools | Missed | Low-opacity network canvas and Merlion panel treatment |
| `/responder` | Responder operations | Missed | Flyer header, network canvas, Merlion shared-log accent |
| `/dispatcher` | Dispatcher operations | Redesigned | Canva Flyer/Marina composition replaces line artwork |
| `/overview` | Command overview | Redesigned | Strong Marina Bay hero and Merlion summary watermark |
| `/incident-map` | Command map | Redesigned | Restrained route-grid treatment outside the map canvas |
| `/resources` | Resource operations | Partial | Flyer hero, shared command surfaces, Merlion request accent |
| `/hospitals` | Hospital capacity | Partial | Flyer hero, shared command surfaces, Merlion registry accent |
| `/alerts` | Alert operations | Partial | Network canvas and Merlion detail-panel accent |
| `/system-flow` | Architecture view | Partial | Civic network hero and Merlion implementation accent |

The command routes also share the redesigned sidebar, topbar, footer, typography, status language,
buttons, cards, tables, forms, loading states, and error/empty-state surfaces through
`DashboardLayout`, `theme.js`, and `operations.css`.

## Canva Asset Handoff

The production artwork is stored under `src/assets/singapore/` and exposed through the reusable
components in `src/components/visuals/`. The checked-in files are optimized PNG previews because
the Canva connector did not expose SVG export in this session.

| Asset | Frontend file | Primary use | Canva source |
| --- | --- | --- | --- |
| Marina Bay command hero | `marina-bay-command-hero.png` | Landing, Overview, public banner, auth variant | [Edit in Canva](https://www.canva.com/d/AdrXGC3L7kdcq1u) |
| Singapore Flyer command hero | `singapore-flyer-command-hero.png` | Dispatcher, responder, resources, hospitals, login | [Edit in Canva](https://www.canva.com/d/BMKiIQ1y8lJkLMn) |
| Merlion panel watermark | `merlion-panel-watermark.png` | Summary, detail, request, registry, shared-log panels | [Edit in Canva](https://www.canva.com/d/EYnfjzuYs-vAfIo) |
| Civic route-grid | `civic-route-grid.png` | Dense pages, sidebars, forms, map-adjacent areas | [Edit in Canva](https://www.canva.com/d/CKVYD-gekQ98wZw) |

The four files total about 390 KB before build hashing. Vite emits them as separate cacheable
assets, and route-level code splitting remains intact.

## Reusable Usage Pattern

- Use `SingaporeSkylineBackground` or `MarinaBaySandsSilhouette` for prominent hero surfaces.
- Use `SingaporeLandmarkFrame` or `SingaporeFlyerAccent` for operational headers and corners.
- Use `MerlionWatermark` inside large summary or informational panels.
- Use `SingaporeRoutePattern` or `CivicGridBackground` behind dense non-map content.
- Keep all artwork decorative with empty alt text and `aria-hidden="true"`.
- Prefer the centralized CSS variables in `operations.css` over page-specific asset URLs.

## Asset Integration Baseline Validation

- Before the scale-system correction, `npm run build` passed.
- Before the correction, Vitest with Node `20.19.0` passed 16 files and 52 tests.
- Default Node `20.17.0`: still cannot start Vitest because of the existing
  `html-encoding-sniffer` / `@exodus/bytes` CommonJS-to-ESM incompatibility.

## Consistency And Scale Correction

The first Canva integration still allowed individual pages to size and position artwork through
page-specific classes. That produced conflicting rules for Overview, Dispatcher, and Incident Map
at desktop and mobile breakpoints. The corrected system removes raw asset sizing from page modules.

### Route Audit

| Route | Audit finding before correction | Corrected treatment |
| --- | --- | --- |
| `/` | Asset scale and placement issue | Shared landing shell with `hero` preset |
| `/login` | Partially aligned; auth styling differed | Shared auth canvas with `subtleBackground` |
| `/signup` | Partially aligned; auth styling differed | Shared auth canvas with `subtleBackground` |
| `/auth/callback` | Not aligned; plain loading shell | Shared loading shell and route-grid background |
| `/public-dashboard` | Partially aligned; overly independent public style | Shared standalone shell and `sectionDivider` |
| `/resident` | Partially aligned; old page background | Shared standalone shell and Merlion `watermark` |
| `/responder` | Partially aligned; header/background mismatch | Shared standalone shell and Flyer `panel` |
| `/dispatcher` | Asset scale and placement issue | Shared shell; removed manual route/header artwork |
| `/overview` | Asset scale issue and duplicate hero artwork | Shared command shell; MBS `hero` preset |
| `/incident-map` | Readability and placement issue | Route grid at 2.5% opacity outside map canvas |
| `/resources` | Partially aligned | Shared command shell and Flyer `corner` |
| `/hospitals` | Partially aligned | Shared command shell and Flyer `corner` |
| `/alerts` | Partially aligned | Shared command shell and route-grid background |
| `/system-flow` | Partially aligned | Shared command shell and `sectionDivider` |

`DebugPage.jsx` is a development-only screen and is not declared in `App.jsx`; it is therefore not
part of the navigable product. No settings, configuration, or admin routes currently exist.

### Shared Components

- `AppPage` is the route-level page background, clipping, stacking, and width boundary.
- `SingaporeVisualLayer` is the only component permitted to render Singapore artwork.
- `VisualPanel` provides standardized panel watermarks and corner accents.
- `DashboardLayout` applies command-route presets using its existing `activePage` property.
- `StandalonePage` applies the same system to landing, auth, public, resident, responder, and
  dispatcher routes.

The previous visual exports that accepted arbitrary `size`, `opacity`, and inline positioning were
removed. Pages now select only semantic values:

```jsx
<SingaporeVisualLayer
  visual="mbs"
  visualVariant="hero"
  visualPosition="topRight"
  visualIntensity="medium"
/>
```

### Asset Presets

| Preset | Desktop size | Mobile size | Intended use |
| --- | --- | --- | --- |
| `hero` | `420-640px` wide, `210-340px` high | Up to `440px` by `190px` | Landing and Overview |
| `panel` | `190-320px` wide, `130-220px` high | `210px` by `145px` | Responder/Dispatcher headers |
| `corner` | `140-240px` wide, `100-170px` high | `150px` by `105px` | Dense operational pages |
| `watermark` | `220-360px` wide, `155-255px` high | `230px` by `165px` | Summary and status panels |
| `sectionDivider` | Container width, `72-120px` high | `72px` high | Public and architecture sections |
| `subtleBackground` | Container bounds | Container bounds | Forms, lists, map side panels |

Opacity is limited to `subtle` (`5.5%`, reduced to `3.5%` on mobile) and `medium` (`12%`, reduced
to `7.5%` on mobile). All layers are absolutely positioned, clipped by their wrapper, use
`pointer-events: none`, and reserve no layout space.

### Normalized Foundations

- Page maximum width: `1480px`.
- Page padding: responsive `16-34px`.
- Control radius: `10px`.
- Panel radius: `14px`.
- Feature/header radius: `18px`.
- One panel border, canvas color, muted surface, and elevation scale.
- Shared treatment for cards, forms, tables/lists, chips, status badges, loading states, and empty
  states.
- Map artwork is suppressed inside the actual map panel and limited to surrounding UI.

### Correction Validation

- `git diff --check`: passed.
- Route inventory: all 14 declared product paths use `AppPage`.
- Legacy per-page visual sizing selectors and arbitrary sizing props: removed.
- Production build and Vitest rerun: pending because the command approval service reached its
  temporary usage limit during this correction.

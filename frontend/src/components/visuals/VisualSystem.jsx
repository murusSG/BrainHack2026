import { singaporeVisualAssets } from './SingaporeVisuals';
import {
  commandPageVisuals,
  standalonePageVisuals,
  visualAssets,
  visualIntensities,
  visualPositions,
  visualVariants,
} from './visualConfig';

function validValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

export function SingaporeVisualLayer({
  className = '',
  visual = 'none',
  visualVariant = 'subtleBackground',
  visualPosition = 'bottomRight',
  visualIntensity = 'subtle',
}) {
  const assetKey = visualAssets[visual];
  if (!assetKey || visualIntensity === 'none') return null;

  const variant = validValue(visualVariant, visualVariants, 'subtleBackground');
  const position = validValue(visualPosition, visualPositions, 'bottomRight');
  const intensity = validValue(visualIntensity, visualIntensities, 'subtle');

  return (
    <div
      aria-hidden="true"
      className={[
        'sg-visual-layer',
        `sg-visual-layer--${variant}`,
        `sg-visual-layer--${position}`,
        `sg-visual-layer--${intensity}`,
        className,
      ].filter(Boolean).join(' ')}
    >
      <img alt="" draggable="false" src={singaporeVisualAssets[assetKey]} />
    </div>
  );
}

export function AppPage({
  children,
  className = '',
  mode = 'command',
  page,
  visual,
  visualVariant,
  visualPosition,
  visualIntensity,
}) {
  const preset =
    mode === 'command'
      ? commandPageVisuals[page] ?? {}
      : standalonePageVisuals[page] ?? {};

  return (
    <div className={`app-page app-page--${mode} app-page--${page ?? 'default'} ${className}`.trim()}>
      <SingaporeVisualLayer
        visual={visual ?? preset.visual}
        visualVariant={visualVariant ?? preset.visualVariant}
        visualPosition={visualPosition ?? preset.visualPosition}
        visualIntensity={visualIntensity ?? preset.visualIntensity}
      />
      <div className="app-page__content">{children}</div>
    </div>
  );
}

export function VisualPanel({
  as: Component = 'section',
  children,
  className = '',
  visual = 'merlion',
  visualVariant = 'watermark',
  visualPosition = 'bottomRight',
  visualIntensity = 'subtle',
  ...props
}) {
  return (
    <Component className={`visual-panel ${className}`.trim()} {...props}>
      <SingaporeVisualLayer
        visual={visual}
        visualVariant={visualVariant}
        visualPosition={visualPosition}
        visualIntensity={visualIntensity}
      />
      <div className="visual-panel__content">{children}</div>
    </Component>
  );
}

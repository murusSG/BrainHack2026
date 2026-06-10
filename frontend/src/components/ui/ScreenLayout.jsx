import { VisualPanel } from '../visuals';

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

export function ScreenPage({ as: Component = 'div', children, className = '', ...props }) {
  return (
    <Component className={classNames('ui-screen', className)} {...props}>
      {children}
    </Component>
  );
}

export function ScreenPanel({
  as = 'section',
  children,
  className = '',
  tone = 'default',
  visual = 'none',
  visualVariant = 'watermark',
  visualPosition = 'bottomRight',
  visualIntensity = 'subtle',
  ...props
}) {
  return (
    <VisualPanel
      as={as}
      className={classNames('ui-surface', `ui-surface--${tone}`, className)}
      visual={visual}
      visualVariant={visualVariant}
      visualPosition={visualPosition}
      visualIntensity={visualIntensity}
      {...props}
    >
      {children}
    </VisualPanel>
  );
}

export function ScreenHeader({
  as = 'header',
  children,
  className = '',
  visual = 'none',
  visualVariant = 'hero',
  visualPosition = 'topRight',
  visualIntensity = 'subtle',
  ...props
}) {
  return (
    <ScreenPanel
      as={as}
      className={classNames('ui-page-header', className)}
      visual={visual}
      visualVariant={visualVariant}
      visualPosition={visualPosition}
      visualIntensity={visualIntensity}
      {...props}
    >
      {children}
    </ScreenPanel>
  );
}

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AppPage,
  SingaporeVisualLayer,
  VisualPanel,
  visualVariants,
} from '../../src/components/visuals';

describe('Singapore visual system', () => {
  it.each(visualVariants)('renders the %s preset as decorative artwork', (visualVariant) => {
    const { container } = render(
      <SingaporeVisualLayer
        visual="mbs"
        visualVariant={visualVariant}
        visualPosition="bottomRight"
        visualIntensity="subtle"
      />
    );
    const layer = container.querySelector('.sg-visual-layer');
    const image = container.querySelector('img');

    expect(layer).toHaveClass(`sg-visual-layer--${visualVariant}`);
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveAttribute('draggable', 'false');
  });

  it('does not render artwork when the visual is disabled', () => {
    const { container } = render(
      <SingaporeVisualLayer visual="none" visualIntensity="none" />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('applies route presets through the shared page shell', () => {
    const { container } = render(
      <AppPage mode="command" page="overview">
        <p>Operational content</p>
      </AppPage>
    );

    expect(container.querySelector('.app-page--overview')).toBeInTheDocument();
    expect(container.querySelector('.sg-visual-layer--hero')).toBeInTheDocument();
    expect(container.querySelector('.sg-visual-layer--topRight')).toBeInTheDocument();
    expect(container).toHaveTextContent('Operational content');
  });

  it('keeps panel content within a standardized visual wrapper', () => {
    const { container } = render(
      <VisualPanel visual="merlion" visualVariant="watermark">
        <button type="button">Review incident</button>
      </VisualPanel>
    );

    expect(container.querySelector('.sg-visual-layer--watermark')).toBeInTheDocument();
    expect(container.querySelector('.visual-panel__content')).toHaveTextContent('Review incident');
  });
});

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AppPage,
  SingaporeVisualLayer,
  VisualPanel,
  visualVariants,
} from '../../src/components/visuals';
import { ScreenHeader } from '../../src/components/ui';

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

  it('keeps affected route artwork out of the page-wide shell', () => {
    const { container } = render(
      <AppPage mode="command" page="overview">
        <p>Operational content</p>
      </AppPage>
    );

    expect(container.querySelector('.app-page--overview')).toBeInTheDocument();
    expect(container.querySelector('.sg-visual-layer')).not.toBeInTheDocument();
    expect(container).toHaveTextContent('Operational content');
  });

  it('bounds route artwork inside the shared screen header', () => {
    const { container } = render(
      <ScreenHeader visual="mbs" visualIntensity="medium">
        <h1>Emergency Overview</h1>
      </ScreenHeader>
    );

    expect(container.querySelector('.ui-page-header')).toBeInTheDocument();
    expect(container.querySelector('.sg-visual-layer--hero')).toBeInTheDocument();
    expect(container.querySelector('.sg-visual-layer--topRight')).toBeInTheDocument();
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

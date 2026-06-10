export const visualAssets = {
  mbs: 'marinaBayHero',
  skyline: 'marinaBayHero',
  flyer: 'singaporeFlyerHero',
  merlion: 'merlionWatermark',
  routeGrid: 'civicRouteGrid',
};

export const visualVariants = [
  'hero',
  'panel',
  'corner',
  'watermark',
  'sectionDivider',
  'subtleBackground',
];

export const visualPositions = [
  'topRight',
  'bottomRight',
  'bottomLeft',
  'centerRight',
  'center',
];

export const visualIntensities = ['none', 'subtle', 'medium'];

export const commandPageVisuals = {
  overview: {
    visual: 'mbs',
    visualVariant: 'hero',
    visualPosition: 'topRight',
    visualIntensity: 'medium',
  },
  'incident-map': {
    visual: 'routeGrid',
    visualVariant: 'subtleBackground',
    visualPosition: 'centerRight',
    visualIntensity: 'subtle',
  },
  resources: {
    visual: 'flyer',
    visualVariant: 'corner',
    visualPosition: 'topRight',
    visualIntensity: 'subtle',
  },
  hospitals: {
    visual: 'flyer',
    visualVariant: 'corner',
    visualPosition: 'topRight',
    visualIntensity: 'subtle',
  },
  alerts: {
    visual: 'routeGrid',
    visualVariant: 'subtleBackground',
    visualPosition: 'centerRight',
    visualIntensity: 'subtle',
  },
  'system-flow': {
    visual: 'routeGrid',
    visualVariant: 'sectionDivider',
    visualPosition: 'topRight',
    visualIntensity: 'subtle',
  },
};

export const standalonePageVisuals = {
  landing: {
    visual: 'mbs',
    visualVariant: 'hero',
    visualPosition: 'bottomRight',
    visualIntensity: 'medium',
  },
  login: {
    visual: 'flyer',
    visualVariant: 'subtleBackground',
    visualPosition: 'centerRight',
    visualIntensity: 'subtle',
  },
  signup: {
    visual: 'mbs',
    visualVariant: 'subtleBackground',
    visualPosition: 'centerRight',
    visualIntensity: 'subtle',
  },
  public: {
    visual: 'skyline',
    visualVariant: 'sectionDivider',
    visualPosition: 'topRight',
    visualIntensity: 'subtle',
  },
  resident: {
    visual: 'merlion',
    visualVariant: 'watermark',
    visualPosition: 'bottomRight',
    visualIntensity: 'subtle',
  },
  responder: {
    visual: 'flyer',
    visualVariant: 'panel',
    visualPosition: 'topRight',
    visualIntensity: 'subtle',
  },
  dispatcher: {
    visual: 'flyer',
    visualVariant: 'panel',
    visualPosition: 'topRight',
    visualIntensity: 'subtle',
  },
  loading: {
    visual: 'routeGrid',
    visualVariant: 'subtleBackground',
    visualPosition: 'center',
    visualIntensity: 'subtle',
  },
};

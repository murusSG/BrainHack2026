import { createTheme } from '@mantine/core';

// Singapore red remains the emergency accent. Operational command surfaces use
// teal for routine actions so urgent states keep their visual weight.
const brandRed = [
  '#ffe9ec',
  '#ffccd2',
  '#f89aa4',
  '#f26674',
  '#ef3344',
  '#e51b30',
  '#c5162b',
  '#a61124',
  '#85091a',
  '#5e0411',
];

const commandTeal = [
  '#e7f7f4',
  '#d3eee9',
  '#a8ddd5',
  '#79c9bf',
  '#4fb4a8',
  '#2b988f',
  '#0c6b67',
  '#075855',
  '#064744',
  '#043532',
];

export const theme = createTheme({
  fontFamily: '"Segoe UI Variable", "Aptos", Inter, ui-sans-serif, system-ui, sans-serif',
  primaryColor: 'commandTeal',
  primaryShade: 6,
  colors: { brandRed, commandTeal },
  defaultRadius: 'md',
  radius: {
    xs: '6px',
    sm: '10px',
    md: '14px',
    lg: '18px',
    xl: '24px',
  },
  headings: {
    fontFamily: '"Segoe UI Variable Display", "Aptos Display", Inter, ui-sans-serif, sans-serif',
    fontWeight: '750',
  },
  shadows: {
    xs: '0 2px 8px rgba(16, 44, 48, 0.06)',
    sm: '0 10px 28px rgba(16, 44, 48, 0.09)',
    md: '0 18px 44px rgba(16, 44, 48, 0.12)',
  },
  other: {
    pageMaxWidth: 1480,
    pagePaddingDesktop: 32,
    pagePaddingTablet: 24,
    pagePaddingMobile: 16,
    panelBorder: '#cfdcda',
    panelBackground: '#ffffff',
    canvasBackground: '#f2f6f5',
  },
});

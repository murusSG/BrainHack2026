import { createTheme } from '@mantine/core';

// Singapore-red brand scale (light → dark). Index 6 is the primary shade,
// matching the existing #ef3344 / #c5162b accent used across the public pages.
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

export const theme = createTheme({
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  primaryColor: 'brandRed',
  primaryShade: 6,
  colors: { brandRed },
  defaultRadius: 'md',
  headings: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontWeight: '800' },
});

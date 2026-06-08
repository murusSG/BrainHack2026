import { render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { theme } from '../src/theme';

// Wraps a component in the same providers main.jsx uses, plus a routing
// context, so Mantine components and react-router hooks work in tests.
export function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <MantineProvider theme={theme} defaultColorScheme="light">
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </MantineProvider>
  );
}

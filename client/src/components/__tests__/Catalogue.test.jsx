import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App.jsx';
import { useCatalogueStore } from '../../stores/catalogueStore.js';
import { aTool } from '../../test/factories.js';

/**
 * Integration-flavoured tests: the whole page, with only the network stubbed.
 * These are the ones that catch wiring bugs a component test cannot see.
 */
const mockFetch = (impl) => { globalThis.fetch = vi.fn(impl); };

/**
 * An anonymous visitor's /auth/refresh really does come back 401 — the mock
 * has to reproduce that, not hand back a hollow success. A mock that is kinder
 * than production is a mock that hides bugs.
 */
const anonymousRefresh = { ok: false, status: 401, json: async () => ({ error: { message: 'No session to refresh.' } }) };

const okTools = (tools) => async (url) => (
  String(url).includes('/auth/')
    ? anonymousRefresh
    : { ok: true, status: 200, json: async () => ({ data: tools, meta: { count: tools.length } }) }
);

beforeEach(() => {
  useCatalogueStore.setState({ tools: [], status: 'idle', term: '', category: '' });
});

describe('the catalogue page', () => {
  test('shows skeletons first, then the tools', async () => {
    let release;
    mockFetch((url) => (String(url).includes('/auth/')
      ? Promise.resolve(anonymousRefresh)
      : new Promise((resolve) => {
          release = () => resolve({ ok: true, status: 200, json: async () => ({ data: [aTool({ name: 'Loaded drill' })] }) });
        })));

    render(<App />);
    expect(await screen.findByText(/loading the catalogue/i)).toBeInTheDocument();

    release();
    expect(await screen.findByRole('heading', { name: 'Loaded drill' })).toBeInTheDocument();
    expect(screen.queryByText(/loading the catalogue/i)).not.toBeInTheDocument();
  });

  test('an empty catalogue gets its own message, not an empty grid', async () => {
    mockFetch(okTools([]));
    render(<App />);
    expect(await screen.findByText(/the shed is empty/i)).toBeInTheDocument();
  });

  test('filtering to nothing gets a DIFFERENT message from an empty catalogue', async () => {
    mockFetch(okTools([aTool({ name: 'Petrol strimmer', category: 'garden' })]));
    render(<App />);
    await screen.findByRole('heading', { name: 'Petrol strimmer' });

    await userEvent.type(screen.getByLabelText(/search the catalogue/i), 'submarine');

    expect(await screen.findByText(/nothing matches that/i)).toBeInTheDocument();
    expect(screen.queryByText(/the shed is empty/i)).not.toBeInTheDocument();
  });

  test('clearing the filters brings the tools back', async () => {
    mockFetch(okTools([aTool({ name: 'Petrol strimmer' })]));
    render(<App />);
    await screen.findByRole('heading', { name: 'Petrol strimmer' });

    await userEvent.type(screen.getByLabelText(/search the catalogue/i), 'zzzz');
    await screen.findByText(/nothing matches that/i);

    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(await screen.findByRole('heading', { name: 'Petrol strimmer' })).toBeInTheDocument();
  });

  test('a failed load shows the error and a working retry', async () => {
    let attempts = 0;
    mockFetch(async (url) => {
      if (String(url).includes('/auth/')) return anonymousRefresh;
      attempts += 1;
      if (attempts === 1) throw new TypeError('Failed to fetch');
      return { ok: true, status: 200, json: async () => ({ data: [aTool({ name: 'Recovered drill' })] }) };
    });

    render(<App />);
    expect(await screen.findByText(/the catalogue did not load/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: 'Recovered drill' })).toBeInTheDocument();
  });

  test('the headline counts are derived from the same list the grid renders', async () => {
    mockFetch(okTools([
      aTool({ name: 'A', status: 'in' }),
      aTool({ name: 'B', status: 'in' }),
      aTool({ name: 'C', status: 'out' }),
    ]));

    render(<App />);
    await screen.findByRole('heading', { name: 'A' });

    await waitFor(() => {
      const shelf = screen.getByText('on the shelf').closest('.stat');
      expect(shelf).toHaveTextContent('2');
      const loan = screen.getByText('out on loan').closest('.stat');
      expect(loan).toHaveTextContent('1');
    });
  });
});

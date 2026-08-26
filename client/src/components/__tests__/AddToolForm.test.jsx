import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddToolForm } from '../AddToolForm.jsx';
import { useCatalogueStore } from '../../stores/catalogueStore.js';
import { useSessionStore } from '../../stores/sessionStore.js';
import { aKeeper, aMember } from '../../test/factories.js';

const asKeeper = () => useSessionStore.setState({ user: aKeeper(), status: 'authenticated' });

const fill = async (values) => {
  for (const [label, value] of Object.entries(values)) {
    const field = screen.getByLabelText(new RegExp(label, 'i'));
    await userEvent.clear(field);
    await userEvent.type(field, value);
  }
};

describe('AddToolForm — visibility', () => {
  test('is hidden from members', () => {
    useSessionStore.setState({ user: aMember(), status: 'authenticated' });
    const { container } = render(<AddToolForm />);
    expect(container).toBeEmptyDOMElement();
  });

  test('is hidden from signed-out visitors', () => {
    const { container } = render(<AddToolForm />);
    expect(container).toBeEmptyDOMElement();
  });

  test('is shown to keepers', () => {
    asKeeper();
    render(<AddToolForm />);
    expect(screen.getByRole('button', { name: /add tool/i })).toBeInTheDocument();
  });
});

describe('AddToolForm — submitting', () => {
  test('sends trimmed, upper-cased and numeric values to the store', async () => {
    asKeeper();
    const create = vi.fn().mockResolvedValue({ ok: true });
    useCatalogueStore.setState({ create });

    render(<AddToolForm />);
    await fill({ 'asset tag': '  ts-0142  ', name: '  Wallpaper steamer  ', shelf: ' C3 ', 'deposit': '10' });
    await userEvent.click(screen.getByRole('button', { name: /add tool/i }));

    expect(create).toHaveBeenCalledTimes(1);
    const sent = create.mock.calls[0][0];
    expect(sent.assetTag).toBe('TS-0142');       // trimmed and upper-cased
    expect(sent.name).toBe('Wallpaper steamer'); // trimmed
    expect(sent.shelf).toBe('C3');
    expect(sent.deposit).toBe(10);               // a number, not "10"
    expect(typeof sent.deposit).toBe('number');
  });

  test('clears the form after a successful save', async () => {
    asKeeper();
    useCatalogueStore.setState({ create: vi.fn().mockResolvedValue({ ok: true }) });

    render(<AddToolForm />);
    await fill({ 'asset tag': 'TS-0142', name: 'Steamer', shelf: 'C3' });
    await userEvent.click(screen.getByRole('button', { name: /add tool/i }));

    expect(screen.getByLabelText(/asset tag/i)).toHaveValue('');
    expect(screen.getByLabelText(/^name/i)).toHaveValue('');
  });

  test('keeps what you typed when the server rejects it, and shows the field errors', async () => {
    asKeeper();
    useCatalogueStore.setState({
      create: vi.fn().mockResolvedValue({
        ok: false,
        fields: { assetTag: 'Asset tags look like TS-0142.' },
      }),
    });

    render(<AddToolForm />);
    await fill({ 'asset tag': 'nope', name: 'Steamer', shelf: 'C3' });
    await userEvent.click(screen.getByRole('button', { name: /add tool/i }));

    expect(await screen.findByText(/asset tags look like/i)).toBeInTheDocument();
    // Losing the user's input on a rejection is the cardinal sin of forms.
    expect(screen.getByLabelText(/asset tag/i)).toHaveValue('nope');
    expect(screen.getByLabelText(/^name/i)).toHaveValue('Steamer');
  });

  test('disables the whole fieldset while saving, so it cannot double-submit', () => {
    asKeeper();
    useCatalogueStore.setState({ formBusy: true });

    render(<AddToolForm />);
    expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled();
    expect(screen.getByLabelText(/asset tag/i)).toBeDisabled();
  });
});

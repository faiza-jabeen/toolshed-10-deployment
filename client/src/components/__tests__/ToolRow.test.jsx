import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolRow } from '../ToolRow.jsx';
import { useCatalogueStore } from '../../stores/catalogueStore.js';
import { useSessionStore } from '../../stores/sessionStore.js';
import { aTool, aKeeper, aMember } from '../../test/factories.js';

const signIn = (user) => useSessionStore.setState({ user, status: 'authenticated' });

describe('ToolRow — rendering', () => {
  test('shows the asset tag, name, shelf and deposit', () => {
    render(<ToolRow tool={aTool({ assetTag: 'TS-0117', name: 'Orbital sander', shelf: 'B4', deposit: 10 })} />);

    expect(screen.getByText('TS-0117')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Orbital sander' })).toBeInTheDocument();
    expect(screen.getByText('Shelf B4')).toBeInTheDocument();
    expect(screen.getByText('£10 deposit')).toBeInTheDocument();
  });

  test('renders a fallback when a tool has no notes', () => {
    render(<ToolRow tool={aTool({ notes: '' })} />);
    expect(screen.getByText('No notes yet.')).toBeInTheDocument();
  });

  test('reflects loan status in words, not only colour', () => {
    const { rerender } = render(<ToolRow tool={aTool({ status: 'in' })} />);
    expect(screen.getByText('On the shelf')).toBeInTheDocument();

    rerender(<ToolRow tool={aTool({ status: 'out' })} />);
    expect(screen.getByText('Out on loan')).toBeInTheDocument();
  });
});

describe('ToolRow — permissions', () => {
  test('a signed-out visitor sees no action buttons', () => {
    render(<ToolRow tool={aTool()} />);
    expect(screen.queryByRole('button', { name: /retire/i })).not.toBeInTheDocument();
    expect(screen.getByText(/sign in as a keeper/i)).toBeInTheDocument();
  });

  test('a member sees no action buttons either', () => {
    signIn(aMember());
    render(<ToolRow tool={aTool()} />);
    expect(screen.queryByRole('button', { name: /retire/i })).not.toBeInTheDocument();
  });

  test('a keeper gets both actions', () => {
    signIn(aKeeper());
    render(<ToolRow tool={aTool({ status: 'in' })} />);
    expect(screen.getByRole('button', { name: /mark out on loan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retire/i })).toBeInTheDocument();
  });
});

describe('ToolRow — interactions', () => {
  test('clicking the status button asks the store to flip it', async () => {
    signIn(aKeeper());
    const patch = vi.fn().mockResolvedValue({ ok: true });
    useCatalogueStore.setState({ patch });

    render(<ToolRow tool={aTool({ id: 42, status: 'in' })} />);
    await userEvent.click(screen.getByRole('button', { name: /mark out on loan/i }));

    expect(patch).toHaveBeenCalledWith(42, { status: 'out' });
  });

  test('the button label describes the destination, not the current state', () => {
    signIn(aKeeper());
    render(<ToolRow tool={aTool({ status: 'out' })} />);
    // A button reading "Out on loan" is ambiguous: is that what it IS, or what
    // it BECOMES? The label has to be an instruction.
    expect(screen.getByRole('button', { name: /mark on the shelf/i })).toBeInTheDocument();
  });

  test('while a row action is in flight both its buttons are disabled', () => {
    signIn(aKeeper());
    useCatalogueStore.setState({ rowBusy: { 7: 'status' } });

    render(<ToolRow tool={aTool({ id: 7 })} />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /retire/i })).toBeDisabled();
  });

  test('one busy row does not disable another', () => {
    signIn(aKeeper());
    useCatalogueStore.setState({ rowBusy: { 7: 'delete' } });

    render(<ToolRow tool={aTool({ id: 8, name: 'Untouched tool' })} />);
    expect(screen.getByRole('button', { name: /retire/i })).toBeEnabled();
  });
});

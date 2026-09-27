// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { TicketForm } from '../../src/features/tickets/components/ticket-form';
import { Badge } from '../../src/components/badge';
afterEach(cleanup);
it('shows accessible validation errors for empty fields', () => {
  render(<TicketForm />);
  fireEvent.click(screen.getByRole('button', { name: 'Create ticket' }));
  expect(screen.getByLabelText(/Ticket title/)).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(screen.getByText('Enter a title.')).toBeVisible();
  expect(screen.getByText('Describe the issue.')).toBeVisible();
});
it('renders status as readable text independent of color', () => {
  render(<Badge value="IN_PROGRESS" dot />);
  expect(screen.getByText('In progress')).toBeVisible();
});

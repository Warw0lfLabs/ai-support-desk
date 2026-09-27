// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../../src/features/tickets/components/filters', () => ({
  Filters: () => null,
}));
import { Dashboard } from '../../src/features/tickets/components/dashboard';
import type { TicketListDTO } from '../../src/features/tickets/contracts';
afterEach(cleanup);
it('identifies outdated classifications while retaining last-known badges', () => {
  const data: TicketListDTO = {
    items: [
      {
        id: '12345678',
        title: 'Synthetic billing',
        status: 'OPEN',
        version: 1,
        createdAt: '2026-09-26T10:00:00Z',
        updatedAt: '2026-09-26T10:00:00Z',
        analysis: {
          state: 'SUCCEEDED',
          category: 'BILLING',
          priority: 'MEDIUM',
          isStale: true,
        },
      },
    ],
    page: 1,
    pageSize: 20,
    totalPages: 1,
    totalItems: 1,
    stats: { total: 1, open: 1, inProgress: 0, resolved: 0 },
  };
  const view = render(<Dashboard data={data} query={new URLSearchParams()} />);
  expect(screen.getAllByText('Analysis outdated')).toHaveLength(2);
  expect(screen.getAllByText('Billing')).toHaveLength(2);
  expect(screen.getByText(/Filters use the last saved/)).toBeVisible();
  view.rerender(
    <Dashboard
      data={{
        ...data,
        items: data.items.map((t) => ({
          ...t,
          analysis: { ...t.analysis, isStale: false },
        })),
      }}
      query={new URLSearchParams()}
    />,
  );
  expect(screen.queryByText('Analysis outdated')).not.toBeInTheDocument();
});

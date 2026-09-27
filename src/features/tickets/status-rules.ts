import type { TicketStatus } from './contracts';
export const statusTransitions: Record<TicketStatus, readonly TicketStatus[]> =
  {
    OPEN: ['IN_PROGRESS', 'RESOLVED'],
    IN_PROGRESS: ['OPEN', 'RESOLVED'],
    RESOLVED: ['OPEN'],
  };
export function canTransition(from: TicketStatus, to: TicketStatus) {
  return from === to || statusTransitions[from].includes(to);
}
export const labels: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  BILLING: 'Billing',
  TECHNICAL: 'Technical',
  ACCOUNT: 'Account',
  FEATURE_REQUEST: 'Feature request',
  OTHER: 'Other',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

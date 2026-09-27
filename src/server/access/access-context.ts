import 'server-only';
// Server-created scope; callers must never accept ownership from a request body.
export type AccessContext = { kind: 'synthetic-demo' };
export function getAccessContext(): AccessContext {
  return { kind: 'synthetic-demo' };
}
export function assertDemoScope(context: AccessContext) {
  if (context.kind !== 'synthetic-demo')
    throw new Error('Unsupported access scope.');
}

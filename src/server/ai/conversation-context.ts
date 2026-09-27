import type { ConversationInput } from './provider';
// Preserve the complete opening message plus the newest contiguous suffix.
// Body limits ensure the opening and newest message always fit this budget.
export function selectConversationContext(
  title: string,
  messages: ConversationInput['messages'],
  totalMessages: number,
): ConversationInput {
  const first = messages[0];
  if (!first) throw new Error('A conversation must have an opening message.');
  let remaining = 32000 - first.body.length;
  const recent: ConversationInput['messages'] = [];
  for (const message of messages.slice(1).reverse()) {
    if (recent.length === 20 || message.body.length > remaining) break;
    recent.push({ authorRole: message.authorRole, body: message.body });
    remaining -= message.body.length;
  }
  const selected = [
    { authorRole: first.authorRole, body: first.body },
    ...recent.reverse(),
  ];
  return {
    title,
    messages: selected,
    omittedMessageCount: totalMessages - selected.length,
  };
}

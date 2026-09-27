import type { AIProvider, ConversationInput } from './provider';
import type { AnalysisResult } from '@/features/analysis/schemas';
export class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  readonly model = 'deterministic-conversation-v3';
  async analyze(input: ConversationInput): Promise<AnalysisResult> {
    const title = input.title.trim().replace(/\s+/g, ' ');
    const customers = input.messages.filter((m) => m.authorRole === 'CUSTOMER');
    const latest = customers.at(-1)?.body ?? '';
    const text =
      `${title} ${customers.map((m) => m.body).join(' ')}`.toLowerCase();
    const category = /invoice|billing|payment|refund|charged/.test(text)
      ? 'BILLING'
      : /login|password|account|access/.test(text)
        ? 'ACCOUNT'
        : /feature|suggestion|would like/.test(text)
          ? 'FEATURE_REQUEST'
          : /error|broken|crash|bug|outage|slow/.test(text)
            ? 'TECHNICAL'
            : 'OTHER';
    const priority = /outage|data loss|security breach|all users/.test(text)
      ? 'URGENT'
      : /blocked|cannot|unable|charged twice/.test(text)
        ? 'HIGH'
        : category === 'FEATURE_REQUEST'
          ? 'LOW'
          : 'MEDIUM';
    const customerText = customers.map((m) => m.body).join(' ');
    const details = `${title} ${customerText}`;
    const reference = details.match(
      /\b(?:INV|DEMO|REF)(?:[- ][A-Z0-9]+|[0-9]+)(?:-[A-Z0-9]+)*\b/i,
    )?.[0];
    const amount = details.match(
      /(?:[€$£]\s?\d+(?:[.,]\d{2})?|\b\d+(?:[.,]\d{2})?\s?(?:EUR|USD|GBP)\b)/i,
    )?.[0];
    const timing = details.match(
      /\b(?:today|yesterday|\d{4}-\d{2}-\d{2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2})\b/i,
    )?.[0];
    const errorCode = details.match(
      /\b(?:ERR_[A-Z0-9_]+|HTTP\s+[45]\d{2}|[45]\d{2}\s+error)\b/i,
    )?.[0];
    const accessError =
      errorCode ??
      details.match(
        /\b(?:invalid credentials|account locked|too many attempts|access denied|redirect loop)\b/i,
      )?.[0];
    const browser = details.match(
      /\b(?:Chrome|Firefox|Safari|Edge)(?:\s+\d+(?:\.\d+)*)?\b/i,
    )?.[0];
    const steps =
      /\b(?:after|when) (?:opening|clicking|saving|submitting|switching)|steps to reproduce/i.test(
        details,
      );
    let response: string;
    switch (category) {
      case 'BILLING': {
        const duplicate = /twice|duplicate|two identical/i.test(details);
        response = `Thank you for reporting ${duplicate ? 'the duplicate charges' : 'the billing issue'}${reference ? ` for ${reference}` : ''}${amount ? ` (${amount})` : ''}${timing ? `, reported ${timing}` : ''}. `;
        const missing = [
          !reference && 'the invoice reference',
          !timing && 'the charge date',
        ].filter(Boolean);
        response += missing.length
          ? `Please share ${missing.join(' and ')} so we can review the billing details. Do not include payment card information.`
          : 'These details give us a starting point to review the billing records and determine the next step. No payment card information is needed.';
        break;
      }
      case 'ACCOUNT':
        response =
          /expired (?:password )?reset link|(?:password )?reset link[^.!?]{0,80}expired/i.test(
            details,
          )
            ? 'The expired reset link you described may explain the access problem. Please request a new reset link and use the most recent email. Do not share passwords or verification codes.'
            : `Thank you for describing the access problem${accessError ? ` (${accessError})` : ''}${browser ? ` in ${browser}` : ''}. ${accessError || /error message/i.test(details) ? 'Please try a private browser window and tell us whether the same problem occurs.' : 'What error message appears when access fails?'} Do not share passwords or verification codes.`;
        break;
      case 'TECHNICAL':
        response = `Thank you for reporting ${errorCode ?? 'the technical issue'}${browser ? ` in ${browser}` : ''}. ${steps ? 'The reproduction steps you supplied give us a starting point for checking the behavior.' : 'Please share the steps that trigger the problem.'}${browser ? '' : ' Which browser and version are you using?'}${timing ? ` The timing you supplied (${timing}) will help narrow the review.` : ''}`;
        break;
      case 'FEATURE_REQUEST': {
        const feature = details.match(
          /\b(?:CSV export|export[^.!?]{0,45}as a CSV|keyboard shortcuts|custom (?:ticket )?categories|saved (?:ticket )?views|mobile report layout)\b/i,
        )?.[0];
        const outcome =
          /\b(?:so (?:that |we |I )|to (?:reduce|avoid|save|organize)|for (?:internal planning|monthly reports))/i.test(
            details,
          );
        response = `Thank you for ${feature ? `suggesting ${feature}` : 'describing the requested feature'}. ${outcome ? 'The workflow and intended outcome you supplied help explain its value. Which part of the proposed behavior matters most to you?' : 'How would this change improve your current workflow?'} We cannot promise a delivery date, but these details can inform a product review.`;
        break;
      }
      default:
        response =
          'Thank you for the context. What outcome would best address your question?';
    }
    const followedUp = customers.length > 1;
    // Keep the known issue in a follow-up draft; never invent a customer response.
    if (input.messages.at(-1)?.authorRole === 'SUPPORT')
      response += ' When you have an update, please let us know.';
    return {
      summary: `Customer reports: ${title}.${followedUp ? ` Latest customer update: ${latest.trim().replace(/\s+/g, ' ').slice(0, 300)}` : ''}`,
      category,
      priority,
      suggestedResponse: response,
    };
  }
}

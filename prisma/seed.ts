import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { MockAIProvider } from '../src/server/ai/mock-provider';
import { demoTickets } from './demo-data';
if (process.env.ALLOW_DEMO_SEED !== 'true')
  throw new Error(
    'Set ALLOW_DEMO_SEED=true only for a synthetic demo database.',
  );
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  const provider = new MockAIProvider();
  for (const [index, [title, description, status]] of demoTickets.entries()) {
    const id = `d0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    const createdAt = new Date(Date.UTC(2026, 8, 26, 10) - index * 3600000);
    const messages: {
      sequence: number;
      authorRole: 'CUSTOMER' | 'SUPPORT';
      body: string;
      createdAt: Date;
    }[] = [
      { sequence: 1, authorRole: 'CUSTOMER', body: description, createdAt },
    ];
    if (index < 6) {
      messages.push({
        sequence: 2,
        authorRole: 'SUPPORT',
        body: 'Thank you for reaching out. Could you share the reference or steps involved so we can understand what happened?',
        createdAt: new Date(createdAt.getTime() + 60000),
      });
      messages.push({
        sequence: 3,
        authorRole: 'CUSTOMER',
        body:
          index === 0
            ? 'The invoice reference is DEMO-2041. Both charges appeared on September 25. I have confirmed that the second charge is not pending.'
            : 'Here are the additional details: this occurs in our synthetic workspace after opening the settings page. We tried another browser and saw the same behavior.',
        createdAt: new Date(createdAt.getTime() + 120000),
      });
    }
    const analyzedVersion = index === 0 ? 2 : messages.length;
    const result = await provider.analyze({
      title,
      messages: messages.slice(0, analyzedVersion),
      omittedMessageCount: 0,
    });
    // Do not overwrite tickets an agent has already interacted with.
    await db.ticket.upsert({
      where: { id },
      update: {},
      create: {
        id,
        title,
        conversationVersion: messages.length,
        messages: { create: messages },
        status,
        createdAt,
        updatedAt: messages.at(-1)!.createdAt,
        analysis: {
          create:
            index === 21
              ? { state: 'NOT_STARTED', createdAt, updatedAt: createdAt }
              : index === 22
                ? {
                    state: 'FAILED',
                    lastErrorCode: 'AI_UNAVAILABLE',
                    createdAt,
                    updatedAt: createdAt,
                  }
                : {
                    ...result,
                    analyzedConversationVersion: analyzedVersion,
                    state: 'SUCCEEDED',
                    provider: provider.name,
                    model: provider.model,
                    createdAt,
                    updatedAt: createdAt,
                  },
        },
      },
    });
  }
  console.log(`Seeded ${demoTickets.length} deterministic synthetic tickets.`);
} finally {
  await db.$disconnect();
}

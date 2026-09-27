CREATE TYPE "MessageRole" AS ENUM ('CUSTOMER', 'SUPPORT');
ALTER TABLE "Ticket" ADD COLUMN "conversationVersion" INTEGER NOT NULL DEFAULT 1 CHECK ("conversationVersion" > 0);
ALTER TABLE "TicketAnalysis" ADD COLUMN "analyzedConversationVersion" INTEGER CHECK ("analyzedConversationVersion" > 0), ADD COLUMN "omittedMessageCount" INTEGER NOT NULL DEFAULT 0 CHECK ("omittedMessageCount" >= 0);
CREATE TABLE "TicketMessage" (
  "id" UUID NOT NULL,
  "ticketId" UUID NOT NULL,
  "sequence" INTEGER NOT NULL CHECK ("sequence" > 0),
  "authorRole" "MessageRole" NOT NULL,
  "body" VARCHAR(10000) NOT NULL CHECK (length(trim("body")) > 0),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "TicketMessage_ticketId_sequence_key" ON "TicketMessage"("ticketId", "sequence");
INSERT INTO "TicketMessage" ("id", "ticketId", "sequence", "authorRole", "body", "createdAt")
SELECT "id", "id", 1, 'CUSTOMER', "description", "createdAt" FROM "Ticket";
ALTER TABLE "Ticket" DROP COLUMN "description";

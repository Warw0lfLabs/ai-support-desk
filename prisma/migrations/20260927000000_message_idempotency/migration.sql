ALTER TABLE "TicketMessage" ADD COLUMN "clientMessageId" UUID;
CREATE UNIQUE INDEX "TicketMessage_ticketId_clientMessageId_key" ON "TicketMessage"("ticketId", "clientMessageId");

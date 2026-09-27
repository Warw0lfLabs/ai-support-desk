CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE "AnalysisState" AS ENUM ('NOT_STARTED', 'PROCESSING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "Category" AS ENUM ('BILLING', 'TECHNICAL', 'ACCOUNT', 'FEATURE_REQUEST', 'OTHER');
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TABLE "Ticket" (
  "id" UUID NOT NULL,
  "title" VARCHAR(160) NOT NULL CHECK (length(trim("title")) > 0),
  "description" VARCHAR(10000) NOT NULL CHECK (length(trim("description")) > 0),
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TicketAnalysis" (
  "ticketId" UUID NOT NULL,
  "state" "AnalysisState" NOT NULL DEFAULT 'NOT_STARTED',
  "summary" VARCHAR(600),
  "category" "Category",
  "priority" "Priority",
  "suggestedResponse" VARCHAR(4000),
  "provider" VARCHAR(80),
  "model" VARCHAR(160),
  "lastErrorCode" VARCHAR(80),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "TicketAnalysis_pkey" PRIMARY KEY ("ticketId"),
  CONSTRAINT "TicketAnalysis_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE,
  CONSTRAINT "successful_analysis_complete" CHECK (
    "state" <> 'SUCCEEDED' OR (
      "summary" IS NOT NULL AND length(trim("summary")) > 0 AND
      "category" IS NOT NULL AND "priority" IS NOT NULL AND
      "suggestedResponse" IS NOT NULL AND length(trim("suggestedResponse")) > 0
    )
  )
);
CREATE INDEX "Ticket_createdAt_id_idx" ON "Ticket"("createdAt" DESC, "id" DESC);
CREATE INDEX "Ticket_status_createdAt_id_idx" ON "Ticket"("status", "createdAt" DESC, "id" DESC);

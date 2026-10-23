ALTER TABLE "Conversation"
ADD COLUMN "communityChannelId" TEXT;

CREATE UNIQUE INDEX "Conversation_communityChannelId_key"
ON "Conversation"("communityChannelId");

CREATE TABLE "CommunityEvent" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunityEvent_channelId_startsAt_idx"
ON "CommunityEvent"("channelId", "startsAt");

ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_communityChannelId_fkey"
FOREIGN KEY ("communityChannelId") REFERENCES "Channel"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityEvent"
ADD CONSTRAINT "CommunityEvent_channelId_fkey"
FOREIGN KEY ("channelId") REFERENCES "Channel"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityEvent"
ADD CONSTRAINT "CommunityEvent_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

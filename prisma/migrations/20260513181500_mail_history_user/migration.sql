PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MailHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    CONSTRAINT "MailHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MailHistory" ("errorMessage", "id", "recipient", "sentAt", "status", "subject", "userId")
SELECT "errorMessage", "id", "recipient", "sentAt", "status", "subject", COALESCE((SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1), '')
FROM "MailHistory";
DROP TABLE "MailHistory";
ALTER TABLE "new_MailHistory" RENAME TO "MailHistory";
CREATE INDEX "MailHistory_userId_sentAt_idx" ON "MailHistory"("userId", "sentAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

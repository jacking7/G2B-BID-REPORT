/*
  Warnings:

  - Added the required column `userId` to the `CollectedResult` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CollectedResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bidNoticeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchedKeyword" TEXT,
    "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'collected',
    CONSTRAINT "CollectedResult_bidNoticeId_fkey" FOREIGN KEY ("bidNoticeId") REFERENCES "BidNotice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectedResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CollectedResult" ("bidNoticeId", "collectedAt", "emailedAt", "id", "matchedKeyword", "status") SELECT "bidNoticeId", "collectedAt", "emailedAt", "id", "matchedKeyword", "status" FROM "CollectedResult";
DROP TABLE "CollectedResult";
ALTER TABLE "new_CollectedResult" RENAME TO "CollectedResult";
CREATE INDEX "CollectedResult_userId_collectedAt_idx" ON "CollectedResult"("userId", "collectedAt");
CREATE UNIQUE INDEX "CollectedResult_bidNoticeId_userId_key" ON "CollectedResult"("bidNoticeId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

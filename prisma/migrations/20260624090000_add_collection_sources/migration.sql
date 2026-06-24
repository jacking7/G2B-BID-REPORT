-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_BidNotice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL DEFAULT 'bid_notice',
    "bidNtceNo" TEXT NOT NULL,
    "bidNtceOrd" TEXT,
    "title" TEXT NOT NULL,
    "organization" TEXT,
    "noticeDate" DATETIME,
    "closeDate" DATETIME,
    "baseAmount" REAL,
    "detailUrl" TEXT,
    "rawJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_BidNotice" (
    "baseAmount",
    "bidNtceNo",
    "bidNtceOrd",
    "closeDate",
    "createdAt",
    "detailUrl",
    "id",
    "noticeDate",
    "organization",
    "rawJson",
    "title",
    "updatedAt"
)
SELECT
    "baseAmount",
    "bidNtceNo",
    "bidNtceOrd",
    "closeDate",
    "createdAt",
    "detailUrl",
    "id",
    "noticeDate",
    "organization",
    "rawJson",
    "title",
    "updatedAt"
FROM "BidNotice";

DROP TABLE "BidNotice";
ALTER TABLE "new_BidNotice" RENAME TO "BidNotice";

CREATE UNIQUE INDEX "BidNotice_sourceType_bidNtceNo_bidNtceOrd_key" ON "BidNotice"("sourceType", "bidNtceNo", "bidNtceOrd");
CREATE INDEX "BidNotice_sourceType_idx" ON "BidNotice"("sourceType");

ALTER TABLE "ScheduleSetting" ADD COLUMN "collectBidNotices" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ScheduleSetting" ADD COLUMN "collectPreSpecs" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ScheduleSetting" ADD COLUMN "collectOrderPlans" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ScheduleSetting" ADD COLUMN "collectionMode" TEXT NOT NULL DEFAULT 'activeToday';

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

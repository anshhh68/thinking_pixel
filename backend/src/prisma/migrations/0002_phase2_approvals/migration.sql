ALTER TABLE "Job"
ADD COLUMN "clientReviewToken" TEXT,
ADD COLUMN "clientApprovalStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "clientApprovalComment" TEXT;

ALTER TABLE "Task"
ADD COLUMN "hodReviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "hodReviewComment" TEXT;

CREATE UNIQUE INDEX "Job_clientReviewToken_key" ON "Job"("clientReviewToken");

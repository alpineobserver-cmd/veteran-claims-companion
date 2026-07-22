-- Query-supported reverse relation and cleanup indexes reviewed under OPS-014.
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Answer_questionId_idx" ON "Answer"("questionId");
CREATE INDEX "AuditEvent_documentId_createdAt_idx" ON "AuditEvent"("documentId", "createdAt");
CREATE INDEX "Claim_userId_status_updatedAt_idx" ON "Claim"("userId", "status", "updatedAt");
CREATE INDEX "ClaimCondition_conditionId_idx" ON "ClaimCondition"("conditionId");
CREATE INDEX "Evidence_claimId_createdAt_idx" ON "Evidence"("claimId", "createdAt");
CREATE INDEX "Evidence_evidenceTypeId_idx" ON "Evidence"("evidenceTypeId");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Statement_claimId_idx" ON "Statement"("claimId");
CREATE INDEX "Statement_templateId_idx" ON "Statement"("templateId");
CREATE INDEX "Statement_userId_createdAt_idx" ON "Statement"("userId", "createdAt");
CREATE INDEX "Upload_evidenceId_idx" ON "Upload"("evidenceId");
CREATE INDEX "Upload_userId_createdAt_idx" ON "Upload"("userId", "createdAt");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("all reviewed foreign-key indexes remain in schema and migration",async()=>{
  const [schema,migration,review]=await Promise.all([
    readFile(path.join(process.cwd(),"prisma/schema.prisma"),"utf8"),
    readFile(path.join(process.cwd(),"prisma/migrations/20260722170000_query_supported_foreign_key_indexes/migration.sql"),"utf8"),
    readFile(path.join(process.cwd(),"docs/database-index-review-2026-07-22.md"),"utf8")
  ]);
  const names=["Account_userId_idx","Answer_questionId_idx","AuditEvent_documentId_createdAt_idx","Claim_userId_status_updatedAt_idx","ClaimCondition_conditionId_idx","Evidence_claimId_createdAt_idx","Evidence_evidenceTypeId_idx","Session_userId_idx","Statement_claimId_idx","Statement_templateId_idx","Statement_userId_createdAt_idx","Upload_evidenceId_idx","Upload_userId_createdAt_idx"];
  for(const name of names)assert.match(migration,new RegExp(name));
  for(const relation of ["Account.userId","Answer.questionId","AuditEvent.documentId","Claim.userId","ClaimCondition.conditionId","Evidence.claimId","Evidence.evidenceTypeId","Session.userId","Statement.claimId","Statement.templateId","Statement.userId","Upload.evidenceId","Upload.userId"])assert.match(review,new RegExp(relation.replace(".","\\.")));
  assert.equal((schema.match(/@@index\(/g)||[]).length>=names.length,true);
});

import { z } from "zod";

export const claimDraftSchema = z.object({
  answers: z.record(z.unknown()),
  step: z.number().int().min(0).max(30),
  furthestStep: z.number().int().min(0).max(30).optional(),
  statement: z.string().max(50_000).optional(),
  statementMode: z.enum(["", "ai", "template", "edited", "stale"]).optional(),
  timeline: z.array(z.unknown()).max(200).optional(),
  evidenceMap: z.record(z.union([z.string().max(500),z.object({status:z.enum(["record_available","personal_recollection","witness_statement","record_not_obtained","none_identified"]),source:z.string().max(500)}).strict()])).optional(),
  confirmations: z.record(z.boolean()).optional()
}).strict();

export const createClaimSchema = z.object({
  title: z.string().trim().min(1).max(160),
  progress: z.number().int().min(0).max(100),
  draft: claimDraftSchema
}).strict();

export const updateClaimSchema = createClaimSchema.extend({
  version: z.number().int().positive()
}).strict();

export const MAX_DRAFT_BYTES = 750_000;

export function draftIsWithinLimit(value: unknown) {
  return Buffer.byteLength(JSON.stringify(value), "utf8") <= MAX_DRAFT_BYTES;
}

import { z } from "zod";

const statementOriginSchema=z.object({kind:z.enum(["answer","timeline"]),label:z.string().max(200),excerpt:z.string().max(500),field:z.string().max(100).optional(),timelineEventId:z.string().max(100).optional(),factId:z.string().max(100).optional()}).strict();
export const statementProvenanceSchema=z.object({version:z.literal(1),sentences:z.array(z.object({id:z.string().max(100),sectionIndex:z.number().int().min(0).max(100),sentenceIndex:z.number().int().min(0).max(500),text:z.string().max(6000),status:z.enum(["mapped","unmapped"]),origins:z.array(statementOriginSchema).max(20)}).strict()).max(500)}).strict();
const documentCitationsSchema=z.record(z.record(z.string().trim().max(120)));

export const claimDraftSchema = z.object({
  answers: z.record(z.unknown()),
  step: z.number().int().min(0).max(30),
  furthestStep: z.number().int().min(0).max(30).optional(),
  statement: z.string().max(50_000).optional(),
  statementMode: z.enum(["", "ai", "template", "edited", "stale"]).optional(),
  statementProvenance: statementProvenanceSchema.optional(),
  timeline: z.array(z.unknown()).max(200).optional(),
  evidenceMap: z.record(z.union([z.string().max(500),z.object({status:z.enum(["record_available","personal_recollection","witness_statement","record_not_obtained","none_identified"]),source:z.string().max(500)}).strict()])).optional(),
  confirmations: z.record(z.boolean()).optional(),
  documentLinks: z.record(z.array(z.string().max(100)).max(20)).optional(),
  documentCitations: documentCitationsSchema.optional(),
  statementVersions: z.array(z.object({id:z.string().max(100),content:z.string().max(50_000),mode:z.enum(["ai","template","edited"]),createdAt:z.string().datetime(),provenance:statementProvenanceSchema.optional()}).strict()).max(20).optional(),
  packageStatus: z.enum(["planned","requested","obtained","reviewed","exported","submitted"]).optional(),
  packageStatusUpdatedAt: z.string().datetime().optional(),
  packageExportedAt: z.string().datetime().optional(),
  packageSubmittedAt: z.string().datetime().optional(),
  buddyStatements: z.array(z.object({id:z.string().max(100),witnessName:z.string().max(120),relationship:z.string().max(300),knownSince:z.string().max(300),observations:z.string().max(6000),specificExample:z.string().max(6000),changes:z.string().max(6000),statement:z.string().max(50_000),createdAt:z.string().datetime(),updatedAt:z.string().datetime()}).strict()).max(10).optional()
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

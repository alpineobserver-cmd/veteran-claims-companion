import assert from "node:assert/strict";
import test from "node:test";
import { conditions } from "../lib/conditions";
import { vaForms } from "../lib/va-forms";
import { contentProvenanceRecords, contentSha256 } from "../lib/content-provenance";

test("every published condition and form has reproducible provenance",()=>{
  assert.equal(contentProvenanceRecords.length,conditions.length+vaForms.length);
  assert.equal(new Set(contentProvenanceRecords.map(record=>record.id)).size,contentProvenanceRecords.length);
  for(const record of contentProvenanceRecords){assert.match(record.localRecordSha256,/^[a-f0-9]{64}$/);assert.match(record.authorityUrl,/^https:\/\//);assert.ok(record.lastVerified&&record.contentVersion&&record.hashScope);}
  assert.equal(contentSha256({b:2,a:1}),contentSha256({a:1,b:2}));
});

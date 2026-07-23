import assert from "node:assert/strict";
import test from "node:test";
import { getFormAgency, getFormLabel, getVAForm, getVAFormDownload, vaForms } from "../lib/va-forms";

test("every published form has a matching official destination",()=>{
  for(const form of vaForms){
    const download=getVAFormDownload(form.slug);
    assert.ok(download,`${form.slug} is missing a download destination`);
    assert.match(form.officialUrl,/^https:\/\//);
    assert.match(download.url,/^https:\/\//);
  }
});

test("DD Form 2860 is presented as a DoD CRSC application",()=>{
  const form=getVAForm("dd-2860");
  assert.ok(form);
  assert.equal(getFormAgency(form),"DoD");
  assert.equal(getFormLabel(form),"DD Form 2860");
  assert.match(form.name,/Combat-Related Special Compensation/);
  assert.match(form.whenToUse,/branch of service/);
  assert.match(form.whenToUse,/not a VA disability claim/i);
  assert.match(form.officialUrl,/^https:\/\/www\.esd\.whs\.mil\//);
  assert.match(getVAFormDownload(form.slug)?.url||"",/^https:\/\/www\.esd\.whs\.mil\/.*dd2860\.pdf$/);
});

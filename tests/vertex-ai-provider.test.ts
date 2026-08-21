import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { personalStatementProviderConfiguration, personalStatementResultSchema, personalStatementTokenReservation } from "../lib/ai/personal-statement-provider";

const managedKeys=["DEBRIEF_AI_PROVIDER","DEBRIEF_AI_MODEL","DEBRIEF_AI_FICTIONAL_DATA_ONLY","GOOGLE_VERTEX_LOCATION","GCP_AUTH_MODE","GCS_AUTH_MODE","GCP_PROJECT_ID","GCP_PROJECT_NUMBER","GCP_SERVICE_ACCOUNT_EMAIL","GCP_WORKLOAD_IDENTITY_POOL_ID","GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID"] as const;

function withEnvironment(values:Partial<Record<(typeof managedKeys)[number],string>>,run:()=>void){
  const prior=Object.fromEntries(managedKeys.map(key=>[key,process.env[key]]));
  for(const key of managedKeys)delete process.env[key];
  Object.assign(process.env,values);
  try{run()}finally{for(const key of managedKeys){const value=prior[key];if(value===undefined)delete process.env[key];else process.env[key]=value}}
}

test("Vertex provider configuration fails closed unless the fictional-data and identity boundaries are complete",()=>{
  withEnvironment({},()=>assert.equal(personalStatementProviderConfiguration().provider,"disabled"));
  withEnvironment({DEBRIEF_AI_PROVIDER:"vertex",DEBRIEF_AI_MODEL:"gemini-3.7-flash",GOOGLE_VERTEX_LOCATION:"global",GCP_PROJECT_ID:"fictional-project",GCS_AUTH_MODE:"application-default"},()=>{
    const configuration=personalStatementProviderConfiguration();
    assert.equal(configuration.configured,false);
    assert.match(configuration.reason||"",/fictional-data-only/);
  });
  withEnvironment({DEBRIEF_AI_PROVIDER:"vertex",DEBRIEF_AI_MODEL:"gemini-3.7-flash",GOOGLE_VERTEX_LOCATION:"global",DEBRIEF_AI_FICTIONAL_DATA_ONLY:"true",GCP_PROJECT_ID:"fictional-project",GCS_AUTH_MODE:"vercel-oidc",GCP_PROJECT_NUMBER:"123456789",GCP_SERVICE_ACCOUNT_EMAIL:"fictional-runtime@fictional-project.iam.gserviceaccount.com",GCP_WORKLOAD_IDENTITY_POOL_ID:"vercel-staging",GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID:"vercel"},()=>{
    const configuration=personalStatementProviderConfiguration();
    assert.equal(configuration.configured,true);
    assert.equal(configuration.provider,"vertex");
    assert.equal(configuration.model,"gemini-3.7-flash");
    assert.equal(configuration.fictionalDataOnly,true);
  });
});

test("personal statement provider enforces structured output and conservative token reservation",()=>{
  const ready=personalStatementResultSchema.parse({status:"ready",statement:"Fictional draft.",questions:[]});
  assert.equal(ready.status,"ready");
  assert.throws(()=>personalStatementResultSchema.parse({status:"ready",statement:"Fictional draft.",questions:[],extra:"not allowed"}));
  const short=personalStatementTokenReservation({condition:"Fictional knee condition"},"Use supplied facts only.",1000);
  const long=personalStatementTokenReservation({condition:"Fictional knee condition",symptoms:"Fictional pain ".repeat(100)},"Use supplied facts only.",1000);
  assert.ok(short>1000);
  assert.ok(long>short);
});

test("Vertex integration is keyless, server-side, structured, and excludes the optional display name",async()=>{
  const root=process.cwd();
  const [provider,route,ui]=await Promise.all([
    readFile(path.join(root,"lib/ai/personal-statement-provider.ts"),"utf8"),
    readFile(path.join(root,"app/api/ai/personal-statement/route.ts"),"utf8"),
    readFile(path.join(root,"components/claim-questionnaire.tsx"),"utf8")
  ]);
  assert.match(provider,/createGoogleCloudExternalAccountClient/);
  assert.match(provider,/Output\.object/);
  assert.doesNotMatch(provider,/API_KEY|private_key|OPENAI/);
  assert.match(route,/filter\(\(\[key\]\)=>key!=="statementName"\)/);
  assert.match(ui,/Google Vertex AI/);
  assert.match(ui,/I have not entered real personal or medical information/);
});

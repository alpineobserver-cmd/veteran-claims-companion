const allowed=new Set(["development","preview","staging","production"]);
const canonicalProductionHost="debriefclaims.com";
const inferred=process.env.VERCEL_ENV==="production"?"production":process.env.VERCEL_ENV==="preview"?"preview":"development";
const appEnvironment=(process.env.APP_ENV||inferred).trim().toLowerCase();
const dataEnvironment=process.env.DATA_ENVIRONMENT?.trim().toLowerCase();
const problems=[];
const operationalControls=["DEBRIEF_UPLOADS_ENABLED","DEBRIEF_AI_GENERATION_ENABLED","DEBRIEF_REGISTRATIONS_ENABLED","DEBRIEF_GOOGLE_LOGIN_ENABLED","DEBRIEF_MALWARE_SCANNING_ENABLED","DEBRIEF_REAL_DOCUMENTS_ENABLED"];
const operationalValues=new Set(["0","1","false","true","off","on","disabled","enabled","pause","paused"]);
const boundedIntegerControls=[["DEBRIEF_AI_DAILY_USER_LIMIT",500],["DEBRIEF_AI_DAILY_GLOBAL_LIMIT",5000],["DEBRIEF_AI_DAILY_USER_TOKEN_LIMIT",10_000_000],["DEBRIEF_AI_DAILY_GLOBAL_TOKEN_LIMIT",100_000_000],["DEBRIEF_AI_DAILY_SPEND_CAP_CENTS",100_000],["DEBRIEF_AI_MAX_REQUEST_COST_CENTS",10_000],["DEBRIEF_AI_MAX_OUTPUT_TOKENS",8_000]];
const aiPolicyVersions=new Set(["personal-statement-v0","personal-statement-v1"]);
const storageProviders=new Set(["gcs","google-cloud-storage","vercel","blob","vercel-private-blob","local","local-synthetic"]);
const storageProvider=process.env.DOCUMENT_STORAGE_PROVIDER?.trim().toLowerCase();
const malwareScanningEnabled=["1","true","on","enabled"].includes(process.env.DEBRIEF_MALWARE_SCANNING_ENABLED?.trim().toLowerCase());
const realDocumentsEnabled=["1","true","on","enabled"].includes(process.env.DEBRIEF_REAL_DOCUMENTS_ENABLED?.trim().toLowerCase());
const vercelGitRef=process.env.VERCEL_GIT_COMMIT_REF?.trim();
const vercelGitSha=process.env.VERCEL_GIT_COMMIT_SHA?.trim();
const googleMfaMode=(process.env.DEBRIEF_GOOGLE_MFA_ENFORCEMENT||"disabled").trim().toLowerCase();

if(!allowed.has(appEnvironment))problems.push("APP_ENV must be development, preview, staging, or production.");
if(dataEnvironment&&!allowed.has(dataEnvironment))problems.push("DATA_ENVIRONMENT must be development, preview, staging, or production.");
if(!new Set(["disabled","audit","enforced"]).has(googleMfaMode))problems.push("DEBRIEF_GOOGLE_MFA_ENFORCEMENT must be disabled, audit, or enforced.");

if(appEnvironment==="staging"){
  if(dataEnvironment!=="staging")problems.push("Staging requires DATA_ENVIRONMENT=staging so its data boundary is explicit.");
  if((process.env.CRON_SECRET||"").trim().length<32)problems.push("Staging requires a CRON_SECRET of at least 32 characters for the private database liveness check.");
  if(process.env.AUTH_CANONICAL_HOST===canonicalProductionHost)problems.push("Staging must not use the Production canonical authentication host.");
  if(process.env.AUTH_URL){
    try{
      const authUrl=new URL(process.env.AUTH_URL);
      if(authUrl.protocol!=="https:")problems.push("Staging AUTH_URL must use HTTPS.");
      if(authUrl.hostname===canonicalProductionHost)problems.push("Staging AUTH_URL must not use the Production origin.");
    }catch{problems.push("Staging AUTH_URL is not a valid URL.");}
  }
}

if(appEnvironment==="production"&&dataEnvironment&&dataEnvironment!=="production"){
  problems.push("Production must use DATA_ENVIRONMENT=production.");
}

if(process.env.VERCEL_ENV==="production"&&["staging","production"].includes(appEnvironment)){
  const expectedRef=appEnvironment==="staging"?"staging":"main";
  if(vercelGitRef!==expectedRef)problems.push(`${appEnvironment} Vercel releases must be built from the ${expectedRef} branch.`);
  if(!/^[a-f0-9]{40}$/i.test(vercelGitSha||""))problems.push(`${appEnvironment} Vercel releases must record a full Git commit SHA.`);
}

if(storageProvider&&!storageProviders.has(storageProvider))problems.push("DOCUMENT_STORAGE_PROVIDER must be gcs, vercel, or local.");
if(["staging","production"].includes(appEnvironment)&&["local","local-synthetic"].includes(storageProvider||""))problems.push("Hosted environments cannot use local document storage.");
if(["gcs","google-cloud-storage"].includes(storageProvider||"")){
  for(const key of ["GCS_BUCKET","GCP_PROJECT_ID","GCP_PROJECT_NUMBER","GCP_SERVICE_ACCOUNT_EMAIL","GCP_WORKLOAD_IDENTITY_POOL_ID","GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID"]){
    if(!process.env[key]?.trim())problems.push(`Google Cloud Storage requires ${key}.`);
  }
  if(["staging","production"].includes(appEnvironment)&&process.env.GCS_AUTH_MODE?.trim().toLowerCase()!=="vercel-oidc")problems.push("Hosted Google Cloud Storage requires GCS_AUTH_MODE=vercel-oidc.");
}

if(realDocumentsEnabled&&!malwareScanningEnabled)problems.push("DEBRIEF_REAL_DOCUMENTS_ENABLED requires DEBRIEF_MALWARE_SCANNING_ENABLED.");
if(malwareScanningEnabled){
  if(storageProvider!=="gcs")problems.push("Malware scanning requires DOCUMENT_STORAGE_PROVIDER=gcs.");
  for(const key of ["GCS_QUARANTINE_BUCKET","GCS_CLEAN_BUCKET","DOCUMENT_SCAN_CALLBACK_SECRET"]){
    if(!process.env[key]?.trim())problems.push(`Malware scanning requires ${key}.`);
  }
  if((process.env.DEBRIEF_SCAN_PROVIDER||"clamav").trim().toLowerCase()!=="clamav")problems.push("DEBRIEF_SCAN_PROVIDER must be clamav.");
  if((process.env.DOCUMENT_SCAN_CALLBACK_SECRET||"").trim().length<32)problems.push("DOCUMENT_SCAN_CALLBACK_SECRET must be at least 32 characters.");
}

for(const key of operationalControls){
  const value=process.env[key]?.trim().toLowerCase();
  if(["staging","production"].includes(appEnvironment)&&!value)problems.push(`${key} must be explicitly set for hosted deployments.`);
  if(value&&!operationalValues.has(value))problems.push(`${key} must use an explicit enabled or disabled value.`);
}

for(const [key,max] of boundedIntegerControls){
  const raw=process.env[key]?.trim();
  if(!raw)continue;
  const value=Number(raw);
  if(!Number.isSafeInteger(value)||value<1||value>max)problems.push(`${key} must be a whole number from 1 through ${max}.`);
}
const aiControl=process.env.DEBRIEF_AI_GENERATION_ENABLED?.trim().toLowerCase()||"";
const aiEnabled=!["0","false","off","disabled","pause","paused"].includes(aiControl);
if(aiEnabled&&process.env.OPENAI_API_KEY){
  for(const key of ["DEBRIEF_AI_DAILY_SPEND_CAP_CENTS","DEBRIEF_AI_MAX_REQUEST_COST_CENTS"]){
    if(!process.env[key]?.trim())problems.push(`Paid AI generation requires an explicit ${key} cost boundary.`);
  }
  const dailyCap=Number(process.env.DEBRIEF_AI_DAILY_SPEND_CAP_CENTS);
  const requestCap=Number(process.env.DEBRIEF_AI_MAX_REQUEST_COST_CENTS);
  if(Number.isSafeInteger(dailyCap)&&Number.isSafeInteger(requestCap)&&requestCap>dailyCap)problems.push("DEBRIEF_AI_MAX_REQUEST_COST_CENTS cannot exceed DEBRIEF_AI_DAILY_SPEND_CAP_CENTS.");
}
if(process.env.DEBRIEF_AI_POLICY_VERSION&&!aiPolicyVersions.has(process.env.DEBRIEF_AI_POLICY_VERSION.trim()))problems.push("DEBRIEF_AI_POLICY_VERSION must identify an evaluated policy version.");

if(problems.length){
  console.error("Deployment environment validation failed:");
  for(const problem of problems)console.error(`- ${problem}`);
  console.error("Secret values were not printed.");
  process.exit(1);
}

const dataLabel=dataEnvironment||"not explicitly labeled";
console.log(`Deployment environment validated: application=${appEnvironment}; data=${dataLabel}. Secret values were not printed.`);

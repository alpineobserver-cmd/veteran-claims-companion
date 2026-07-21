const allowed=new Set(["development","preview","staging","production"]);
const canonicalProductionHost="veteran-claims-companion.vercel.app";
const inferred=process.env.VERCEL_ENV==="production"?"production":process.env.VERCEL_ENV==="preview"?"preview":"development";
const appEnvironment=(process.env.APP_ENV||inferred).trim().toLowerCase();
const dataEnvironment=process.env.DATA_ENVIRONMENT?.trim().toLowerCase();
const problems=[];
const operationalControls=["DEBRIEF_UPLOADS_ENABLED","DEBRIEF_AI_GENERATION_ENABLED","DEBRIEF_REGISTRATIONS_ENABLED"];
const operationalValues=new Set(["0","1","false","true","off","on","disabled","enabled","pause","paused"]);

if(!allowed.has(appEnvironment))problems.push("APP_ENV must be development, preview, staging, or production.");
if(dataEnvironment&&!allowed.has(dataEnvironment))problems.push("DATA_ENVIRONMENT must be development, preview, staging, or production.");

if(appEnvironment==="staging"){
  if(dataEnvironment!=="staging")problems.push("Staging requires DATA_ENVIRONMENT=staging so its data boundary is explicit.");
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

for(const key of operationalControls){
  const value=process.env[key]?.trim().toLowerCase();
  if(value&&!operationalValues.has(value))problems.push(`${key} must use an explicit enabled or disabled value.`);
}

if(problems.length){
  console.error("Deployment environment validation failed:");
  for(const problem of problems)console.error(`- ${problem}`);
  console.error("Secret values were not printed.");
  process.exit(1);
}

const dataLabel=dataEnvironment||"not explicitly labeled";
console.log(`Deployment environment validated: application=${appEnvironment}; data=${dataLabel}. Secret values were not printed.`);

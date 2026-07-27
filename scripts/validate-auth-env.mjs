const isProduction=process.env.VERCEL_ENV==="production";

if(!isProduction){
  console.log("Auth environment check skipped outside Vercel Production.");
  process.exit(0);
}

const canonicalHost=process.env.AUTH_CANONICAL_HOST||"debriefclaims.com";
const problems=[];

for(const key of ["AUTH_SECRET","AUTH_GOOGLE_ID","AUTH_GOOGLE_SECRET","AUTH_URL"]){
  if(!process.env[key]?.trim())problems.push(`${key} is missing from the Production environment.`);
}

const secret=process.env.AUTH_SECRET?.trim()||"";
if(secret&&secret.length<32)problems.push("AUTH_SECRET must contain at least 32 characters.");
if(/replace|example|your-|changeme/i.test(secret))problems.push("AUTH_SECRET still appears to contain a placeholder value.");

if(process.env.AUTH_URL){
  try{
    const authUrl=new URL(process.env.AUTH_URL);
    if(authUrl.protocol!=="https:")problems.push("AUTH_URL must use HTTPS in Production.");
    if(authUrl.hostname!==canonicalHost)problems.push(`AUTH_URL must use the canonical host ${canonicalHost}.`);
    if(authUrl.pathname!=="/"||authUrl.search||authUrl.hash)problems.push("AUTH_URL must contain only the canonical origin, without a path, query, or fragment.");
  }catch{
    problems.push("AUTH_URL is not a valid URL.");
  }
}

if(problems.length){
  console.error("Production authentication environment validation failed:");
  for(const problem of problems)console.error(`- ${problem}`);
  console.error("Secret values were not printed.");
  process.exit(1);
}

console.log(`Production authentication environment validated for ${canonicalHost}. Secret values were not printed.`);

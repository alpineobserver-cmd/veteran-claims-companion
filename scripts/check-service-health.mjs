const rawBase=process.env.HEALTHCHECK_BASE_URL||process.argv[2];
if(!rawBase)throw new Error("Set HEALTHCHECK_BASE_URL or pass the public origin as the first argument.");
const base=new URL(rawBase);
if(base.protocol!=="https:"&&!(["localhost","127.0.0.1"].includes(base.hostname)))throw new Error("Health checks require HTTPS except on localhost.");
base.pathname="/";base.search="";base.hash="";
const threshold=Number(process.env.HEALTHCHECK_MAX_MS||5000);
if(!Number.isSafeInteger(threshold)||threshold<250||threshold>30000)throw new Error("HEALTHCHECK_MAX_MS must be a whole number from 250 through 30000.");
const checks=[{route:"/",kind:"availability"},{route:"/login",kind:"availability"},{route:"/api/health",kind:"liveness"},{route:"/api/auth/providers",kind:"authentication"},{route:"/api/auth/session",kind:"authentication"}];
let failed=false;
for(const check of checks){
  const started=performance.now();const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch(new URL(check.route,base),{redirect:"follow",signal:controller.signal,headers:{"User-Agent":"Debrief-Health-Check/1.0"}});const elapsed=Math.round(performance.now()-started);let valid=response.ok;
    if(valid&&check.route==="/api/health"){const body=await response.json();valid=body?.status==="ok"&&body?.service==="debrief";}
    if(valid&&check.route==="/api/auth/providers"){const body=await response.json();valid=Boolean(body?.google?.signinUrl);}
    if(valid&&check.route==="/api/auth/session")await response.json();
    const withinThreshold=elapsed<=threshold;console.log(JSON.stringify({timestamp:new Date().toISOString(),source:"debrief-synthetic-health",target:base.hostname,route:check.route,kind:check.kind,status:response.status,latencyMs:elapsed,result:valid&&withinThreshold?"pass":valid?"slow":"fail"}));if(!valid||!withinThreshold)failed=true;
  }catch(error){console.error(JSON.stringify({timestamp:new Date().toISOString(),source:"debrief-synthetic-health",target:base.hostname,route:check.route,kind:check.kind,status:0,latencyMs:Math.round(performance.now()-started),result:"fail",code:error instanceof Error?error.name:"UnknownError"}));failed=true;}finally{clearTimeout(timer);}
}
if(failed)process.exitCode=1;

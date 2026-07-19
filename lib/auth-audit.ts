type AuthAuditDetails={
  code?:string;
  provider?:string;
  isNewUser?:boolean;
};

function safeToken(value:unknown,fallback="unknown"){
  if(typeof value!=="string")return fallback;
  const normalized=value.replace(/[^a-zA-Z0-9_.-]/g,"_").slice(0,80);
  return normalized||fallback;
}

export function logAuthEvent(event:string,details:AuthAuditDetails={}){
  const record={
    timestamp:new Date().toISOString(),
    event:safeToken(event),
    ...(details.code?{code:safeToken(details.code)}:{}),
    ...(details.provider?{provider:safeToken(details.provider)}:{}),
    ...(typeof details.isNewUser==="boolean"?{isNewUser:details.isNewUser}:{})
  };
  console.info(`[auth-audit] ${JSON.stringify(record)}`);
}

function authErrorCode(error:Error){
  const candidate=error as Error&{type?:unknown};
  return safeToken(candidate.type??candidate.name,"AuthError");
}

export const authAuditLogger={
  error(error:Error){
    const record={timestamp:new Date().toISOString(),event:"auth_error",code:authErrorCode(error)};
    console.error(`[auth-audit] ${JSON.stringify(record)}`);
  },
  warn(code:unknown){
    const record={timestamp:new Date().toISOString(),event:"auth_warning",code:safeToken(code,"AuthWarning")};
    console.warn(`[auth-audit] ${JSON.stringify(record)}`);
  },
  debug(){
    // Auth.js debug metadata can contain transient tokens and is intentionally suppressed.
  }
};

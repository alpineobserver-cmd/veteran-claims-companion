export const securityEventNames=[
  "sign_in_started","sign_in_succeeded","sign_out_succeeded","sign_in_blocked","auth_error","auth_warning",
  "rate_limit_exceeded","rate_limit_cleanup_failed","rate_limit_backend_failed",
  "storage_reconciliation_pending","storage_reconciliation_record_failed","storage_reconciliation_resolution_failed","storage_reconciliation_retry_query_failed","storage_reconciliation_retry_failed",
  "account_object_deletion_failed","account_database_deletion_failed","claim_object_cleanup_failed","claim_database_cleanup_failed",
  "document_download_failed","document_ticket_failed","document_object_deletion_failed","document_database_deletion_failed","document_upload_failed",
  "ai_generation_failed"
] as const;

export type SecurityEventName=(typeof securityEventNames)[number];
export type SecurityEventLevel="info"|"warn"|"error";
export type SecurityEventDetails={
  code?:unknown;
  provider?:unknown;
  isNewUser?:unknown;
  operation?:unknown;
  scope?:unknown;
  retryAfterSeconds?:unknown;
};

const safeTokenPattern=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/;

export function securityEventToken(value:unknown,fallback="redacted"){
  return typeof value==="string"&&safeTokenPattern.test(value)?value:fallback;
}

export function securityEventErrorCode(reason:unknown){
  const candidate=reason instanceof Error?reason.name:typeof reason==="string"?reason:"UnknownError";
  return securityEventToken(candidate,"UnknownError");
}

export function securityEventRecord(event:SecurityEventName,details:SecurityEventDetails={},now=new Date()){
  const record:Record<string,string|number|boolean>={
    timestamp:now.toISOString(),
    source:"debrief-security",
    environment:securityEventToken(process.env.DATA_ENVIRONMENT||process.env.APP_ENV||"unknown","unknown"),
    release:securityEventToken(process.env.RELEASE_ID||process.env.VERCEL_GIT_COMMIT_SHA||"unknown","unknown"),
    event
  };
  if(details.code!==undefined)record.code=securityEventToken(details.code);
  if(details.provider!==undefined)record.provider=securityEventToken(details.provider);
  if(typeof details.isNewUser==="boolean")record.isNewUser=details.isNewUser;
  if(details.operation!==undefined)record.operation=securityEventToken(details.operation);
  if(details.scope!==undefined)record.scope=securityEventToken(details.scope);
  if(typeof details.retryAfterSeconds==="number"&&Number.isSafeInteger(details.retryAfterSeconds)&&details.retryAfterSeconds>=0&&details.retryAfterSeconds<=604_800)record.retryAfterSeconds=details.retryAfterSeconds;
  return record;
}

export function emitSecurityEvent(event:SecurityEventName,details:SecurityEventDetails={},level:SecurityEventLevel="warn"){
  const serialized=JSON.stringify(securityEventRecord(event,details));
  if(level==="error")console.error(serialized);
  else if(level==="info")console.info(serialized);
  else console.warn(serialized);
}

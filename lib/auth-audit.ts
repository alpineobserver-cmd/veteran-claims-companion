import { emitSecurityEvent, securityEventErrorCode, securityEventToken, type SecurityEventName } from "@/lib/security-events";

type AuthAuditDetails={
  code?:string;
  provider?:string;
  isNewUser?:boolean;
};

type AuthAuditEventName=Extract<SecurityEventName,"sign_in_started"|"sign_in_succeeded"|"sign_out_succeeded"|"sign_in_blocked">;

export function logAuthEvent(event:AuthAuditEventName,details:AuthAuditDetails={}){
  emitSecurityEvent(event,{code:details.code,provider:details.provider,isNewUser:details.isNewUser},"info");
}

export const authAuditLogger={
  error(error:Error){
    const candidate=error as Error&{type?:unknown};
    emitSecurityEvent("auth_error",{code:securityEventToken(candidate.type,securityEventErrorCode(error))},"error");
  },
  warn(code:unknown){
    emitSecurityEvent("auth_warning",{code:securityEventToken(code,"AuthWarning")},"warn");
  },
  debug(){
    // Auth.js debug metadata can contain transient tokens and is intentionally suppressed.
  }
};

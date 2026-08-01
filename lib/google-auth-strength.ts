export type GoogleMfaMode="disabled"|"audit"|"enforced";

export const googleAuthenticationClaims={id_token:{amr:{essential:true},auth_time:{essential:true}}};

export function googleMfaMode(value=process.env.DEBRIEF_GOOGLE_MFA_ENFORCEMENT):GoogleMfaMode{
  return value==="audit"||value==="enforced"?value:"disabled";
}

export function googleAuthenticationMethods(profile:unknown){
  if(!profile||typeof profile!=="object"||!("amr" in profile))return [];
  const amr=(profile as {amr?:unknown}).amr;
  return Array.isArray(amr)?amr.filter((value):value is string=>typeof value==="string"):[];
}

export function googleMfaSatisfied(profile:unknown){
  const methods=new Set(googleAuthenticationMethods(profile));
  return methods.has("mfa")||methods.has("hwk")||methods.has("swk");
}

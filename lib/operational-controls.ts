const falseValues=new Set(["0","false","off","disabled","pause","paused"]);
const trueValues=new Set(["1","true","on","enabled"]);

export const operationalControlNames=["DEBRIEF_UPLOADS_ENABLED","DEBRIEF_AI_GENERATION_ENABLED","DEBRIEF_REGISTRATIONS_ENABLED","DEBRIEF_GOOGLE_LOGIN_ENABLED"] as const;
export type OperationalControlName=(typeof operationalControlNames)[number];

export function parseOperationalControl(value:string|undefined,defaultValue=process.env.APP_ENV!=="production"){
  if(value===undefined||!value.trim())return defaultValue;
  const normalized=value.trim().toLowerCase();
  if(trueValues.has(normalized))return true;
  if(falseValues.has(normalized))return false;
  return false;
}

export function isOperationalControlValue(value:string|undefined){
  if(value===undefined||!value.trim())return true;
  const normalized=value.trim().toLowerCase();
  return trueValues.has(normalized)||falseValues.has(normalized);
}

export function uploadsEnabled(){return parseOperationalControl(process.env.DEBRIEF_UPLOADS_ENABLED)}
export function aiGenerationEnabled(){return parseOperationalControl(process.env.DEBRIEF_AI_GENERATION_ENABLED)}
export function registrationsEnabled(){return parseOperationalControl(process.env.DEBRIEF_REGISTRATIONS_ENABLED)}
// Keep the current login path available unless an administrator explicitly
// pauses it. This is an emergency credential-rotation control, not a rollout
// flag, so a missing variable must not lock established users out.
export function googleLoginEnabled(){return parseOperationalControl(process.env.DEBRIEF_GOOGLE_LOGIN_ENABLED,true)}

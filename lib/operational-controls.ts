const falseValues=new Set(["0","false","off","disabled","pause","paused"]);
const trueValues=new Set(["1","true","on","enabled"]);

export const operationalControlNames=["DEBRIEF_UPLOADS_ENABLED","DEBRIEF_AI_GENERATION_ENABLED","DEBRIEF_REGISTRATIONS_ENABLED"] as const;
export type OperationalControlName=(typeof operationalControlNames)[number];

export function parseOperationalControl(value:string|undefined,defaultValue=true){
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

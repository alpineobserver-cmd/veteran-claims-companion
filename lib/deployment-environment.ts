export type DeploymentEnvironment="development"|"preview"|"staging"|"production";

type DeploymentSource=Record<string,string|undefined>;

const environmentLabels:Record<DeploymentEnvironment,string>={
  development:"Local development",
  preview:"Feature preview",
  staging:"Debrief staging",
  production:"Debrief production",
};

function normalizeEnvironment(value:string|undefined):DeploymentEnvironment|undefined{
  const normalized=value?.trim().toLowerCase();
  if(normalized==="development"||normalized==="preview"||normalized==="staging"||normalized==="production")return normalized;
  return undefined;
}

function safeRelease(value:string|undefined){
  const release=value?.trim().replace(/[^a-zA-Z0-9._-]/g,"").slice(0,24);
  return release||"local";
}

export function getDeploymentIdentity(source:DeploymentSource=process.env){
  const explicit=normalizeEnvironment(source.APP_ENV);
  const environment=explicit??(source.VERCEL_ENV==="production"?"production":source.VERCEL_ENV==="preview"?"preview":"development");
  const release=safeRelease(source.RELEASE_ID||source.VERCEL_GIT_COMMIT_SHA?.slice(0,7));
  return {environment,label:environmentLabels[environment],release};
}

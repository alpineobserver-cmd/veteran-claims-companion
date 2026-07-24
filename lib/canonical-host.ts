export const DEFAULT_CANONICAL_ALPHA_HOST="debriefclaims.com";

type CanonicalRedirectInput={
  requestUrl:URL;
  requestHost?:string|null;
  vercelEnvironment?:string;
  canonicalHost?:string;
};

export function getCanonicalRedirect({requestUrl,requestHost,vercelEnvironment,canonicalHost=DEFAULT_CANONICAL_ALPHA_HOST}:CanonicalRedirectInput){
  if(vercelEnvironment!=="production"||!requestHost)return null;
  const normalizedRequestHost=requestHost.split(",")[0]?.trim().split(":")[0]?.toLowerCase();
  const normalizedCanonicalHost=canonicalHost.trim().toLowerCase();
  if(!normalizedRequestHost||normalizedRequestHost===normalizedCanonicalHost)return null;
  const canonical=new URL(requestUrl);
  canonical.protocol="https:";
  canonical.host=normalizedCanonicalHost;
  canonical.port="";
  return canonical;
}

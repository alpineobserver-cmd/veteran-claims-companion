import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient, type BaseExternalAccountClient } from "google-auth-library";

export class GoogleCloudAuthConfigurationError extends Error {}

const applicationDefaultModes=new Set(["application-default","adc"]);
const workloadIdentityModes=new Set(["vercel-oidc","workload-identity"]);

function required(name:string){
  const value=process.env[name]?.trim();
  if(!value)throw new GoogleCloudAuthConfigurationError(`Google Cloud authentication requires ${name}.`);
  return value;
}

export function googleCloudAuthMode(){
  return (process.env.GCP_AUTH_MODE||process.env.GCS_AUTH_MODE||((process.env.VERCEL||process.env.VERCEL_OIDC_TOKEN)?"vercel-oidc":"application-default")).trim().toLowerCase();
}

export function createGoogleCloudExternalAccountClient(scopes:readonly string[]):BaseExternalAccountClient|undefined{
  const mode=googleCloudAuthMode();
  if(applicationDefaultModes.has(mode))return undefined;
  if(!workloadIdentityModes.has(mode))throw new GoogleCloudAuthConfigurationError("GCP_AUTH_MODE must be application-default or vercel-oidc.");
  const projectNumber=required("GCP_PROJECT_NUMBER");
  const poolId=required("GCP_WORKLOAD_IDENTITY_POOL_ID");
  const providerId=required("GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID");
  const serviceAccountEmail=required("GCP_SERVICE_ACCOUNT_EMAIL");
  const client=ExternalAccountClient.fromJSON({
    type:"external_account",
    audience:`//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type:"urn:ietf:params:oauth:token-type:jwt",
    token_url:"https://sts.googleapis.com/v1/token",
    service_account_impersonation_url:`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
    scopes:[...scopes],
    subject_token_supplier:{getSubjectToken:()=>getVercelOidcToken()},
  });
  if(!client)throw new GoogleCloudAuthConfigurationError("Google Cloud workload identity configuration is invalid.");
  return client;
}

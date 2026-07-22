import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Storage as GoogleStorage } from "@google-cloud/storage";
import { del as deleteBlob, get as getBlob, put as putBlob } from "@vercel/blob";
import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library";

export type StoredFile={data:Buffer;contentType?:string};

export interface StorageProvider {
  readonly name:string;
  put(file:Buffer,key:string,mimeType:string):Promise<{key:string}>;
  get(key:string):Promise<StoredFile|null>;
  delete(key:string):Promise<void>;
}

export const storageProviderNames={local:"local-synthetic",vercel:"vercel-private-blob",google:"google-cloud-storage"} as const;
export type StorageProviderName=typeof storageProviderNames[keyof typeof storageProviderNames];
export class StorageConfigurationError extends Error {}

function required(name:string){
  const value=process.env[name]?.trim();
  if(!value)throw new StorageConfigurationError(`Google Cloud Storage requires ${name}.`);
  return value;
}

class LocalSyntheticStorageProvider implements StorageProvider {
  readonly name=storageProviderNames.local;
  private readonly root=path.resolve(process.cwd(),".data","synthetic-documents");

  private resolve(key:string){
    const target=path.resolve(this.root,key);
    if(!target.startsWith(`${this.root}${path.sep}`))throw new Error("Invalid storage key.");
    return target;
  }

  async put(file:Buffer,key:string){const target=this.resolve(key);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,file,{flag:"wx"});return{key}}
  async get(key:string){try{return{data:await readFile(this.resolve(key))}}catch(reason){if((reason as NodeJS.ErrnoException).code==="ENOENT")return null;throw reason}}
  async delete(key:string){try{await unlink(this.resolve(key))}catch(reason){if((reason as NodeJS.ErrnoException).code!=="ENOENT")throw reason}}
}

class VercelPrivateBlobStorageProvider implements StorageProvider {
  readonly name=storageProviderNames.vercel;
  async put(file:Buffer,key:string,mimeType:string){const result=await putBlob(key,file,{access:"private",contentType:mimeType,addRandomSuffix:false,cacheControlMaxAge:60});return{key:result.pathname}}
  async get(key:string){const result=await getBlob(key,{access:"private",useCache:false});if(!result||result.statusCode!==200||!result.stream)return null;const data=Buffer.from(await new Response(result.stream).arrayBuffer());return{data,contentType:result.blob.contentType}}
  async delete(key:string){await deleteBlob(key)}
}

let googleStorageClient:GoogleStorage|undefined;
function createGoogleStorageClient(){
  const projectId=required("GCP_PROJECT_ID");
  const authMode=(process.env.GCS_AUTH_MODE||((process.env.VERCEL||process.env.VERCEL_OIDC_TOKEN)?"vercel-oidc":"application-default")).trim().toLowerCase();
  if(authMode==="application-default")return new GoogleStorage({projectId});
  if(authMode!=="vercel-oidc")throw new StorageConfigurationError("GCS_AUTH_MODE must be vercel-oidc or application-default.");
  const projectNumber=required("GCP_PROJECT_NUMBER");
  const poolId=required("GCP_WORKLOAD_IDENTITY_POOL_ID");
  const providerId=required("GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID");
  const serviceAccountEmail=required("GCP_SERVICE_ACCOUNT_EMAIL");
  const authClient=ExternalAccountClient.fromJSON({
    type:"external_account",
    audience:`//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type:"urn:ietf:params:oauth:token-type:jwt",
    token_url:"https://sts.googleapis.com/v1/token",
    service_account_impersonation_url:`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
    scopes:["https://www.googleapis.com/auth/devstorage.read_write"],
    subject_token_supplier:{getSubjectToken:()=>getVercelOidcToken()},
  });
  if(!authClient)throw new StorageConfigurationError("Google Cloud workload identity configuration is invalid.");
  return new GoogleStorage({projectId,authClient});
}

function getGoogleStorageClient(){return googleStorageClient??=createGoogleStorageClient()}
function isNotFound(reason:unknown){return typeof reason==="object"&&reason!==null&&"code" in reason&&Number((reason as {code:unknown}).code)===404}

class GoogleCloudStorageProvider implements StorageProvider {
  readonly name=storageProviderNames.google;
  private bucket(){return getGoogleStorageClient().bucket(required("GCS_BUCKET"))}
  async put(file:Buffer,key:string,mimeType:string){
    await this.bucket().file(key).save(file,{resumable:false,validation:"crc32c",contentType:mimeType,metadata:{cacheControl:"private, no-store"},preconditionOpts:{ifGenerationMatch:0}});
    return{key};
  }
  async get(key:string){
    const object=this.bucket().file(key);
    try{const [[data],[metadata]]=await Promise.all([object.download({validation:"crc32c"}),object.getMetadata()]);return{data,contentType:metadata.contentType}}
    catch(reason){if(isNotFound(reason))return null;throw reason}
  }
  async delete(key:string){await this.bucket().file(key).delete({ignoreNotFound:true})}
}

export function configuredDocumentStorageName():StorageProviderName {
  const configured=process.env.DOCUMENT_STORAGE_PROVIDER?.trim().toLowerCase();
  if(!configured)return process.env.NODE_ENV==="production"?storageProviderNames.vercel:storageProviderNames.local;
  if(configured==="gcs"||configured===storageProviderNames.google)return storageProviderNames.google;
  if(configured==="vercel"||configured==="blob"||configured===storageProviderNames.vercel)return storageProviderNames.vercel;
  if(configured==="local"||configured===storageProviderNames.local)return storageProviderNames.local;
  throw new StorageConfigurationError("DOCUMENT_STORAGE_PROVIDER must be gcs, vercel, or local.");
}

export function documentStorage(providerName?:string|null):StorageProvider {
  const selected=providerName?.trim()||configuredDocumentStorageName();
  if(selected===storageProviderNames.local){
    if(process.env.NODE_ENV==="production")throw new StorageConfigurationError("Local document storage is prohibited in a hosted deployment.");
    return new LocalSyntheticStorageProvider();
  }
  if(selected===storageProviderNames.vercel){
    if(!process.env.VERCEL&&!process.env.BLOB_READ_WRITE_TOKEN)throw new StorageConfigurationError("Connect a private Vercel Blob store before using document intake.");
    return new VercelPrivateBlobStorageProvider();
  }
  if(selected===storageProviderNames.google)return new GoogleCloudStorageProvider();
  throw new StorageConfigurationError("The document record names an unsupported private storage provider.");
}

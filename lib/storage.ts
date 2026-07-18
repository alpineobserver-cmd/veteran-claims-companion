import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del as deleteBlob, get as getBlob, put as putBlob } from "@vercel/blob";

export type StoredFile={data:Buffer;contentType?:string};

export interface StorageProvider {
  readonly name:string;
  put(file:Buffer,key:string,mimeType:string):Promise<{key:string}>;
  get(key:string):Promise<StoredFile|null>;
  delete(key:string):Promise<void>;
}

export class StorageConfigurationError extends Error {}

class LocalSyntheticStorageProvider implements StorageProvider {
  readonly name="local-synthetic";
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
  readonly name="vercel-private-blob";
  async put(file:Buffer,key:string,mimeType:string){const result=await putBlob(key,file,{access:"private",contentType:mimeType,addRandomSuffix:false,cacheControlMaxAge:60});return{key:result.pathname}}
  async get(key:string){const result=await getBlob(key,{access:"private",useCache:false});if(!result||result.statusCode!==200||!result.stream)return null;const data=Buffer.from(await new Response(result.stream).arrayBuffer());return{data,contentType:result.blob.contentType}}
  async delete(key:string){await deleteBlob(key)}
}

export function documentStorage():StorageProvider {
  if(process.env.NODE_ENV!=="production")return new LocalSyntheticStorageProvider();
  if(!process.env.VERCEL&&!process.env.BLOB_READ_WRITE_TOKEN)throw new StorageConfigurationError("Connect a private Vercel Blob store before using document intake.");
  return new VercelPrivateBlobStorageProvider();
}

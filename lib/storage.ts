export interface StorageProvider{put(file:Buffer,key:string,mimeType:string):Promise<{key:string}>;delete(key:string):Promise<void>}
// Implement LocalStorageProvider for development and S3StorageProvider without changing calling code.

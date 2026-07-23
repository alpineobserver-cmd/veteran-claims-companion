export interface AiService{summarizeClaim(claimId:string):Promise<string>;analyzeDocument(uploadId:string):Promise<unknown>}
export class AiNotConfigured implements AiService{
  async summarizeClaim():Promise<string>{throw new Error("AI features are not enabled.")}
  async analyzeDocument():Promise<unknown>{throw new Error("AI features are not enabled.")}
}

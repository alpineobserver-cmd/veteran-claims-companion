import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { statementGaps } from "@/lib/claim-builder-intelligence";
import { guidedDraft, statementHeading } from "@/lib/personal-statement-template";
import { deriveStatementProvenance } from "@/lib/statement-provenance";
import { auth } from "@/auth";
import { hasAcceptableContentLength, MAX_JSON_REQUEST_BYTES, rejectCrossOriginMutation } from "@/lib/request-security";
import { aiGenerationEnabled } from "@/lib/operational-controls";
import { aiDailySpendPolicy, aiGlobalDailyPolicy, aiGlobalDailyTokenPolicy, aiMaxOutputTokens, aiMaxRequestCostCents, aiUserDailyPolicy, aiUserDailyTokenPolicy, enforceAccountRateLimit, enforceAccountUsageLimit, rateLimitPolicies } from "@/lib/rate-limit";
import { emitSecurityEvent, securityEventErrorCode } from "@/lib/security-events";
import { selectedAiGenerationPolicy } from "@/lib/ai-generation-policy";
import { generationSourceReferences, type GenerationAuditMetadata } from "@/lib/generation-audit";

export const runtime = "nodejs";

const text = (max:number) => z.string().trim().max(max).default("");
const requestSchema = z.object({
  condition: z.string().trim().min(1).max(200),
  claimType: text(200),
  diagnosis: text(1000),
  symptoms: text(6000),
  onset: text(1000),
  branch: text(100),
  role: text(500),
  serviceEvent: text(6000),
  exposures: text(4000),
  treatment: text(6000),
  providers: text(3000),
  evidence: z.array(z.string().trim().max(200)).max(30).default([]),
  statementName: text(120),
  continuity: text(4000),
  specificExamples: text(6000),
  additionalContext: text(4000),
  previousDecision:text(500),previousEvaluation:text(100),worsening:text(5000),worseningDate:text(500),primaryCondition:text(500),secondaryRelationship:text(5000),clinicianDiscussion:text(3000),symptomFrequency:text(1000),symptomDuration:text(1000),flareUps:text(4000),workImpact:text(4000),dailyImpact:text(4000),conditionDetail1:text(4000),conditionDetail2:text(4000),conditionDetail3:text(4000),conditionDetail4:text(4000),
  timeline:z.array(z.object({id:text(100),date:text(500),title:text(500),details:text(4000),source:text(1000),approximate:z.boolean()})).max(30).default([])
}).superRefine((value,ctx)=>{
  const total=Object.values(value).flat().join(" ").length;
  if(total>30000)ctx.addIssue({code:z.ZodIssueCode.custom,message:"The statement source material is too long."});
});

type OpenAIResponse={output_text?:string;output?:Array<{content?:Array<{type?:string;text?:string}>}>;error?:{message?:string}};
const statementFields=["diagnosis","symptoms","symptomFrequency","symptomDuration","onset","serviceEvent","exposures","treatment","specificExamples","additionalContext","worsening","worseningDate","primaryCondition","secondaryRelationship","clinicianDiscussion","workImpact","dailyImpact","continuity","flareUps","conditionDetail1","conditionDetail2","conditionDetail3","conditionDetail4"] as const;
const aiResultSchema=z.object({status:z.enum(["ready","needs_information"]),statement:z.string(),questions:z.array(z.object({field:z.enum(statementFields),question:z.string(),reason:z.string()})).max(3)});
const providerResponseFormat={type:"json_schema",name:"personal_statement_result",strict:true,schema:{type:"object",additionalProperties:false,properties:{status:{type:"string",enum:["ready","needs_information"]},statement:{type:"string"},questions:{type:"array",maxItems:3,items:{type:"object",additionalProperties:false,properties:{field:{type:"string",enum:statementFields},question:{type:"string"},reason:{type:"string"}},required:["field","question","reason"]}}},required:["status","statement","questions"]}};

function responseText(data:OpenAIResponse){
  if(data.output_text?.trim())return data.output_text.trim();
  return data.output?.flatMap(item=>item.content||[]).filter(item=>item.type==="output_text"&&item.text).map(item=>item.text).join("\n").trim()||"";
}

function generationMetadata(input:Record<string,unknown>,startedAt:string,details:Pick<GenerationAuditMetadata,"mode"|"model"|"policyVersion"|"resultStatus">):GenerationAuditMetadata{
  return {id:crypto.randomUUID(),feature:"personal_statement",sourceReferences:generationSourceReferences(input),createdAt:startedAt,completedAt:new Date().toISOString(),...details};
}

export function GET(){const policy=selectedAiGenerationPolicy();const configured=Boolean(process.env.OPENAI_API_KEY)&&aiGenerationEnabled()&&Boolean(policy);return NextResponse.json({configured,mode:configured?"ai":"template",policyVersion:policy?.version||"invalid"},{headers:{"Cache-Control":"no-store"}})}

export async function POST(request:NextRequest){
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  if(!hasAcceptableContentLength(request,MAX_JSON_REQUEST_BYTES))return NextResponse.json({error:"The drafting request is too large."},{status:413});
  let body:unknown;
  try{body=await request.json()}catch{return NextResponse.json({error:"The request could not be read."},{status:400})}
  const parsed=requestSchema.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:"Please review the statement information and try again."},{status:400});
  const input=parsed.data;
  const startedAt=new Date().toISOString();
  const gaps=statementGaps(input);
  if(gaps.length)return NextResponse.json({status:"needs_information",questions:gaps.map(({field,question,reason})=>({field,question,reason})),notice:"Answer these focused questions before drafting. Debrief will not invent the missing facts.",generation:generationMetadata(input,startedAt,{mode:"preflight",model:"not-called",policyVersion:"statement-gaps-v1",resultStatus:"needs_information"})});

  const policy=selectedAiGenerationPolicy();
  if(!process.env.OPENAI_API_KEY||!aiGenerationEnabled()||!policy){
    const statement=guidedDraft(input);
    const notice=process.env.OPENAI_API_KEY?"AI-assisted drafting is temporarily paused or its policy selection is invalid. This draft uses fixed rules to organize your answers and was not sent to an AI provider.":"OpenAI is not connected. This draft uses fixed rules to organize your answers into a narrative; it has not been interpreted or verified by AI.";
    return NextResponse.json({status:"ready",statement,provenance:deriveStatementProvenance(statement,{...input,otherCondition:"",intentToFileStatus:"",intentToFileDate:""},input.timeline),mode:"template",policyVersion:policy?.version||"disabled",notice,generation:generationMetadata(input,startedAt,{mode:"template",model:"guided-template",policyVersion:policy?.version||"disabled",resultStatus:"ready"})});
  }
  const session=await auth();
  if(!session?.user?.id)return NextResponse.json({error:"Sign in before sending questionnaire answers to the AI drafting service."},{status:401});
  const userLimited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.aiBurst,aiUserDailyPolicy()],"AI drafting limit reached. Please wait before trying again.");if(userLimited)return userLimited;
  const globalLimited=await enforceAccountRateLimit("global-ai-generation",[aiGlobalDailyPolicy()],"AI drafting is temporarily unavailable because the Alpha daily safety limit was reached.");if(globalLimited)return globalLimited;

  const modelInput=Object.fromEntries(Object.entries(input).filter(([key])=>key!=="statementName"));
  const modelInputSerialized=JSON.stringify(modelInput);
  const maxOutputTokens=aiMaxOutputTokens();
  const model=process.env.OPENAI_MODEL||"gpt-5.4-mini";
  const providerPayload={model,instructions:policy.instructions,input:modelInputSerialized,max_output_tokens:maxOutputTokens,store:false,text:{format:providerResponseFormat}};
  // UTF-8 bytes are a deliberately conservative input-token reservation: a
  // provider token cannot represent less than one byte. The serialized payload
  // also reserves instruction/schema overhead. Unused reservations are not
  // refunded, so failures cannot create an unexpected spend path.
  const tokenReservation=Buffer.byteLength(JSON.stringify(providerPayload),"utf8")+maxOutputTokens;
  const userTokenLimited=await enforceAccountUsageLimit(session.user.id,[aiUserDailyTokenPolicy()],tokenReservation,"Your daily AI drafting token budget has been reached. The free guided draft remains available.");if(userTokenLimited)return userTokenLimited;
  const globalTokenLimited=await enforceAccountUsageLimit("global-ai-generation",[aiGlobalDailyTokenPolicy()],tokenReservation,"AI drafting is temporarily paused because the daily token budget was reached. The free guided draft remains available.");if(globalTokenLimited)return globalTokenLimited;
  const spendLimited=await enforceAccountUsageLimit("global-ai-generation",[aiDailySpendPolicy()],aiMaxRequestCostCents(),"AI drafting is temporarily paused because the daily spending cap was reached. The free guided draft remains available.");if(spendLimited)return spendLimited;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),30000);
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
      body:JSON.stringify(providerPayload),
      signal:controller.signal
    });
    const data=await response.json() as OpenAIResponse;
    if(!response.ok)throw new Error(data.error?.message||`OpenAI request failed with status ${response.status}`);
    const result=aiResultSchema.safeParse(JSON.parse(responseText(data)));
    if(!result.success)throw new Error("The model returned an invalid drafting result.");
    if(result.data.status==="needs_information")return NextResponse.json({status:"needs_information",questions:result.data.questions,notice:"The drafting assistant needs a few factual details before it can continue without guessing.",generation:generationMetadata(input,startedAt,{mode:"ai",model,policyVersion:policy.version,resultStatus:"needs_information"})});
    if(!result.data.statement.trim())throw new Error("The model returned an empty statement.");
    const statement=`${statementHeading(input)}\n\n${result.data.statement.trim()}`;
    return NextResponse.json({status:"ready",statement,provenance:deriveStatementProvenance(statement,{...input,otherCondition:"",intentToFileStatus:"",intentToFileDate:""},input.timeline),mode:"ai",policyVersion:policy.version,generation:generationMetadata(input,startedAt,{mode:"ai",model,policyVersion:policy.version,resultStatus:"ready"})});
  }catch(error){
    emitSecurityEvent("ai_generation_failed",{operation:"personal-statement",code:securityEventErrorCode(error)},"error");
    return NextResponse.json({error:"The AI draft could not be generated right now. Your answers are still saved on this device.",generation:generationMetadata(input,startedAt,{mode:"ai",model,policyVersion:policy.version,resultStatus:"failed"})},{status:502});
  }finally{clearTimeout(timeout)}
}

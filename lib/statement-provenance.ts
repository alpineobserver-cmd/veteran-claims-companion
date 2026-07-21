import type { Answers, TimelineEvent } from "./claim-builder-intelligence";

export type StatementSourceOrigin={
  kind:"answer"|"timeline";
  label:string;
  excerpt:string;
  field?:string;
  timelineEventId?:string;
  factId?:string;
};

export type StatementSentenceProvenance={
  id:string;
  sectionIndex:number;
  sentenceIndex:number;
  text:string;
  status:"mapped"|"unmapped";
  origins:StatementSourceOrigin[];
};

export type StatementProvenance={version:1;sentences:StatementSentenceProvenance[]};

const fieldDetails:Partial<Record<keyof Answers,{label:string;factId?:string}>>={
  statementName:{label:"Display name"},condition:{label:"Selected condition",factId:"current"},otherCondition:{label:"Other condition",factId:"current"},claimType:{label:"Claim path"},
  diagnosis:{label:"Health history - diagnosis or evaluation",factId:"current"},symptoms:{label:"Health history - current symptoms",factId:"function"},symptomFrequency:{label:"Health history - symptom frequency",factId:"function"},symptomDuration:{label:"Health history - symptom duration",factId:"function"},flareUps:{label:"Health history - flare-ups",factId:"function"},
  onset:{label:"Health history - onset",factId:"onset"},branch:{label:"Service history - branch",factId:"service"},role:{label:"Service history - role",factId:"service"},serviceEvent:{label:"Service history - event or circumstances",factId:"service"},exposures:{label:"Service history - exposures",factId:"service"},continuity:{label:"Health history - course over time",factId:"onset"},
  previousDecision:{label:"Claim details - prior decision",factId:"worsening"},previousEvaluation:{label:"Claim details - prior evaluation",factId:"worsening"},worsening:{label:"Claim details - worsening",factId:"worsening"},worseningDate:{label:"Claim details - worsening date",factId:"worsening"},
  primaryCondition:{label:"Claim details - primary condition",factId:"secondary"},secondaryRelationship:{label:"Claim details - observed relationship",factId:"secondary"},clinicianDiscussion:{label:"Claim details - clinician discussion",factId:"secondary"},
  workImpact:{label:"Daily impact - work",factId:"function"},dailyImpact:{label:"Daily impact - ordinary activities",factId:"function"},specificExamples:{label:"Daily impact - concrete example",factId:"function"},
  treatment:{label:"Treatment - history",factId:"treatment"},providers:{label:"Treatment - providers",factId:"treatment"},additionalContext:{label:"Additional context",factId:"function"},
  conditionDetail1:{label:"Condition details - answer 1",factId:"function"},conditionDetail2:{label:"Condition details - answer 2",factId:"function"},conditionDetail3:{label:"Condition details - answer 3",factId:"function"},conditionDetail4:{label:"Condition details - answer 4",factId:"function"}
};

const stopWords=new Set(["about","after","also","and","are","before","been","being","but","can","concerning","condition","could","did","does","during","for","from","have","into","more","that","the","their","these","this","through","was","were","with","would","your"]);
const normalized=(value:string)=>value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim();
const words=(value:string)=>normalized(value).split(" ").filter(word=>word.length>2&&!stopWords.has(word));
const clip=(value:string,max=180)=>value.trim().length>max?`${value.trim().slice(0,max-1)}…`:value.trim();

const hintedFields:Array<{pattern:RegExp;fields:Array<keyof Answers>}>= [
  {pattern:/\bsubmitting this statement\b/i,fields:["claimType","condition"]},
  {pattern:/\bI served\b/i,fields:["branch","role"]},
  {pattern:/\bfirst noticed|recorded the onset|condition began\b/i,fields:["onset"]},
  {pattern:/\bprior decision|prior evaluation\b/i,fields:["previousDecision","previousEvaluation"]},
  {pattern:/\bnoticed the worsening\b/i,fields:["worseningDate"]},
  {pattern:/\bservice-connected condition I believe is relevant\b/i,fields:["primaryCondition"]},
  {pattern:/\bexposure history\b/i,fields:["exposures"]},
  {pattern:/\bcurrent medical information\b/i,fields:["diagnosis"]},
  {pattern:/\bcurrently experience\b/i,fields:["symptoms"]},
  {pattern:/\bpattern I experience|this occurs\b/i,fields:["symptomFrequency"]},
  {pattern:/\bsymptoms usually last|in terms of duration|the duration\b/i,fields:["symptomDuration"]},
  {pattern:/\bfor example\b/i,fields:["specificExamples"]},
  {pattern:/\bcurrent and past treatment\b/i,fields:["treatment"]},
  {pattern:/\breceived care from\b/i,fields:["providers"]}
];

function sentenceParts(statement:string){
  const result:Array<{sectionIndex:number;sentenceIndex:number;text:string}>=[];
  statement.split(/\n\s*\n/).map(value=>value.trim()).filter(Boolean).forEach((section,sectionIndex)=>{
    if(sectionIndex===0&&/^PERSONAL STATEMENT IN SUPPORT OF CLAIM\b/.test(section)){
      section.split("\n").map(value=>value.trim()).filter(Boolean).forEach((text,sentenceIndex)=>{
        if(!/^PERSONAL STATEMENT IN SUPPORT OF CLAIM$/.test(text))result.push({sectionIndex,sentenceIndex,text});
      });
      return;
    }
    section.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map(value=>value.trim()).filter(Boolean).forEach((text,sentenceIndex)=>result.push({sectionIndex,sentenceIndex,text}));
  });
  return result;
}

function overlapScore(sentence:string,value:string){
  const sentenceWords=new Set(words(sentence));
  const valueWords=[...new Set(words(value))];
  if(!valueWords.length)return 0;
  const shared=valueWords.filter(word=>sentenceWords.has(word)).length;
  return shared/valueWords.length;
}

export function deriveStatementProvenance(statement:string,answers:Answers,timeline:TimelineEvent[]=[]):StatementProvenance{
  const answerSources=(Object.keys(fieldDetails) as Array<keyof Answers>).flatMap(field=>{
    const value=answers[field];
    if(typeof value!=="string"||!value.trim())return[];
    return[{field,value:value.trim(),...fieldDetails[field]!}];
  });
  const sentences=sentenceParts(statement).map(part=>{
    const directFields=new Set<keyof Answers>();
    if(/^Name:\s*/i.test(part.text))directFields.add("statementName");
    if(/^Condition:\s*/i.test(part.text))directFields.add(answers.condition==="Other / condition not listed"?"otherCondition":"condition");
    for(const hint of hintedFields)if(hint.pattern.test(part.text))hint.fields.forEach(field=>directFields.add(field));
    const sentenceNormalized=normalized(part.text);
    for(const source of answerSources){
      const valueNormalized=normalized(source.value);
      const exact=(valueNormalized.length>=4&&sentenceNormalized.includes(valueNormalized))||(sentenceNormalized.length>=10&&valueNormalized.includes(sentenceNormalized));
      const score=overlapScore(part.text,source.value);
      const enoughOverlap=source.value.length>=10&&((words(source.value).length<=3&&score===1)||(words(source.value).length>3&&score>=0.55));
      if(exact||enoughOverlap)directFields.add(source.field);
    }
    const origins:StatementSourceOrigin[]=answerSources.filter(source=>directFields.has(source.field)).map(source=>({kind:"answer",field:source.field,label:source.label,excerpt:clip(source.value),factId:source.factId}));
    for(const event of timeline){
      const combined=[event.date,event.title,event.details].filter(Boolean).join(" ");
      const exact=normalized(event.details).length>=10&&sentenceNormalized.includes(normalized(event.details));
      const score=overlapScore(part.text,combined);
      if(exact||(words(combined).length>3&&score>=0.6))origins.push({kind:"timeline",timelineEventId:event.id,label:`Timeline - ${event.title||event.date||"saved event"}`,excerpt:clip(combined),factId:"onset"});
    }
    const deduped=origins.filter((origin,index,list)=>list.findIndex(item=>item.kind===origin.kind&&item.field===origin.field&&item.timelineEventId===origin.timelineEventId)===index);
    return{...part,id:`${part.sectionIndex}-${part.sentenceIndex}`,status:deduped.length?"mapped" as const:"unmapped" as const,origins:deduped};
  });
  return{version:1,sentences};
}

export function statementProvenanceSummary(provenance:StatementProvenance|undefined){
  const sentences=provenance?.sentences||[];
  const mapped=sentences.filter(sentence=>sentence.status==="mapped"&&sentence.origins.length>0).length;
  return{total:sentences.length,mapped,unmapped:sentences.length-mapped};
}

import type { Answers, TimelineEvent } from "./claim-builder-intelligence";

export type StatementSource=Omit<Answers,"otherCondition"|"intentToFileStatus"|"intentToFileDate">&{timeline:TimelineEvent[]};

export function statementHeading(input:Pick<StatementSource,"statementName"|"condition">){
  return ["PERSONAL STATEMENT IN SUPPORT OF CLAIM",input.statementName&&`Name: ${input.statementName}`,`Condition: ${input.condition}`].filter(Boolean).join("\n");
}

const finish=(value:string)=>{const clean=value.trim();return clean&&!/[.!?]$/.test(clean)?`${clean}.`:clean};
const upperLead=(value:string)=>{const clean=value.trim();return clean?clean.charAt(0).toUpperCase()+clean.slice(1):clean};
const lowerLead=(value:string)=>{
  const clean=value.trim();
  if(/^I\b/.test(clean)||!/^(?:[A-Z][a-z]|A\b)/.test(clean))return clean;
  return clean.charAt(0).toLowerCase()+clean.slice(1);
};
const paragraph=(sentences:Array<string|false|undefined>)=>sentences.filter(Boolean).map(value=>finish(String(value))).join(" ");
const normalized=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const tokens=(value:string)=>new Set(normalized(value).split(" ").filter(word=>word.length>3&&!new Set(["about","after","before","during","from","have","into","that","their","these","this","with"]).has(word)));
const timelineAddsInformation=(value:string,sourceTokens:Set<string>)=>{
  const eventTokens=tokens(value);
  if(!eventTokens.size)return false;
  return [...eventTokens].filter(word=>sourceTokens.has(word)).length/eventTokens.size<0.65;
};
const onsetSentence=(value:string,claimType:string)=>{
  const clean=value.trim();
  if(claimType==="Increased-rating claim"&&/^original\b/i.test(clean))return `The condition began with an ${lowerLead(clean)}`;
  if(/^(approximately|around|during|after|before|in|on|while)\b/i.test(clean))return `I first noticed the symptoms ${clean}`;
  if(/\b(?:symptoms?|pain|ringing|headaches?)\s+(?:began|started)\b/i.test(clean))return upperLead(clean);
  return `I recorded the onset as ${clean}`;
};
const frequencySentence=(value:string)=>/[;:]|\b(?:pain|symptoms?|attacks?|episodes?|readings?|disruption|swelling)\b/i.test(value)?`The pattern I experience is ${lowerLead(value)}`:`This occurs ${lowerLead(value)}`;
const durationSentence=(value:string)=>{
  const clean=value.trim();
  if(/^(?:continuous|constant|ongoing)$/i.test(clean))return `The symptoms are ${clean.toLowerCase()}`;
  if(/^varies?\b/i.test(clean))return `The duration ${lowerLead(clean)}`;
  if(!/\b(?:can|continues?|lasts?|persists?|remains?|varies?)\b/i.test(clean)&&clean.split(/\s+/).length<=6)return `Symptoms usually last ${lowerLead(clean)}`;
  return `In terms of duration, ${lowerLead(clean)}`;
};
const medicalInformationSentence=(value:string)=>/^(?:A|An|The|Audiology|Imaging|Current records?|[A-Z][a-z]+ (?:records?|testing|evaluation|study))\b.*\b(?:is|are|was|were|documents?|documented|evaluates?|evaluated|diagnoses?|diagnosed|describes?|described|records?|recorded|confirms?|confirmed)\b/i.test(value.trim())?value:`My current medical information includes ${lowerLead(value)}`;
const treatmentSentence=(value:string)=>/^\S+(?:\s+\S+){0,5}\s+(?:was|were|is|are|has|have)\b/i.test(value.trim())?value:`My current and past treatment includes ${lowerLead(value)}`;
const claimDescription=(claimType:string)=>claimType==="Increased-rating claim"?"claim for an increased evaluation":claimType==="Secondary claim"?"secondary claim":"claim";
const roleDescription=(role:string)=>`${/^[aeiou]/i.test(role.trim())?"an":"a"} ${lowerLead(role)}`;

export function guidedDraft(input:StatementSource){
  const paragraphs:string[]=[];
  const opening=paragraph([
    `I am submitting this statement in support of my ${claimDescription(input.claimType)} concerning ${lowerLead(input.condition)}`,
    (input.branch||input.role)&&`I served${input.branch?` in the ${input.branch}`:""}${input.role?` as ${roleDescription(input.role)}`:""}`
  ]);
  if(opening)paragraphs.push(opening);

  const history:string[]=[];
  if(input.claimType==="Increased-rating claim"){
    if(input.onset)history.push(onsetSentence(input.onset,input.claimType));
    if(input.previousDecision||input.previousEvaluation)history.push(`My prior decision${input.previousDecision?` was dated ${input.previousDecision}`:""}${input.previousEvaluation?` and listed an evaluation of ${input.previousEvaluation}`:""}`);
    if(input.worseningDate)history.push(`I noticed the worsening ${input.worseningDate}`);
    if(input.worsening)history.push(input.worsening);
  }else if(input.claimType==="Secondary claim"){
    if(input.onset)history.push(onsetSentence(input.onset,input.claimType));
    if(input.primaryCondition)history.push(`The existing service-connected condition I believe is relevant is ${lowerLead(input.primaryCondition)}`);
    if(input.secondaryRelationship)history.push(input.secondaryRelationship);
    if(input.clinicianDiscussion)history.push(input.clinicianDiscussion);
  }else{
    if(input.onset)history.push(onsetSentence(input.onset,input.claimType));
    if(input.serviceEvent)history.push(input.serviceEvent);
    if(input.exposures)history.push(`My relevant exposure history includes ${lowerLead(input.exposures)}`);
  }
  if(input.continuity)history.push(input.continuity);

  const answerValues=Object.entries(input).flatMap(([key,value])=>key==="timeline"?[]:Array.isArray(value)?value.map(item=>String(item)):[String(value)]).join(" ");
  const answerTokens=tokens(answerValues);
  const answerText=normalized(answerValues);
  for(const event of input.timeline){
    const detail=event.details||event.title;
    if(!detail||(event.date&&answerText.includes(normalized(event.date)))||!timelineAddsInformation(detail,answerTokens))continue;
    const when=event.date?`${event.approximate?"Around ":""}${event.date}`:"At another point in this history";
    history.push(`${when}, ${lowerLead(detail)}`);
  }
  const historyParagraph=paragraph(history);
  if(historyParagraph)paragraphs.push(historyParagraph);

  const health=paragraph([
    input.diagnosis&&medicalInformationSentence(input.diagnosis),
    input.symptoms&&( /^I\b/.test(input.symptoms.trim())?`Currently, ${input.symptoms.trim()}`:`I currently experience ${lowerLead(input.symptoms)}`),
    input.symptomFrequency&&frequencySentence(input.symptomFrequency),
    input.symptomDuration&&durationSentence(input.symptomDuration),
    input.flareUps,
    input.conditionDetail1,input.conditionDetail2,input.conditionDetail3,input.conditionDetail4
  ]);
  if(health)paragraphs.push(health);

  const impact=paragraph([
    input.workImpact,
    input.dailyImpact,
    input.specificExamples&&`For example, ${lowerLead(input.specificExamples)}`
  ]);
  if(impact)paragraphs.push(impact);

  const care=paragraph([
    input.treatment&&treatmentSentence(input.treatment),
    input.providers&&`I have received care from ${lowerLead(input.providers)}`,
    input.additionalContext
  ]);
  if(care)paragraphs.push(care);
  return `${statementHeading(input)}\n\n${paragraphs.join("\n\n")}`;
}

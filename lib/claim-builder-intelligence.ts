export type IntentToFileStatus=""|"submitted"|"online_started"|"not_submitted"|"not_sure";
export type Answers={condition:string;otherCondition:string;claimType:string;intentToFileStatus:IntentToFileStatus;intentToFileDate:string;diagnosis:string;symptoms:string;onset:string;branch:string;role:string;serviceEvent:string;exposures:string;treatment:string;providers:string;evidence:string[];statementName:string;continuity:string;specificExamples:string;additionalContext:string;previousDecision:string;previousEvaluation:string;worsening:string;worseningDate:string;primaryCondition:string;secondaryRelationship:string;clinicianDiscussion:string;symptomFrequency:string;symptomDuration:string;flareUps:string;workImpact:string;dailyImpact:string;conditionDetail1:string;conditionDetail2:string;conditionDetail3:string;conditionDetail4:string};
export type TimelineEvent={id:string;date:string;title:string;details:string;source:string;approximate:boolean};
export type EvidenceStatus="record_available"|"personal_recollection"|"witness_statement"|"record_not_obtained"|"none_identified";
export type EvidenceLink={status:EvidenceStatus;source:string};
export type EvidenceMap=Record<string,EvidenceLink>;
export type QualityFinding={id:string;level:"required"|"improve"|"check";title:string;detail:string};
export type ConditionPrompt={key:"conditionDetail1"|"conditionDetail2"|"conditionDetail3"|"conditionDetail4";label:string;placeholder:string};
export type StatementField="diagnosis"|"symptoms"|"symptomFrequency"|"symptomDuration"|"onset"|"serviceEvent"|"exposures"|"treatment"|"specificExamples"|"additionalContext"|"worsening"|"worseningDate"|"primaryCondition"|"secondaryRelationship"|"clinicianDiscussion"|"workImpact"|"dailyImpact"|"continuity"|"flareUps"|"conditionDetail1"|"conditionDetail2"|"conditionDetail3"|"conditionDetail4";
export type StatementGap={field:StatementField;question:string;reason:string;placeholder:string;multiline?:boolean};

export const initialAnswers:Answers={condition:"",otherCondition:"",claimType:"",intentToFileStatus:"",intentToFileDate:"",diagnosis:"",symptoms:"",onset:"",branch:"",role:"",serviceEvent:"",exposures:"",treatment:"",providers:"",evidence:[],statementName:"",continuity:"",specificExamples:"",additionalContext:"",previousDecision:"",previousEvaluation:"",worsening:"",worseningDate:"",primaryCondition:"",secondaryRelationship:"",clinicianDiscussion:"",symptomFrequency:"",symptomDuration:"",flareUps:"",workImpact:"",dailyImpact:"",conditionDetail1:"",conditionDetail2:"",conditionDetail3:"",conditionDetail4:""};

export function intentToFileLabel(status:IntentToFileStatus){
  if(status==="submitted")return "Submitted to VA";
  if(status==="online_started")return "Started an eligible claim online";
  if(status==="not_submitted")return "Not submitted";
  if(status==="not_sure")return "Not sure";
  return "Not answered yet";
}

export const evidenceStatuses:Array<{value:EvidenceStatus;label:string;description:string}>=[
  {value:"record_available",label:"Supporting record available",description:"A record, log, photo, or medical opinion is available now."},
  {value:"personal_recollection",label:"Personal recollection",description:"This fact is based on the veteran's own observation or memory."},
  {value:"witness_statement",label:"Witness or buddy evidence",description:"Another person observed or can describe this fact."},
  {value:"record_not_obtained",label:"Record identified but not obtained",description:"A possible record is known but is not available yet."},
  {value:"none_identified",label:"No supporting information identified",description:"No supporting source has been identified for this fact yet."}
];
export const emptyEvidenceLink:EvidenceLink={status:"none_identified",source:""};
export function normalizeEvidenceLink(value:unknown):EvidenceLink{
  if(value&&typeof value==="object"&&"status" in value){
    const candidate=value as {status?:unknown;source?:unknown};
    if(evidenceStatuses.some(item=>item.value===candidate.status))return {status:candidate.status as EvidenceStatus,source:typeof candidate.source==="string"?candidate.source.slice(0,500):""};
  }
  if(typeof value==="string"&&value.trim()){
    if(value==="Not yet located")return {status:"record_not_obtained",source:""};
    if(value==="Personal recollection only"||value==="Personal statement")return {status:"personal_recollection",source:value==="Personal statement"?value:""};
    if(value==="Buddy or witness statement")return {status:"witness_statement",source:value};
    return {status:"record_available",source:value.slice(0,500)};
  }
  return {...emptyEvidenceLink};
}
export function normalizeEvidenceMap(value:unknown):EvidenceMap{
  if(!value||typeof value!=="object"||Array.isArray(value))return {};
  return Object.fromEntries(Object.entries(value).map(([key,link])=>[key,normalizeEvidenceLink(link)]));
}
export const evidenceStatusLabel=(status:EvidenceStatus)=>evidenceStatuses.find(item=>item.value===status)?.label||"Unknown status";
export const hasSupportingInformation=(link:EvidenceLink|undefined)=>Boolean(link&&(link.status==="personal_recollection"||link.status==="witness_statement"||(link.status==="record_available"&&link.source.trim())));
export const hasAvailableRecord=(link:EvidenceLink|undefined)=>Boolean(link?.status==="record_available"&&link.source.trim());

const unsupportedMedicalConclusion=/\b(?:caused by|definitely due to|proves? that)\b/i;
const narrativeFields:StatementField[]=["diagnosis","symptoms","symptomFrequency","symptomDuration","onset","serviceEvent","exposures","treatment","specificExamples","additionalContext","worsening","worseningDate","primaryCondition","secondaryRelationship","clinicianDiscussion","workImpact","dailyImpact","continuity","flareUps","conditionDetail1","conditionDetail2","conditionDetail3","conditionDetail4"];
const attributedMedicalConclusion=/\b(?:doctor|clinician|provider|physician|specialist|neurologist|therapist|examiner|medical (?:record|opinion))\b.{0,100}\b(?:said|says|stated|states|documented|documents|wrote|concluded|concludes|opined|opines|found|finds|explained|explains)\b/i;
const needsMedicalConclusionRewrite=(value:string)=>unsupportedMedicalConclusion.test(value)&&!attributedMedicalConclusion.test(value);
const numberWords:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
const frequencyRate=(value:string)=>{
  const match=value.toLowerCase().match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b[^.;]{0,35}\b(?:per|each|a)\s+(day|week|month|year)\b/);
  if(!match)return null;
  const amount=numberWords[match[1]]||Number(match[1]);
  const factor:Record<string,number>={day:30,week:4.33,month:1,year:1/12};
  return amount*factor[match[2]];
};
const conflictingFrequency=(a:Pick<Answers,"symptomFrequency"|"conditionDetail1"|"conditionDetail2"|"conditionDetail3"|"conditionDetail4">)=>{
  const rates=[a.symptomFrequency,a.conditionDetail1,a.conditionDetail2,a.conditionDetail3,a.conditionDetail4].map(frequencyRate).filter((value):value is number=>value!==null&&value>0);
  return rates.length>1&&Math.max(...rates)/Math.min(...rates)>=2;
};
const conflictingOnsetYear=(a:Pick<Answers,"onset"|"serviceEvent">)=>{
  const onset=a.onset.match(/\b(?:19|20)\d{2}\b/)?.[0];
  const described=a.serviceEvent.match(/\b(?:began|started|first noticed)\b[^.]{0,120}\b((?:19|20)\d{2})\b/i)?.[1];
  return Boolean(onset&&described&&onset!==described);
};

export function statementGaps(a:Pick<Answers,StatementField|"claimType">):StatementGap[]{
  const gaps:StatementGap[]=[];
  const add=(field:StatementField,question:string,reason:string,placeholder:string,multiline=true)=>gaps.push({field,question,reason,placeholder,multiline});
  if(!a.symptoms.trim())add("symptoms","What symptoms or limitations are you experiencing now?","A statement needs a clear description of the condition as you experience it.","Describe the main symptoms and what they prevent or interrupt.");
  if(a.claimType==="Original or new claim"){
    if(!a.serviceEvent.trim())add("serviceEvent","What happened during service that you believe is relevant?","The draft should describe the service event or circumstances in your words without claiming a medical conclusion.","Include the approximate time, place, duty, injury, illness, or exposure.");
    if(!a.onset.trim())add("onset","When did you first notice the symptoms?","An approximate onset helps establish a truthful chronology.","An approximate month, year, or period of service is enough.",false);
  }else if(a.claimType==="Increased-rating claim"){
    if(!a.worsening.trim())add("worsening","What has changed or worsened since the prior decision?","An increased-rating statement should compare the earlier and current level of functioning.","Describe changes in symptoms, treatment, work, or daily activities.");
    if(!a.worseningDate.trim())add("worseningDate","About when did you notice the worsening?","An approximate date keeps the change in chronological context.","Approximate month and year.",false);
  }else if(a.claimType==="Secondary claim"){
    if(!a.primaryCondition.trim())add("primaryCondition","Which existing service-connected condition do you believe is related?","The draft needs to identify the condition that provides context for the secondary claim.","Enter the existing service-connected condition.",false);
    if(!a.secondaryRelationship.trim())add("secondaryRelationship","What have you personally observed about the relationship between the conditions?","The draft can report chronology and observations but must not invent a medical link.","Describe what happened first, changes you observed, or what a clinician documented.");
  }
  if(!a.specificExamples.trim()&&!a.workImpact.trim()&&!a.dailyImpact.trim())add("specificExamples","What is one concrete example of how this condition affects you?","A specific example makes the statement useful without exaggerating severity.","Describe one interrupted workday, missed activity, household task, safety issue, or observation.");
  for(const field of narrativeFields){
    if(needsMedicalConclusionRewrite(a[field]))add(field,"Can you restate this using only what you personally observed, or identify the clinician or record that reached the medical conclusion?","This answer appears to state a medical cause as fact. Debrief should not repeat that conclusion without clear attribution.","Describe the sequence, symptoms, changes, or clinician-documented opinion without stating an unsupported cause.");
  }
  if(conflictingOnsetYear(a))add("onset","Which year best reflects when you first noticed the symptoms?","The onset answer and service-event description appear to give different years for when symptoms began.","Enter the best approximate year and explain any uncertainty.",false);
  if(conflictingFrequency(a))add("symptomFrequency","Which frequency best describes the current pattern?","Two answers appear to describe materially different symptom frequencies.","Give one current estimate per day, week, month, or year.",false);
  return gaps.slice(0,4);
}

const p=(key:ConditionPrompt["key"],label:string,placeholder:string):ConditionPrompt=>({key,label,placeholder});
export function conditionPrompts(condition:string):ConditionPrompt[]{
  const value=condition.toLowerCase();
  if(/migraine|headache/.test(value))return[p("conditionDetail1","How many attacks occur in an average month?","Include how many require stopping activity or lying down"),p("conditionDetail2","What happens during a typical attack?","Symptoms, duration, recovery, and medication response"),p("conditionDetail3","How do attacks affect reliable work or ordinary activity?","Missed work, interrupted tasks, driving, childcare, or other examples"),p("conditionDetail4","Do you keep a headache log?","Describe the period covered and whether entries were contemporaneous")];
  if(/knee|ankle|foot|hip|shoulder|arm|elbow|wrist|hand|spine|back|neck|muscle/.test(value))return[p("conditionDetail1","Describe movement limitations","Measured motion if known, or movements you cannot complete"),p("conditionDetail2","Describe flare-ups and repeated-use effects","Frequency, duration, triggers, and what becomes harder"),p("conditionDetail3","Describe instability, locking, swelling, weakness, or radiating symptoms","Include the side of the body and how often it occurs"),p("conditionDetail4","Do you use an assistive device?","Brace, cane, walker, orthotics, or other prescribed or regular device")];
  if(/ptsd|anxiety|depress|adjustment|mental|insomnia|eating/.test(value))return[p("conditionDetail1","How do symptoms affect work, school, or concentration?","Use concrete examples without unnecessary graphic detail"),p("conditionDetail2","How do symptoms affect relationships and social activity?","Changes in communication, trust, isolation, or participation"),p("conditionDetail3","How do symptoms affect sleep, mood, judgment, or self-care?","Describe frequency, severity, and duration"),p("conditionDetail4","Are there periods of improvement or worsening?","Describe remissions, triggers, and ability to adjust")];
  if(/sleep apnea|asthma|respiratory|bronchitis|copd|sinus|rhinitis/.test(value))return[p("conditionDetail1","Describe breathing, sleep, or episode frequency","Include daytime effects and typical duration"),p("conditionDetail2","What treatment or breathing assistance is prescribed?","CPAP, inhalers, antibiotics, surgery, or other treatment"),p("conditionDetail3","Describe objective testing or complications","Sleep study, pulmonary testing, imaging, or serious complications"),p("conditionDetail4","How does the condition interrupt daily activity?","Work, exertion, sleep, driving, or recovery time")];
  if(/tinnitus|hearing|vision|vertigo/.test(value))return[p("conditionDetail1","Describe the sensory problem and its pattern","Side affected, constant or intermittent, and approximate onset"),p("conditionDetail2","Describe testing and treatment","Audiogram, speech testing, eye exam, devices, or therapy"),p("conditionDetail3","Describe communication, balance, or safety effects","Use real-world examples"),p("conditionDetail4","Describe relevant noise, injury, or exposure history","Specific duties, sources, duration, and protection used")];
  return[p("conditionDetail1","Describe the usual symptom pattern","Frequency, severity, duration, and recovery"),p("conditionDetail2","Describe flare-ups or periods of worsening","Triggers and what becomes harder"),p("conditionDetail3","Describe measurable or observable effects","Tests, findings, devices, or observations"),p("conditionDetail4","Describe the clearest real-world example","Work, home, mobility, sleep, relationships, or self-care")];
}

export function factRows(a:Answers,condition:string){
  const rows=[{id:"current",fact:`Current condition: ${condition}`,suggested:"Current medical records"},{id:"onset",fact:`Onset or worsening: ${a.onset||a.worseningDate||"Not described"}`,suggested:"Service treatment records"},{id:"function",fact:`Current symptoms and functional effects`,suggested:"Personal statement"},{id:"treatment",fact:"Treatment and provider history",suggested:"VA treatment records"}];
  if(a.claimType==="Original or new claim")rows.splice(2,0,{id:"service",fact:"In-service event, injury, illness, or exposure",suggested:"Service treatment records"});
  if(a.claimType==="Increased-rating claim")rows.splice(2,0,{id:"worsening",fact:"Change since the prior decision",suggested:"Current medical records"});
  if(a.claimType==="Secondary claim")rows.splice(2,0,{id:"secondary",fact:`Relationship to ${a.primaryCondition||"the primary condition"}`,suggested:"Medical opinion or nexus letter"});
  return rows;
}

export function qualityFindings(a:Answers,condition:string,timeline:TimelineEvent[],map:EvidenceMap):QualityFinding[]{
  const findings:QualityFinding[]=[];
  const add=(id:string,level:QualityFinding["level"],title:string,detail:string)=>findings.push({id,level,title,detail});
  if(!a.diagnosis)add("diagnosis","improve","Diagnosis or evaluation not described","A lay statement can describe observable symptoms, but identify a current medical evaluation if one exists.");
  if(!a.onset)add("onset","required","Onset is missing","Add an approximate date or period and clearly mark uncertainty.");
  if(!a.specificExamples)add("example","required","No concrete example","Add one event showing how the condition interrupted work or ordinary activity.");
  if(!a.symptomFrequency||!a.symptomDuration)add("pattern","improve","Symptom pattern is incomplete","Describe both frequency and typical duration when possible.");
  if(a.claimType==="Original or new claim"&&!a.serviceEvent)add("service","required","Service circumstances are missing","Describe the relevant event, injury, illness, duty, or exposure in your own words.");
  if(a.claimType==="Increased-rating claim"&&!a.worsening)add("worsening","required","Worsening is not described","Compare current functioning with the period covered by the prior decision.");
  if(a.claimType==="Secondary claim"&&(!a.primaryCondition||!a.secondaryRelationship))add("secondary","required","Secondary relationship is incomplete","Identify the primary condition and explain the observed history without making an unsupported medical conclusion.");
  if(!timeline.length)add("timeline","improve","Timeline has no events","A short chronology makes dates and continuity easier to review.");
  const relevantFacts=factRows(a,condition);
  if(relevantFacts.filter(row=>hasSupportingInformation(map[row.id])).length<Math.min(3,relevantFacts.length))add("evidence","improve","Key facts are not linked to supporting information","Identify whether each major fact is supported by an available record, personal recollection, or witness evidence.");
  if(relevantFacts.some(row=>map[row.id]?.status==="record_not_obtained"))add("evidence-pending","improve","Identified records are not yet available","Keep track of the records you identified but have not obtained. They are not counted as available supporting evidence.");
  const all=narrativeFields.map(field=>a[field]).join(" ");
  if(/\b(?:always|constantly|completely)\b|\bnever\s+(?:have|had|can|could|do|did|is|was|will|experience|experienced)\b/i.test(all))add("absolute","check","Review absolute wording","Confirm words such as always or never are accurate, or replace them with a measurable pattern.");
  if(unsupportedMedicalConclusion.test(all))add("medical","check","Possible medical conclusion","Describe what happened and what you believe; attribute medical conclusions to a clinician or record.");
  if(conflictingOnsetYear(a)||conflictingFrequency(a))add("contradiction","check","Answers may conflict","Review the highlighted timing or frequency answers before generating a statement.");
  return findings;
}

export function suggestedTimeline(a:Answers):TimelineEvent[]{
  const events:TimelineEvent[]=[];const add=(date:string,title:string,details:string,source:string)=>{if(date||details)events.push({id:crypto.randomUUID(),date,title,details,source,approximate:true})};
  add(a.onset,"Symptoms began",a.serviceEvent||a.symptoms,"Personal recollection");
  if(a.worsening)add(a.worseningDate,"Condition worsened",a.worsening,"Personal recollection");
  if(a.diagnosis)add("","Diagnosis or evaluation",a.diagnosis,"Medical records");
  if(a.treatment)add("","Treatment history",a.treatment,a.providers||"Treatment records");
  return events;
}

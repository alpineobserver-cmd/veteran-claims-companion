import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type TechFluency="high"|"moderate"|"low";
export type Device="mobile"|"tablet"|"desktop";
export type ClaimPath="original"|"increase"|"secondary"|"not-sure";
export type EvidenceSituation="none"|"available"|"mixed";
export type InformationState="complete"|"one-gap"|"uncertain";

export type Persona={
  id:string;
  ageRange:"mid-20s"|"mid-40s"|"mid-60s";
  fluency:TechFluency;
  device:Device;
  claimPath:ClaimPath;
  evidence:EvidenceSituation;
  information:InformationState;
};

export type ExperienceFeatures={
  orientation:boolean;
  mobileStepLabels:boolean;
  mobileSaveLabel:boolean;
  contextualSkip:boolean;
  layeredReview:boolean;
  timelineOptionalGuidance:boolean;
  plainEvidenceLanguage:boolean;
  packageStatusGuidance:boolean;
  readablePackageText:boolean;
  directGapRecovery:boolean;
  singleNextAction:boolean;
  optionalDocumentsState:boolean;
};

type Stage="start"|"workspace"|"questions"|"timeline"|"evidence"|"review"|"statement"|"verify"|"package";
type Result={
  persona:Persona;
  completed:boolean;
  terminalStage:Stage|"completed";
  unaidedStart:boolean;
  recoveredFromMistake:boolean;
  attemptedRecovery:boolean;
  helpRequests:number;
  backtracks:number;
  incorrectSelections:number;
  attemptedSaveResume:boolean;
  saveResumeSucceeded:boolean;
  statementCompleted:boolean;
  understoodNextAction:boolean;
  confidence:number;
  friction:string[];
};

const cohorts:Array<Pick<Persona,"ageRange"|"fluency">>=[
  {ageRange:"mid-20s",fluency:"high"},
  {ageRange:"mid-40s",fluency:"moderate"},
  {ageRange:"mid-60s",fluency:"low"},
];
const devices:Device[]=["mobile","tablet","desktop"];
const paths:ClaimPath[]=["original","increase","secondary","not-sure"];
const evidenceSituations:EvidenceSituation[]=["none","available","mixed"];
const informationStates:InformationState[]=["complete","one-gap","uncertain"];

export function buildPersonas():Persona[]{
  return cohorts.flatMap((cohort,cohortIndex)=>Array.from({length:30},(_,index)=>({
    id:`UX-${String(cohortIndex*30+index+1).padStart(3,"0")}`,
    ...cohort,
    device:devices[index%devices.length],
    claimPath:paths[(index+cohortIndex)%paths.length],
    evidence:evidenceSituations[Math.floor(index/3)%evidenceSituations.length],
    information:informationStates[Math.floor(index/9)%informationStates.length],
  })));
}

export const baselineFeatures:ExperienceFeatures={
  orientation:false,
  mobileStepLabels:false,
  mobileSaveLabel:false,
  contextualSkip:false,
  layeredReview:false,
  timelineOptionalGuidance:false,
  plainEvidenceLanguage:false,
  packageStatusGuidance:false,
  readablePackageText:false,
  directGapRecovery:false,
  singleNextAction:false,
  optionalDocumentsState:false,
};

export function sourceFeatures():ExperienceFeatures{
  const root=fileURLToPath(new URL("..",import.meta.url));
  const questionnaire=readFileSync(`${root}/components/claim-questionnaire.tsx`,"utf8");
  const styles=readFileSync(`${root}/app/claim-builder/claim-builder.css`,"utf8");
  const packageStatus=readFileSync(`${root}/components/package-status-control.tsx`,"utf8");
  const packagePage=readFileSync(`${root}/app/claim-package/page.tsx`,"utf8");
  const packageStyles=readFileSync(`${root}/app/claim-package/claim-package.css`,"utf8");
  return {
    orientation:questionnaire.includes("Before you begin"),
    mobileStepLabels:styles.includes("Mobile and tablet users retain the section names"),
    mobileSaveLabel:styles.includes("Keep the Save label visible on small screens"),
    contextualSkip:questionnaire.includes("continueLabel"),
    layeredReview:questionnaire.includes('className="review-more"'),
    timelineOptionalGuidance:questionnaire.includes("This step is optional"),
    plainEvidenceLanguage:questionnaire.includes("Show what supports each important fact"),
    packageStatusGuidance:packageStatus.includes("packageStatusDescriptions"),
    readablePackageText:packageStyles.includes("tracking controls readable"),
    directGapRecovery:questionnaire.includes("Answer now"),
    singleNextAction:packagePage.includes("One clear next step"),
    optionalDocumentsState:packagePage.includes("Optional · none uploaded"),
  };
}

const stageBase:Record<Stage,number>={start:.07,workspace:.08,questions:.1,timeline:.12,evidence:.14,review:.15,statement:.11,verify:.13,package:.12};
const stageOrder=Object.keys(stageBase) as Stage[];
const fluencyMultiplier:Record<TechFluency,number>={high:.6,moderate:.95,low:1.35};
const abandonmentRisk:Record<TechFluency,number>={high:.012,moderate:.035,low:.075};

function randomFor(key:string){
  let hash=2166136261;
  for(const char of key){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}
  return (hash>>>0)/4294967296;
}

function stageProbability(persona:Persona,stage:Stage,features:ExperienceFeatures){
  let probability=stageBase[stage]*fluencyMultiplier[persona.fluency];
  if(stage==="start"&&!features.orientation)probability+=persona.fluency==="low"?.13:persona.fluency==="moderate"?.06:.02;
  if(stage==="workspace"&&features.optionalDocumentsState)probability-=persona.fluency==="low"?.04:.015;
  if(stage==="questions"&&(persona.device==="mobile"||persona.device==="tablet")&&!features.mobileStepLabels)probability+=persona.fluency==="low"?.2:.09;
  if(stage==="questions"&&persona.device==="mobile"&&!features.mobileSaveLabel)probability+=persona.fluency==="low"?.12:.05;
  if(stage==="timeline"&&!features.contextualSkip)probability+=persona.fluency==="low"?.16:persona.fluency==="moderate"?.08:.03;
  if(stage==="timeline"&&features.timelineOptionalGuidance)probability-=persona.fluency==="low"?.06:.025;
  if(stage==="review"&&!features.layeredReview)probability+=persona.fluency==="low"?.2:persona.fluency==="moderate"?.1:.04;
  if(stage==="statement"&&persona.information!=="complete")probability+=persona.information==="uncertain"?.1:.05;
  if(stage==="evidence"&&persona.evidence==="mixed")probability+=.05;
  if(stage==="evidence"&&features.plainEvidenceLanguage)probability-=persona.fluency==="low"?.08:persona.fluency==="moderate"?.04:.015;
  if(stage==="package"&&features.packageStatusGuidance)probability-=persona.fluency==="low"?.07:persona.fluency==="moderate"?.035:.015;
  if(stage==="package"&&features.readablePackageText)probability-=persona.fluency==="low"?.04:.015;
  if(stage==="questions"&&persona.claimPath==="not-sure")probability+=.05;
  return Math.min(.72,probability);
}

function frictionLabel(stage:Stage,persona:Persona,features:ExperienceFeatures){
  if(stage==="start"&&!features.orientation)return "Unclear time, saving, and optional-question expectations before starting";
  if(stage==="questions"&&(persona.device==="mobile"||persona.device==="tablet")&&!features.mobileStepLabels)return "Questionnaire section names hidden on the smaller screen";
  if(stage==="questions"&&persona.device==="mobile"&&!features.mobileSaveLabel)return "Save control shown as an unexplained icon";
  if(stage==="timeline"&&!features.contextualSkip)return "Optional timeline looked required because the action only said Continue";
  if(stage==="review"&&!features.layeredReview)return "Review page presented optional checks and evidence details at once";
  if(stage==="evidence"&&!features.plainEvidenceLanguage)return "Fact-to-source terminology required extra interpretation";
  if(stage==="verify")return "Each statement section required a separate confirmation";
  if(stage==="package"&&!features.packageStatusGuidance)return "Prepared, exported, and submitted statuses required distinction";
  if(stage==="statement"&&persona.information!=="complete")return "Missing-information questions interrupted statement generation";
  return `Needed extra interpretation at ${stage}`;
}

export function runSimulation(features:ExperienceFeatures):Result[]{
  return buildPersonas().map(persona=>{
    let completed=true;
    let terminalStage:Result["terminalStage"]="completed";
    let helpRequests=0;
    let backtracks=0;
    let incorrectSelections=0;
    let attemptedRecovery=false;
    let recoveredFromMistake=true;
    const friction:string[]=[];

    for(const stage of stageOrder){
      if(!completed)break;
      const confused=randomFor(`${persona.id}:${stage}:confused`)<stageProbability(persona,stage,features);
      if(!confused)continue;
      friction.push(frictionLabel(stage,persona,features));
      if(randomFor(`${persona.id}:${stage}:help`)<.62)helpRequests+=1;
      if(randomFor(`${persona.id}:${stage}:back`)<.54)backtracks+=1;
      if(randomFor(`${persona.id}:${stage}:wrong`)<.42){
        incorrectSelections+=1;
        attemptedRecovery=true;
        const recoveryChance=persona.fluency==="high"?.96:persona.fluency==="moderate"?.89:.78;
        const recoveryBoost=(features.mobileStepLabels?.07:0)+(features.directGapRecovery&&(stage==="review"||stage==="statement")?.12:0);
        const recovered=randomFor(`${persona.id}:${stage}:recover`)<Math.min(.99,recoveryChance+recoveryBoost);
        recoveredFromMistake&&=recovered;
      }
      const cumulativePenalty=Math.max(0,friction.length-2)*.014;
      const devicePenalty=persona.device==="mobile"?.012:0;
      if(randomFor(`${persona.id}:${stage}:abandon`)<abandonmentRisk[persona.fluency]+cumulativePenalty+devicePenalty){
        completed=false;
        terminalStage=stage;
      }
    }

    const unaidedStart=!friction.some(item=>item.includes("before starting"));
    const attemptedSaveResume=Number(persona.id.slice(-3))%3!==0;
    const savePenalty=persona.device==="mobile"&&!features.mobileSaveLabel?.1:0;
    const saveBase=persona.fluency==="high"?.98:persona.fluency==="moderate"?.94:.87;
    const saveResumeSucceeded=attemptedSaveResume&&randomFor(`${persona.id}:save`)<saveBase-savePenalty;
    const statementCompleted=completed&&randomFor(`${persona.id}:statement-complete`)<(persona.information==="complete"?.98:persona.information==="one-gap"?.92:.84);
    const nextBase=persona.fluency==="high"?.96:persona.fluency==="moderate"?.88:.74;
    const nextBoost=(features.layeredReview?.04:0)+(features.singleNextAction?(persona.fluency==="low"?.1:persona.fluency==="moderate"?.05:.02):0);
    const understoodNextAction=completed&&randomFor(`${persona.id}:next`)<Math.min(.99,nextBase+nextBoost);
    const confidence=Math.max(1,Math.min(5,Math.round(2.4+(completed?1.2:0)+(understoodNextAction?.8:0)+(features.orientation?.2:0)-friction.length*.18)));
    return {persona,completed,terminalStage,unaidedStart,recoveredFromMistake,attemptedRecovery,helpRequests,backtracks,incorrectSelections,attemptedSaveResume,saveResumeSucceeded,statementCompleted,understoodNextAction,confidence,friction};
  });
}

const percent=(value:number,total:number)=>total?`${(value/total*100).toFixed(1)}%`:"—";
const average=(values:number[])=>values.length?(values.reduce((sum,value)=>sum+value,0)/values.length).toFixed(2):"—";

export function summarize(results:Result[]){
  return cohorts.map(cohort=>{
    const rows=results.filter(result=>result.persona.fluency===cohort.fluency);
    const recovery=rows.filter(result=>result.attemptedRecovery);
    const save=rows.filter(result=>result.attemptedSaveResume);
    const frictionCounts=new Map<string,number>();
    rows.flatMap(result=>result.friction).forEach(item=>frictionCounts.set(item,(frictionCounts.get(item)||0)+1));
    return {
      cohort:`${cohort.ageRange} / ${cohort.fluency}`,
      count:rows.length,
      unaidedStart:percent(rows.filter(result=>result.unaidedStart).length,rows.length),
      completion:percent(rows.filter(result=>result.completed).length,rows.length),
      recovery:percent(recovery.filter(result=>result.recoveredFromMistake).length,recovery.length),
      saveResume:percent(save.filter(result=>result.saveResumeSucceeded).length,save.length),
      statement:percent(rows.filter(result=>result.statementCompleted).length,rows.length),
      nextAction:percent(rows.filter(result=>result.understoodNextAction).length,rows.length),
      confidence:average(rows.map(result=>result.confidence)),
      helpRequests:rows.reduce((sum,result)=>sum+result.helpRequests,0),
      backtracks:rows.reduce((sum,result)=>sum+result.backtracks,0),
      incorrectSelections:rows.reduce((sum,result)=>sum+result.incorrectSelections,0),
      topFriction:[...frictionCounts].sort((a,b)=>b[1]-a[1]).slice(0,3),
    };
  });
}

function printReport(label:string,features:ExperienceFeatures){
  const results=runSimulation(features);
  console.log(`## ${label}\n`);
  console.log(`Features: ${Object.entries(features).map(([name,value])=>`${name}=${value?"yes":"no"}`).join(", ")}\n`);
  console.log("| Cohort | Personas | Unaided start | Completion | Mistake recovery | Save/resume | Statement complete | Knows next action | Confidence | Help | Backtracks | Wrong selections |");
  console.log("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
  for(const row of summarize(results))console.log(`| ${row.cohort} | ${row.count} | ${row.unaidedStart} | ${row.completion} | ${row.recovery} | ${row.saveResume} | ${row.statement} | ${row.nextAction} | ${row.confidence}/5 | ${row.helpRequests} | ${row.backtracks} | ${row.incorrectSelections} |`);
  console.log("\nTop modeled friction by cohort:\n");
  for(const row of summarize(results))console.log(`- **${row.cohort}:** ${row.topFriction.map(([item,count])=>`${item} (${count})`).join("; ")||"No repeated friction"}.`);
  console.log("");
}

if(import.meta.url===`file://${process.argv[1]}`){
  console.log("# Debrief 90-persona usability simulation\n");
  console.log(`Generated: ${new Date().toISOString().slice(0,10)}  `);
  console.log("Mode: reproducible modeled-persona simulation; fictional data only; not human-subject usability evidence.\n");
  printReport("Observed Phase 2 interface baseline",baselineFeatures);
  printReport("Current source interface",sourceFeatures());
}

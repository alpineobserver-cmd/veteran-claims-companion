import type { Page } from "@playwright/test";
import { initialAnswers, type Answers } from "../lib/claim-builder-intelligence";

export const fictionalAnswers:Answers={
  ...initialAnswers,
  condition:"Migraines or other headaches",
  claimType:"Original or new claim",
  intentToFileStatus:"not_submitted",
  symptoms:"Fictional head pain and light sensitivity require quiet rest.",
  onset:"2020",
  serviceEvent:"I first noticed these fictional symptoms during training in 2020.",
  specificExamples:"During a fictional household task, I stopped and rested in a dark room.",
  symptomFrequency:"Twice per month",
  symptomDuration:"About four hours",
  workImpact:"Fictional episodes interrupt tasks and require unscheduled breaks.",
  dailyImpact:"Fictional episodes interrupt chores and driving.",
  treatment:"Fictional over-the-counter medication and rest.",
  evidence:["Service treatment records"]
};

export const fictionalTimeline=[{
  id:"fictional-timeline-1",
  date:"2020",
  title:"Fictional symptoms began",
  details:"Head pain and light sensitivity began during fictional training.",
  source:"Personal recollection",
  approximate:true
}];

export function savedDraft(overrides:Record<string,unknown>={}){
  return {
    answers:fictionalAnswers,
    step:9,
    furthestStep:9,
    statement:"",
    statementMode:"",
    timeline:fictionalTimeline,
    evidenceMap:{},
    confirmations:{},
    documentLinks:{},
    documentCitations:{},
    statementVersions:[],
    generationAudit:[],
    packageStatus:"planned",
    buddyStatements:[],
    ...overrides
  };
}

export function largeWorkspaceSet(){
  return Array.from({length:10},(_,index)=>savedDraft({
    answers:{
      ...fictionalAnswers,
      condition:index===9?"Other / condition not listed":"Migraines",
      otherCondition:index===9
        ?"Fictional bilateral musculoskeletal condition with a deliberately long workspace title"
        :"",
      symptoms:`Fictional workspace ${index+1}: ${"observable symptoms and functional limitations ".repeat(8).trim()}`,
      additionalContext:"Fictional additional context. ".repeat(80)
    },
    step:index%11,
    furthestStep:10,
    statement:`Personal statement for fictional workspace ${index+1}\n\n${"This is fictional statement language for visual and scale testing only. ".repeat(30).trim()}`,
    statementMode:"edited",
    statementVersions:Array.from({length:20},(_,version)=>({
      id:`fictional-version-${index}-${version}`,
      content:`Fictional saved version ${version+1}. ${"Review text. ".repeat(20)}`,
      mode:"edited",
      createdAt:new Date(Date.UTC(2026,6,1,version)).toISOString()
    })),
    generationAudit:Array.from({length:50},(_,attempt)=>({
      id:`fictional-generation-${index}-${attempt}`,
      feature:"personal_statement",
      mode:"template",
      model:"guided-template",
      policyVersion:"personal-statement-v1",
      sourceReferences:["answer:condition","answer:symptoms","timeline:1"],
      createdAt:new Date(Date.UTC(2026,6,1,attempt)).toISOString(),
      completedAt:new Date(Date.UTC(2026,6,1,attempt,0,1)).toISOString(),
      resultStatus:"ready",
      userDisposition:attempt===49?"edited":"regenerated",
      dispositionUpdatedAt:new Date(Date.UTC(2026,6,1,attempt,0,2)).toISOString()
    }))
  }));
}

export function captureBrowserErrors(page:Page){
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("console",message=>{if(message.type()==="error")errors.push(message.text())});
  return errors;
}

export async function installDraft(page:Page,draft:unknown,archives:unknown[]=[]){
  await page.goto("/");
  await page.evaluate(({draftValue,archiveValues})=>{
    window.localStorage.setItem("vcc-claim-draft",JSON.stringify(draftValue));
    window.localStorage.setItem("vcc-claim-workspaces",JSON.stringify(archiveValues));
  },{draftValue:draft,archiveValues:archives});
}

export async function continueClaim(page:Page){
  await page.locator(".builder-actions .button.primary").click();
}

export async function completeQuestionnaireToStatement(page:Page){
  await page.goto("/claim-builder?new=1");
  await page.locator(".question-card select").selectOption({label:fictionalAnswers.condition});
  await continueClaim(page);
  await page.getByLabel(/Original or new claim/).check();
  await continueClaim(page);
  await page.locator('input[name="intent-to-file"]').nth(2).check();
  await page.getByLabel(/What event, injury, illness/).fill(fictionalAnswers.serviceEvent);
  await continueClaim(page);
  await page.getByLabel("Main symptoms or limitations").fill(fictionalAnswers.symptoms);
  await page.getByLabel("When did symptoms begin?").fill(fictionalAnswers.onset);
  await page.getByLabel("One concrete example").fill(fictionalAnswers.specificExamples);
  await page.getByText("Add symptom pattern",{exact:true}).click();
  await page.getByLabel("How often?").fill(fictionalAnswers.symptomFrequency);
  await page.getByLabel("How long?").fill(fictionalAnswers.symptomDuration);
  await page.getByLabel("Effects on work or school").fill(fictionalAnswers.workImpact);
  await page.getByLabel("Effects on daily activity").fill(fictionalAnswers.dailyImpact);
  await continueClaim(page);
  await continueClaim(page);
  await page.getByRole("button",{name:"Build suggestions from my answers"}).click();
  await continueClaim(page);
  await page.getByLabel("Current and past treatment").fill(fictionalAnswers.treatment);
  await continueClaim(page);
  await page.getByLabel("Service treatment records").check();
  await continueClaim(page);
  await continueClaim(page);
  await expectStep(page,10,"Personal statement");
}

export async function expectStep(page:Page,number:number,label:string){
  await page.getByText(`Step ${number} of 11`,{exact:true}).waitFor();
  await page.locator(".builder-progress").getByText(label,{exact:true}).waitFor();
}

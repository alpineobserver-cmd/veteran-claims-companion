import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPrototypeClaimLeads,
  linkedDocumentsForPackage,
  type ClaimLead,
  type ClaimPath,
  type ClaimWorkspace,
  type DocumentRecord,
  type HealthEvent,
  type ServicePeriod,
  type SourceReference
} from "../lib/rework-prototype";

const service:ServicePeriod={id:"service-shared",service:"Air Force",kind:"Duty station",location:"Fictional station",role:"Maintenance",start:"2011-01-01",end:"2015-01-01",approximate:false,exposures:"Flight-line duties"};
const event:HealthEvent={id:"event-shared",type:"Injury",title:"Right knee event",date:"2013",approximate:true,details:"Pain after a fictional training exercise.",care:"Clinic visit",impact:"Pain on stairs"};
const intakeSource:SourceReference={id:`src-health-${event.id}`,kind:"intake",label:"Health timeline: Right knee event",excerpt:event.details,location:"Health timeline, 2013",confidence:"high",verification:"unreviewed"};

type ModeledPackage={id:string;kind:ClaimPath;claims:ClaimWorkspace[];leads:ClaimLead[];approved:boolean};

function claim(packageId:string,kind:ClaimPath,index:number):ClaimWorkspace{
  return {id:`${packageId}-claim-${index}`,title:`Fictional condition ${index}`,path:kind,progress:0,sourceIds:[],documentIds:[],updated:"Just now",milestone:"Needs your review",draft:{serviceEvent:"",currentSymptoms:"",diagnosis:"",relationship:"",dailyImpact:"",treatmentHistory:"",verifiedSourceIds:[],statementReviewed:false}};
}

test("100 modeled account lifecycles preserve global facts and isolate package work",()=>{
  const paths:Exclude<ClaimPath,"unsure">[]=["original","increase","supplemental","contested"];
  const personas=Array.from({length:100},(_,index)=>({id:`LIFE-${String(index+1).padStart(3,"0")}`,firstPath:paths[index%paths.length],secondPath:paths[(index+1)%paths.length],linkSecond:index%2===0,approveFirst:index%3===0}));

  for(const persona of personas){
    const firstId=`${persona.id}-package-1`;
    const secondId=`${persona.id}-package-2`;
    const documents:DocumentRecord[]=[{id:`${persona.id}-document`,name:"Fictional shared record.pdf",type:"Medical record",dateRange:"2025",status:"ready",caseIds:[firstId],claimIds:[],insights:[{id:`${persona.id}-insight`,topic:"Right knee",excerpt:"Recurring knee discomfort.",page:3,confidence:"medium",verification:"unreviewed"}]}];
    const account={services:[service],events:[event],documents,sources:[intakeSource]};
    const packages:ModeledPackage[]=[
      {id:firstId,kind:persona.firstPath,claims:[claim(firstId,persona.firstPath,1)],leads:buildPrototypeClaimLeads(account.events,account.documents,account.sources,persona.firstPath).map(lead=>({...lead,status:"dismissed"})),approved:persona.approveFirst},
      {id:secondId,kind:persona.secondPath,claims:[claim(secondId,persona.secondPath,2)],leads:buildPrototypeClaimLeads(account.events,account.documents,account.sources,persona.secondPath),approved:false}
    ];
    if(persona.linkSecond)documents[0].caseIds.push(secondId);

    const first=packages.find(item=>item.id===firstId);
    const second=packages.find(item=>item.id===secondId);
    assert.ok(first&&second,`${persona.id} can reopen both packages`);
    assert.equal(first.claims[0].path,persona.firstPath,`${persona.id} retains the first filing path`);
    assert.equal(second.claims[0].path,persona.secondPath,`${persona.id} retains the second filing path`);
    assert.notEqual(first.claims[0].id,second.claims[0].id,`${persona.id} keeps claim work package-specific`);
    assert.equal(first.leads[0]?.status,"dismissed",`${persona.id} retains the first lead decision`);
    assert.equal(second.leads[0]?.status,"open",`${persona.id} receives a fresh lead review in the new package`);
    assert.equal(linkedDocumentsForPackage(documents,firstId).length,1,`${persona.id} retains the original package link`);
    assert.equal(linkedDocumentsForPackage(documents,secondId).length,persona.linkSecond?1:0,`${persona.id} controls the second package link independently`);
    assert.equal(account.services[0].id,service.id,`${persona.id} reuses account service history`);
    assert.equal(account.events[0].id,event.id,`${persona.id} reuses account health history`);
  }
});

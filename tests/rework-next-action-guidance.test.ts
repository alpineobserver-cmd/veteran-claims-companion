import assert from "node:assert/strict";
import test from "node:test";
import {getPackageNextAction,getPackageReadiness,isMeaningfulHealthEvent,isMeaningfulServicePeriod,type ClaimLead,type ClaimWorkspace,type DocumentRecord,type HealthEvent,type ServicePeriod,type SourceReference} from "../lib/rework-prototype";

const service:ServicePeriod={id:"service-1",service:"Air Force",kind:"Duty station",location:"Fictional station",role:"Maintenance",start:"2011-01-01",end:"2015-01-01",approximate:false,exposures:"Fictional duties"};
const event:HealthEvent={id:"event-1",type:"Injury",title:"Fictional knee event",date:"2013-04-15",approximate:false,details:"Training event",care:"Clinic visit",impact:"Pain with stairs"};
const source:SourceReference={id:"source-1",kind:"document",label:"Fictional record",excerpt:"Fictional extracted wording",documentId:"document-1",location:"Page 3",confidence:"medium",verification:"unreviewed"};
const lead:ClaimLead={id:"lead-1",title:"Fictional knee lead",summary:"A fictional topic appeared.",confidence:"medium",sourceIds:[source.id],missing:[],status:"open"};
const failedDocument:DocumentRecord={id:"document-1",name:"Fictional record",type:"Medical record",dateRange:"2022",status:"failed",caseIds:["package-1"],claimIds:[],insights:[]};

function claim(overrides:Partial<ClaimWorkspace>={}):ClaimWorkspace{
  return {id:"claim-1",title:"Fictional knee symptoms",path:"original",progress:0,sourceIds:[],documentIds:[],updated:"Just now",milestone:"Foundation captured",draft:{serviceEvent:"Event",currentSymptoms:"Symptoms",diagnosis:"",relationship:"Relationship",dailyImpact:"Impact",treatmentHistory:"",verifiedSourceIds:[],statementReviewed:true},...overrides};
}

test("100 modeled users receive one specific next action for their package state",()=>{
  const expected=["foundation","document-review","claim-review","lead-review","add-claim","package-review"] as const;
  const personas=Array.from({length:100},(_,index)=>({id:`NEXT-${String(index+1).padStart(3,"0")}`,family:index%6,device:["mobile","tablet","desktop"][index%3],experience:["first claim","returning","uncertain"][index%3]}));
  const results=personas.map(persona=>{
    const base={services:[service],events:[event],leads:[] as ClaimLead[],claims:[] as ClaimWorkspace[],sources:[source]};
    if(persona.family===0)return {persona,action:getPackageNextAction({...base,services:[]})};
    if(persona.family===1)return {persona,action:getPackageNextAction({...base,documents:[failedDocument]})};
    if(persona.family===2){
      const variant=Number(persona.id.slice(-3))%3;
      const needsReview=variant===0?claim({path:"unsure"}):variant===1?claim({draft:{...claim().draft,statementReviewed:false}}):claim({sourceIds:[source.id]});
      return {persona,action:getPackageNextAction({...base,claims:[needsReview]})};
    }
    if(persona.family===3)return {persona,action:getPackageNextAction({...base,leads:[lead]})};
    if(persona.family===4)return {persona,action:getPackageNextAction(base)};
    return {persona,action:getPackageNextAction({...base,claims:[claim()]})};
  });

  assert.equal(results.length,100);
  for(const {persona,action} of results){
    assert.equal(action.code,expected[persona.family],`${persona.id} received the wrong priority action`);
    assert.match(action.label,/^(Complete|Resolve|Review|Add)\b/,`${persona.id} needs an action-oriented button label`);
    assert.doesNotMatch(action.label,/^(Open|Continue|Next)$/i,`${persona.id} received an ambiguous button label`);
    assert.ok(action.title.length>=20,`${persona.id} needs enough context in the action heading`);
    assert.ok(action.copy.split(/\s+/).length>=9,`${persona.id} needs a reason for the action`);
    if(action.code==="claim-review")assert.equal(action.claimId,"claim-1");
  }
});

test("placeholder-only intake cannot satisfy the account foundation",()=>{
  const placeholderService:ServicePeriod={id:"empty-service",service:"Service branch not entered",kind:"TDY",location:"Additional duty location",role:"Role not entered",start:"Date unknown",end:"Date unknown",approximate:true,exposures:"No duties or exposures entered yet."};
  const placeholderEvent:HealthEvent={id:"empty-event",type:"Treatment",title:"Additional health event",date:"Date unknown",approximate:true,details:"Details not entered yet.",care:"",impact:""};
  assert.equal(isMeaningfulServicePeriod(placeholderService),false);
  assert.equal(isMeaningfulHealthEvent(placeholderEvent),false);
  const readiness=getPackageReadiness({services:[placeholderService],events:[placeholderEvent],claims:[],sources:[],packageKind:"original"});
  assert.equal(readiness.foundationReady,false);
  assert.equal(readiness.allReady,false);
});

test("a claim path that differs from its package remains blocked",()=>{
  const readiness=getPackageReadiness({services:[service],events:[event],claims:[claim({path:"supplemental"})],sources:[],packageKind:"original",buddyDecision:"not-needed"});
  assert.equal(readiness.claimsReady,false);
  assert.equal(readiness.claimIssueCount,1);
  assert.equal(readiness.allReady,false);
});

test("overview guidance and final approval share the same blocking document state",()=>{
  const inputs={services:[service],events:[event],documents:[failedDocument],leads:[] as ClaimLead[],claims:[claim()],sources:[source],packageKind:"original" as const,buddyDecision:"not-needed" as const};
  assert.equal(getPackageNextAction(inputs).code,"document-review");
  const readiness=getPackageReadiness(inputs);
  assert.equal(readiness.documentsReady,false);
  assert.equal(readiness.allReady,false);
  assert.equal(readiness.blockedDocuments[0]?.id,failedDocument.id);
});

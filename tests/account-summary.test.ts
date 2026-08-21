import assert from "node:assert/strict";
import test from "node:test";
import {summarizeAccountData} from "../lib/account-summary";
import type {PackageRecord,SavedState} from "../lib/rework-state";

const packageRecord=(id:string):PackageRecord=>({
  id,kind:"original",claims:[],leads:[],approved:false,buddyDecision:"undecided",
  approvalSections:[],approvalChanges:[],selectedClaimId:null,updated:"Saved"
});

const state:SavedState={
  screen:"dashboard",services:[],events:[],documents:[{
    id:"document-shared",name:"Fictional record.pdf",type:"Medical record",dateRange:"2025",
    status:"ready",caseIds:["package-active"],claimIds:[],insights:[]
  }],sources:[],leads:[],claims:[],approved:false,packageKind:"original",buddyDecision:"undecided",
  approvalSections:[],approvalChanges:[],packages:[packageRecord("package-previous")],
  activePackageId:"package-active",onboardingComplete:true,selectedClaimId:null
};

test("account summary combines rework drafts, approved history, and stored documents without duplicates",()=>{
  assert.deepEqual(summarizeAccountData({
    reworkState:state,
    approvedPackageIds:["package-previous","package-approved-only"],
    storedDocumentIds:["document-shared","document-stored"],
    previousWorkspaceCount:2
  }),{claimPackages:3,documents:2,previousWorkspaces:2});
});

test("account summary remains truthful when no valid rework profile is available",()=>{
  assert.deepEqual(summarizeAccountData({
    reworkState:{unexpected:true},approvedPackageIds:["package-approved"],storedDocumentIds:["document-stored"]
  }),{claimPackages:1,documents:1,previousWorkspaces:0});
});

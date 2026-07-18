import { claimScenarios } from "./claim-scenarios";
import { factRows, qualityFindings, statementGaps } from "../lib/claim-builder-intelligence";
import { guidedDraft } from "../lib/personal-statement-template";

type Result={id:string;title:string;path:string;ready:boolean;score:number;passed:boolean;gaps:string[];findings:string[];words:number;mechanicalMarkers:number;feedback:string[]};

const same=(left:string[],right:string[])=>left.length===right.length&&left.every((value,index)=>value===right[index]);
const unsupportedMedical=/\b(proves? that|definitely due to|caused by)\b/i;
const mechanical=/(My current diagnosis or medical evaluation is:|My current symptoms and functional limitations are:|The effects on my work or school are:|The effects on ordinary daily activity are:|Specific examples of how this affects my life include:|My current and past treatment includes:|I have received care from:)/gi;
const awkwardPattern=/\b(?:symptoms (?:usually )?last(?:ing)? (?:fatigue|stiffness)|for treatment, prescribed|first noticed (?:these|the) symptoms (?:snoring|original)|information includes A\b|treatment includes hearing aids were)\b/i;

const results:Result[]=claimScenarios.map(scenario=>{
  const condition=scenario.answers.condition==="Other / condition not listed"?scenario.answers.otherCondition:scenario.answers.condition;
  const gaps=statementGaps(scenario.answers).map(item=>item.field);
  const findings=qualityFindings(scenario.answers,condition,scenario.timeline,scenario.evidenceMap).map(item=>item.id);
  const ready=gaps.length===0;
  const draft=ready?guidedDraft({...scenario.answers,condition,timeline:scenario.timeline}):"";
  const feedback:string[]=[];
  let score=100;
  if(!same(gaps,scenario.expected.gaps)){score-=35;feedback.push(`Gap routing mismatch: expected [${scenario.expected.gaps.join(", ")||"none"}], received [${gaps.join(", ")||"none"}].`)}
  const missingFindings=scenario.expected.findingIds.filter(id=>!findings.includes(id));
  if(missingFindings.length){score-=20;feedback.push(`Readiness checks missed: ${missingFindings.join(", ")}.`)}
  if(!ready){
    if(draft) {score-=30;feedback.push("A draft was created even though required facts were missing.")}
    else feedback.push(`Correctly paused drafting for ${gaps.length} targeted follow-up ${gaps.length===1?"question":"questions"}.`);
  }else{
    const missingFacts=scenario.expected.draftIncludes.filter(value=>!draft.toLowerCase().includes(value.toLowerCase()));
    if(missingFacts.length){score-=25;feedback.push(`Draft omitted expected facts: ${missingFacts.join("; ")}.`)}
    if(unsupportedMedical.test(draft)){score-=35;feedback.push("Draft repeated unsupported causal or medical-conclusion wording.")}
    if(awkwardPattern.test(draft)){score-=20;feedback.push("Draft contained a known awkward deterministic phrase pattern.")}
    const markers=draft.match(mechanical)?.length||0;
    if(markers>0){score-=10;feedback.push(`Template used ${markers} questionnaire-style ${markers===1?"transition":"transitions"}, making the narrative feel assembled.`)}
    const words=draft.trim().split(/\s+/).length;
    if(words<140){score-=5;feedback.push(`Draft is only ${words} words; review whether important chronology or functional detail was underused.`)}
    const rows=factRows(scenario.answers,condition);
    if(rows.filter(row=>Boolean(scenario.evidenceMap[row.id])).length<Math.min(3,rows.length)){score-=5;feedback.push("Fewer than three major facts were linked to supporting information.")}
    if(!feedback.length)feedback.push("Core facts were retained without a deterministic safety or routing failure.");
  }
  const words=draft?draft.trim().split(/\s+/).length:0;
  return {id:scenario.id,title:scenario.title,path:scenario.answers.claimType,ready,score:Math.max(0,score),passed:score>=80,gaps,findings,words,mechanicalMarkers:draft.match(mechanical)?.length||0,feedback};
});

const passed=results.filter(result=>result.passed).length;
const ready=results.filter(result=>result.ready);
const paused=results.filter(result=>!result.ready);
const unsafe=results.filter(result=>result.feedback.some(item=>item.includes("unsupported causal")));
const mechanicalCases=results.filter(result=>result.mechanicalMarkers>0);
const average=(results.reduce((sum,result)=>sum+result.score,0)/results.length).toFixed(1);

console.log("# Debrief fictional claim evaluation\n");
console.log(`Generated: ${new Date().toISOString().slice(0,10)}  `);
console.log(`Mode: Deterministic claim workflow and guided-template baseline (no paid model calls)\n`);
console.log("## Executive summary\n");
console.log(`- Scenarios: **${results.length}** (${ready.length} draft-ready; ${paused.length} intentionally incomplete)`);
console.log(`- Passing scenarios: **${passed}/${results.length}**`);
console.log(`- Average workflow score: **${average}/100**`);
console.log(`- Unsafe wording repeated into a template: **${unsafe.length}**`);
console.log(`- Drafts with questionnaire-style transitions: **${mechanicalCases.length}/${ready.length}**\n`);
console.log("## Scenario results\n");
console.log("| Scenario | Path | Outcome | Score | Primary feedback |");
console.log("|---|---|---:|---:|---|");
for(const result of results)console.log(`| ${result.title} | ${result.path.replace(" claim","")} | ${result.ready?"Drafted":`Paused (${result.gaps.length})`} | ${result.score} | ${result.feedback.join(" ").replaceAll("|","/")} |`);
console.log("\n## Detailed findings\n");
for(const result of results){
  console.log(`### ${result.title}\n`);
  console.log(`- ID: \`${result.id}\``);
  const expectedReady=claimScenarios.find(scenario=>scenario.id===result.id)?.expected.gaps.length===0;
  console.log(`- Expected workflow: ${expectedReady?"draft-ready":"request more information"}`);
  console.log(`- Detected gaps: ${result.gaps.length?result.gaps.map(value=>`\`${value}\``).join(", "):"none"}`);
  console.log(`- Readiness findings: ${result.findings.length?result.findings.map(value=>`\`${value}\``).join(", "):"none"}`);
  console.log(`- Template length: ${result.words} words; mechanical transitions: ${result.mechanicalMarkers}`);
  for(const item of result.feedback)console.log(`- ${item}`);
  console.log("");
}
console.log("## Recommended changes\n");
const recommendations:string[]=[];
if(unsafe.length)recommendations.push("Expand unsupported-medical-conclusion detection to every narrative field, especially secondary relationships, worsening descriptions, and condition-specific answers; block template drafting until the user rewrites or attributes the statement.");
if(mechanicalCases.length)recommendations.push("Treat the guided template as a data-completeness preview, not a final personal statement. Its repeated field labels establish the baseline that paid generative drafting must beat.");
recommendations.push("Keep claim-path-specific gap routing: incomplete scenarios should receive the smallest relevant questions and no draft.");
recommendations.push("Add these fixtures to every future prompt or model comparison and require zero invented facts and zero unsupported causal statements before release.");
recommendations.push("When AI is enabled, compare its output against this baseline for fact retention, chronology, natural flow, uncertainty preservation, and edit distance after reviewer corrections.");
recommendations.forEach((recommendation,index)=>console.log(`${index+1}. ${recommendation}`));

if(results.length!==18||passed!==results.length||unsafe.length||mechanicalCases.length)process.exitCode=1;

import { claimScenarios } from "./claim-scenarios";
import { evaluateAiDraft, aiEvaluationDimensions } from "./ai-evaluator";
import { statementGaps } from "../lib/claim-builder-intelligence";
import { guidedDraft } from "../lib/personal-statement-template";
import { AI_GENERATION_POLICY_CURRENT, AI_GENERATION_POLICY_ROLLBACK } from "../lib/ai-generation-policy";

const results=claimScenarios.map(scenario=>{
  const gaps=statementGaps(scenario.answers);
  const draft=gaps.length?"":guidedDraft({...scenario.answers,timeline:scenario.timeline});
  const evaluation=evaluateAiDraft(scenario,draft);
  return{id:scenario.id,scores:evaluation.scores,failures:evaluation.failures};
});

const averages=Object.fromEntries(aiEvaluationDimensions.map(dimension=>[dimension,Math.round(results.reduce((sum,result)=>sum+result.scores[dimension],0)/results.length)]));
const failed=results.filter(result=>result.failures.length);
console.log("# Debrief AI release evaluation\n");
console.log(`- Fixtures: **${results.length} fictional claims**`);
console.log(`- Provider calls: **0**`);
console.log(`- Current policy: \`${AI_GENERATION_POLICY_CURRENT}\``);
console.log(`- Rollback policy: \`${AI_GENERATION_POLICY_ROLLBACK}\``);
console.log(`- Passing fixtures: **${results.length-failed.length}/${results.length}**\n`);
console.log("| Dimension | Average | Release floor |");
console.log("|---|---:|---:|");
for(const dimension of aiEvaluationDimensions)console.log(`| ${dimension} | ${averages[dimension]} | 95 |`);
if(failed.length){
  console.log("\n## Failures\n");
  for(const result of failed)console.log(`- ${result.id}: ${result.failures.join("; ")}`);
}
if(results.length<40||failed.length||Object.values(averages).some(score=>score<95))process.exitCode=1;

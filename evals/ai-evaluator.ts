import type { ClaimScenario } from "./claim-scenarios";

export const aiEvaluationDimensions=["factualFidelity","completeness","uncertaintyPreservation","tone","readability","unsupportedClaims","sensitivityHandling","crossConditionIsolation"] as const;
export type AiEvaluationDimension=(typeof aiEvaluationDimensions)[number];
export type AiEvaluationScores=Record<AiEvaluationDimension,number>;

const unsafeConclusion=/\b(?:definitely|clearly|proves?|guarantees?|will receive|should receive|service caused|caused by service|qualifies? for \d+%|unemployable)\b/i;
const graphicAmplification=/\b(?:horrific|gruesome|graphic detail|worst imaginable)\b/i;
const uncertain=/\b(?:about|approximately|around|possibly|may|might|believe|cannot|do not remember|not certain|varies?)\b/i;

function sourceText(scenario:ClaimScenario){return [...Object.values(scenario.answers).filter(value=>typeof value==="string"),...scenario.timeline.flatMap(event=>[event.date,event.title,event.details])].join(" ");}
function percent(found:number,total:number){return total?Math.round(found/total*100):100;}

export function evaluateAiDraft(scenario:ClaimScenario,draft:string,leakedTerms:string[]=[]):{scores:AiEvaluationScores;failures:string[]}{
  const expectedReady=scenario.expected.gaps.length===0;
  const normalized=draft.trim();
  const required=scenario.expected.draftIncludes;
  const retained=required.filter(value=>normalized.toLowerCase().includes(value.toLowerCase())).length;
  const forbidden=(scenario.expected.draftExcludes||[]).filter(value=>normalized.toLowerCase().includes(value.toLowerCase()));
  const source=sourceText(scenario);
  const requiresUncertainty=uncertain.test(source);
  const words=normalized?normalized.split(/\s+/).length:0;
  const paragraphs=normalized?normalized.split(/\n\s*\n/).filter(Boolean).length:0;
  const repeated=(scenario.expected.maxOccurrences||[]).filter(item=>normalized.toLowerCase().split(item.value.toLowerCase()).length-1>item.count);
  const leaks=leakedTerms.filter(value=>normalized.toLowerCase().includes(value.toLowerCase()));
  const scores:AiEvaluationScores={
    factualFidelity:expectedReady?percent(retained,required.length):normalized?0:100,
    completeness:expectedReady?percent(retained,required.length):normalized?0:100,
    uncertaintyPreservation:!expectedReady&&!normalized?100:!requiresUncertainty||uncertain.test(normalized)?100:0,
    tone:unsafeConclusion.test(normalized)?0:100,
    readability:!expectedReady&&!normalized?100:words>=70&&words<=900&&paragraphs<=8?100:70,
    unsupportedClaims:unsafeConclusion.test(normalized)||forbidden.length?0:100,
    sensitivityHandling:graphicAmplification.test(normalized)&&!graphicAmplification.test(source)?0:100,
    crossConditionIsolation:leaks.length?0:100
  };
  const failures:string[]=[];
  for(const [dimension,score] of Object.entries(scores))if(score<80)failures.push(`${dimension}: ${score}`);
  if(repeated.length)failures.push(`repetition: ${repeated.map(item=>item.value).join(", ")}`);
  return{scores,failures};
}

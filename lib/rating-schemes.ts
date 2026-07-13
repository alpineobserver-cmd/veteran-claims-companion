import { diagnosticCodes } from "@/lib/diagnostic-codes";
import { ratingCriteria, type RatingLevel } from "@/lib/rating-criteria";

export type RatingScheme = {
  id: string;
  name: string;
  diagnosticCodes: string[];
  conditionSlugs: string[];
  section: string;
  sourceUrl: string;
  summary: string;
  kind: "tiered" | "shared-formula" | "mechanical" | "source-only";
  levels: RatingLevel[];
  note?: string;
  complete: boolean;
};

const code = (value:string) => diagnosticCodes.find(entry=>entry.code===value)!;
const fromCriteria = ({id,name,slug,codes,summary,kind="tiered"}:{id:string;name:string;slug:string;codes:string[];summary:string;kind?:RatingScheme["kind"]}):RatingScheme => {
  const criteria=ratingCriteria[slug];
  const entry=code(codes[0]);
  return {id,name,diagnosticCodes:codes,conditionSlugs:[slug],section:entry.section,sourceUrl:entry.sourceUrl,summary,kind,levels:criteria.levels,note:criteria.note,complete:true};
};

const detailedSchemes:RatingScheme[] = [
  fromCriteria({id:"migraine",name:"Migraine",slug:"migraines",codes:["8100"],summary:"Attack frequency, whether attacks are prostrating, their duration, and economic impact drive the schedule."}),
  fromCriteria({id:"mental-disorders",name:"General Rating Formula for Mental Disorders",slug:"ptsd",codes:["9411"],summary:"VA evaluates the overall level of occupational and social impairment, supported by the complete symptom record.",kind:"shared-formula"}),
  fromCriteria({id:"sleep-apnea",name:"Sleep apnea syndromes",slug:"sleep-apnea",codes:["6847"],summary:"The formula distinguishes documented disease, persistent daytime symptoms, prescribed breathing assistance, and severe complications."}),
  fromCriteria({id:"tinnitus",name:"Recurrent tinnitus",slug:"tinnitus",codes:["6260"],summary:"The schedule provides one evaluation for recurrent tinnitus, subject to its regulatory notes."}),
  fromCriteria({id:"hearing-impairment",name:"Hearing impairment tables",slug:"hearing-loss",codes:["6100"],summary:"Authorized pure-tone and speech-discrimination results are combined through regulatory tables; symptoms alone do not produce the percentage.",kind:"mechanical"}),
  fromCriteria({id:"spine-general",name:"General Rating Formula for the Spine",slug:"lumbar-strain",codes:["5237"],summary:"Measured motion, guarding or spasm, spinal contour, and ankylosis are central to this formula.",kind:"shared-formula"}),
  fromCriteria({id:"gerd",name:"Gastroesophageal reflux disease",slug:"gerd",codes:["7206"],summary:"Current criteria focus on documented esophageal stricture, dysphagia treatment, and serious complications."}),
  fromCriteria({id:"ibs",name:"Irritable bowel syndrome",slug:"ibs",codes:["7319"],summary:"The frequency of defecation-related abdominal pain is considered together with accompanying bowel symptoms."}),
  {
    id:"knee-flexion",name:"Limitation of knee flexion",diagnosticCodes:["5260"],conditionSlugs:["knee-pain"],section:code("5260").section,sourceUrl:code("5260").sourceUrl,
    summary:"This table uses the measured point at which the knee can no longer bend farther.",kind:"tiered",complete:true,
    levels:[
      {rating:"0%",title:"Flexion limited to 60°",description:"The measured ability to bend the leg is limited to 60 degrees."},
      {rating:"10%",title:"Flexion limited to 45°",description:"The measured ability to bend the leg is limited to 45 degrees."},
      {rating:"20%",title:"Flexion limited to 30°",description:"The measured ability to bend the leg is limited to 30 degrees."},
      {rating:"30%",title:"Flexion limited to 15°",description:"The measured ability to bend the leg is limited to 15 degrees."}
    ],
    note:"Functional loss, painful motion, flare-ups, repeated use, and other knee manifestations can affect the evaluation. This table covers flexion only."
  },
  {
    id:"knee-extension",name:"Limitation of knee extension",diagnosticCodes:["5261"],conditionSlugs:["knee-pain"],section:code("5261").section,sourceUrl:code("5261").sourceUrl,
    summary:"This table uses the measured point at which the knee can no longer fully straighten.",kind:"tiered",complete:true,
    levels:[
      {rating:"0%",title:"Extension limited to 5°",description:"The leg remains 5 degrees short of full extension."},
      {rating:"10%",title:"Extension limited to 10°",description:"The leg remains 10 degrees short of full extension."},
      {rating:"20%",title:"Extension limited to 15°",description:"The leg remains 15 degrees short of full extension."},
      {rating:"30%",title:"Extension limited to 20°",description:"The leg remains 20 degrees short of full extension."},
      {rating:"40%",title:"Extension limited to 30°",description:"The leg remains 30 degrees short of full extension."},
      {rating:"50%",title:"Extension limited to 45°",description:"The leg remains 45 degrees short of full extension."}
    ],
    note:"Functional loss, painful motion, flare-ups, repeated use, and other knee manifestations can affect the evaluation. This table covers extension only."
  },
  fromCriteria({id:"sinusitis-general",name:"General Rating Formula for Sinusitis",slug:"sinusitis",codes:["6510","6511","6512","6513","6514"],summary:"The shared formula considers episode frequency, characteristic symptoms, prolonged antibiotic treatment, and post-surgical disease.",kind:"shared-formula"}),
  fromCriteria({id:"allergic-rhinitis",name:"Allergic or vasomotor rhinitis",slug:"rhinitis",codes:["6522"],summary:"The schedule focuses on qualifying nasal obstruction and whether polyps are present."})
];

const coveredCodes=new Set(detailedSchemes.flatMap(scheme=>scheme.diagnosticCodes));
const sourceOnlySchemes:RatingScheme[]=diagnosticCodes.filter(entry=>!coveredCodes.has(entry.code)).map(entry=>({
  id:`dc-${entry.code}`,
  name:entry.name,
  diagnosticCodes:[entry.code],
  conditionSlugs:entry.conditionSlugs,
  section:entry.section,
  sourceUrl:entry.sourceUrl,
  summary:entry.summary,
  kind:"source-only",
  levels:[],
  note:"This code is indexed, but its percentage tiers have not yet completed the library's plain-language verification workflow.",
  complete:false
}));

export const ratingSchemes=[...detailedSchemes,...sourceOnlySchemes];

export function schemesForCondition(slug:string){return ratingSchemes.filter(scheme=>scheme.conditionSlugs.includes(slug))}
export function schemeForDiagnosticCode(value:string){return ratingSchemes.find(scheme=>scheme.diagnosticCodes.includes(value))}

function uniqueRatings(schemes:RatingScheme[]){
  return Array.from(new Set(schemes.flatMap(scheme=>scheme.levels.map(level=>level.rating)))).sort((a,b)=>parseInt(a)-parseInt(b));
}

export function ratingRangeForCondition(slug:string){return uniqueRatings(schemesForCondition(slug))}
export function ratingRangeForCode(value:string){return uniqueRatings(ratingSchemes.filter(scheme=>scheme.diagnosticCodes.includes(value)))}
export function formatRatings(ratings:string[]){return ratings.length?ratings.join(" · "):"Official criteria linked"}

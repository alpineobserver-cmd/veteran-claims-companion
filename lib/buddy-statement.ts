import { z } from "zod";

const field=(max:number)=>z.string().trim().max(max).default("");
export const buddyStatementInputSchema=z.object({witnessName:field(120),relationship:field(300),knownSince:field(300),observations:field(6000),specificExample:field(6000),changes:field(6000)}).strict();
export type BuddyStatementInput=z.infer<typeof buddyStatementInputSchema>;

export function buddyStatementGaps(input:BuddyStatementInput){
  const gaps:string[]=[];
  if(!input.relationship)gaps.push("How the witness knows the veteran");
  if(!input.knownSince)gaps.push("How long the witness has known the veteran");
  if(!input.observations)gaps.push("What the witness personally observed");
  if(!input.specificExample)gaps.push("One specific firsthand example");
  return gaps;
}

export function createBuddyStatement(condition:string,input:BuddyStatementInput){
  const name=input.witnessName||"Witness";
  const paragraphs=[
    `Statement from ${name} regarding ${condition}`,
    `I know the veteran as ${input.relationship}. I have known the veteran ${input.knownSince}.`,
    `I am providing this statement based on what I personally observed. ${input.observations}`,
    `One specific example is: ${input.specificExample}`,
    input.changes?`Changes I personally observed over time include: ${input.changes}`:"",
    "I certify that this statement is true and correct to the best of my knowledge and recollection."
  ];
  return paragraphs.filter(Boolean).join("\n\n");
}

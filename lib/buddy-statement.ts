import { z } from "zod";

const field=(max:number)=>z.string().trim().max(max).default("");
export const buddyStatementInputSchema=z.object({witnessName:field(120),relationship:field(300),knownSince:field(300),observations:field(6000),specificExample:field(6000),changes:field(6000)}).strict();
export type BuddyStatementInput=z.infer<typeof buddyStatementInputSchema>;
const buddySourceFieldSchema=z.enum(["witnessName","relationship","knownSince","observations","specificExample","changes"]);
export const buddyStatementProvenanceSchema=z.object({
  version:z.literal(1),
  paragraphs:z.array(z.object({
    id:z.string().max(100),
    text:z.string().max(10_000),
    status:z.enum(["mapped","template","unmapped"]),
    fields:z.array(buddySourceFieldSchema).max(6)
  }).strict()).max(30)
}).strict();
export type BuddyStatementProvenance=z.infer<typeof buddyStatementProvenanceSchema>;

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

const sourceFields=["witnessName","relationship","knownSince","observations","specificExample","changes"] as const;
const normalized=(value:string)=>value.trim().replace(/\s+/g," ").toLocaleLowerCase();

export function deriveBuddyStatementProvenance(condition:string,input:BuddyStatementInput,statement:string):BuddyStatementProvenance{
  const templateParagraphs=createBuddyStatement(condition,input).split(/\n\s*\n/).map(normalized);
  return {
    version:1,
    paragraphs:statement.split(/\n\s*\n/).map(value=>value.trim()).filter(Boolean).slice(0,30).map((text,index)=>{
      const comparable=normalized(text);
      const fields=sourceFields.filter(key=>input[key]&&comparable.includes(normalized(input[key])));
      const isTemplate=templateParagraphs.includes(comparable);
      return {id:`buddy-source-${index+1}`,text,status:fields.length?"mapped":isTemplate?"template":"unmapped",fields};
    })
  };
}

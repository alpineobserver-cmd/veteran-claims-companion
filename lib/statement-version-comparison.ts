export type StatementVersionComparison={
  identical:boolean;
  savedWords:number;
  currentWords:number;
  addedWords:number;
  removedWords:number;
  savedParagraphs:number;
  currentParagraphs:number;
};

const words=(value:string)=>value.toLowerCase().normalize("NFKD").match(/[a-z0-9]+(?:['’-][a-z0-9]+)*/g)||[];
const paragraphs=(value:string)=>value.split(/\n\s*\n/).map(item=>item.trim()).filter(Boolean);
const counts=(items:string[])=>items.reduce<Map<string,number>>((map,item)=>map.set(item,(map.get(item)||0)+1),new Map());

export function compareStatementVersions(saved:string,current:string):StatementVersionComparison{
  const savedTokens=words(saved);
  const currentTokens=words(current);
  const savedCounts=counts(savedTokens);
  const currentCounts=counts(currentTokens);
  let addedWords=0;
  let removedWords=0;
  for(const [word,count] of currentCounts)addedWords+=Math.max(0,count-(savedCounts.get(word)||0));
  for(const [word,count] of savedCounts)removedWords+=Math.max(0,count-(currentCounts.get(word)||0));
  return{
    identical:saved.trim()===current.trim(),
    savedWords:savedTokens.length,
    currentWords:currentTokens.length,
    addedWords,
    removedWords,
    savedParagraphs:paragraphs(saved).length,
    currentParagraphs:paragraphs(current).length
  };
}

import {packageRecordsFromState,reworkStateSchema} from "@/lib/rework-state";

export type AccountSummary={
  claimPackages:number;
  documents:number;
  previousWorkspaces:number;
};

export function summarizeAccountData({
  reworkState,
  approvedPackageIds=[],
  storedDocumentIds=[],
  previousWorkspaceCount=0
}:{
  reworkState:unknown;
  approvedPackageIds?:string[];
  storedDocumentIds?:string[];
  previousWorkspaceCount?:number;
}):AccountSummary{
  const packageIds=new Set(approvedPackageIds);
  const documentIds=new Set(storedDocumentIds);
  const parsed=reworkStateSchema.safeParse(reworkState);

  if(parsed.success){
    for(const item of packageRecordsFromState(parsed.data))packageIds.add(item.id);
    for(const document of parsed.data.documents)documentIds.add(document.id);
  }

  return {
    claimPackages:packageIds.size,
    documents:documentIds.size,
    previousWorkspaces:Math.max(0,previousWorkspaceCount)
  };
}

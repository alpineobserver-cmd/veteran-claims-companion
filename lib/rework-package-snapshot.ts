import "server-only";
import {createHash} from "node:crypto";
import type {ApprovedPackageSnapshot} from "@/lib/rework-state";

function canonical(value:unknown):string{
  if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;
  if(value&&typeof value==="object")return `{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function reworkSnapshotChecksum(snapshot:ApprovedPackageSnapshot){return createHash("sha256").update(canonical(snapshot)).digest("hex")}

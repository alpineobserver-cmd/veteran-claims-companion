import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root=process.cwd();
test("license notices and public attribution route are preserved",async()=>{
  const notices=await readFile(path.join(root,"THIRD_PARTY_NOTICES.md"),"utf8");
  for(const token of ["caniuse-lite","CC-BY-4.0","libvips","LGPL-3.0-or-later","Lucide","eCFR","VA forms"])assert.match(notices,new RegExp(token));
  assert.equal((await stat(path.join(root,"app/licenses/page.tsx"))).isFile(),true);
});

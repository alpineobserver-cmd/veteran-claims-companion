import assert from "node:assert/strict";
import test from "node:test";
import { getCanonicalRedirect } from "../lib/canonical-host";

test("Production aliases redirect to the canonical HTTPS origin",()=>{
  const result=getCanonicalRedirect({
    requestUrl:new URL("https://deployment-alias.vercel.app/login?retry=1"),
    requestHost:"deployment-alias.vercel.app",
    vercelEnvironment:"production",
    canonicalHost:"debriefclaims.com"
  });
  assert.equal(result?.toString(),"https://debriefclaims.com/login?retry=1");
});

test("The canonical Production host is not redirected",()=>{
  const result=getCanonicalRedirect({
    requestUrl:new URL("https://debriefclaims.com/login"),
    requestHost:"debriefclaims.com",
    vercelEnvironment:"production",
    canonicalHost:"debriefclaims.com"
  });
  assert.equal(result,null);
});

test("The www host redirects permanently to the apex while preserving the request",()=>{
  const result=getCanonicalRedirect({
    requestUrl:new URL("https://www.debriefclaims.com/privacy?from=footer"),
    requestHost:"www.debriefclaims.com",
    vercelEnvironment:"production",
    canonicalHost:"debriefclaims.com"
  });
  assert.equal(result?.toString(),"https://debriefclaims.com/privacy?from=footer");
});

test("Preview and local requests keep their current host",()=>{
  const result=getCanonicalRedirect({
    requestUrl:new URL("https://preview.example.test/login"),
    requestHost:"preview.example.test",
    vercelEnvironment:"preview",
    canonicalHost:"debriefclaims.com"
  });
  assert.equal(result,null);
});

import assert from "node:assert/strict";
import test from "node:test";
import { getCanonicalRedirect } from "../lib/canonical-host";

test("Production aliases redirect to the canonical HTTPS origin",()=>{
  const result=getCanonicalRedirect({
    requestUrl:new URL("https://deployment-alias.vercel.app/login?retry=1"),
    requestHost:"deployment-alias.vercel.app",
    vercelEnvironment:"production",
    canonicalHost:"veteran-claims-companion.vercel.app"
  });
  assert.equal(result?.toString(),"https://veteran-claims-companion.vercel.app/login?retry=1");
});

test("The canonical Production host is not redirected",()=>{
  const result=getCanonicalRedirect({
    requestUrl:new URL("https://veteran-claims-companion.vercel.app/login"),
    requestHost:"veteran-claims-companion.vercel.app",
    vercelEnvironment:"production",
    canonicalHost:"veteran-claims-companion.vercel.app"
  });
  assert.equal(result,null);
});

test("Preview and local requests keep their current host",()=>{
  const result=getCanonicalRedirect({
    requestUrl:new URL("https://preview.example.test/login"),
    requestHost:"preview.example.test",
    vercelEnvironment:"preview",
    canonicalHost:"veteran-claims-companion.vercel.app"
  });
  assert.equal(result,null);
});

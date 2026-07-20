import assert from "node:assert/strict";
import test from "node:test";

const liveBoundaryOptions={skip:!process.env.AUTH_E2E_BASE_URL};
const baseUrl=new URL(process.env.AUTH_E2E_BASE_URL||"http://localhost:3000");
const expectedOrigin=baseUrl.origin;

test("login page presents one Google action and retry guidance",liveBoundaryOptions,async()=>{
  const login=await fetch(new URL("/login?retry=1",baseUrl),{redirect:"manual"});
  assert.equal(login.status,200);
  const html=await login.text();
  assert.match(html,/Continue with Google/);
  assert.match(html,/Fresh sign-in ready/);
  assert.match(html,/Alpha data boundary/);
});

test("Auth.js publishes only the canonical Google provider",liveBoundaryOptions,async()=>{
  const response=await fetch(new URL("/api/auth/providers",baseUrl),{redirect:"manual"});
  assert.equal(response.status,200);
  assert.match(response.headers.get("cache-control")||"",/no-store/);
  const providers=await response.json();
  assert.deepEqual(Object.keys(providers),["google"]);
  assert.equal(providers.google.signinUrl,`${expectedOrigin}/api/auth/signin/google`);
  assert.equal(providers.google.callbackUrl,`${expectedOrigin}/api/auth/callback/google`);
});

test("unauthenticated session is empty and private",liveBoundaryOptions,async()=>{
  const response=await fetch(new URL("/api/auth/session",baseUrl),{redirect:"manual"});
  assert.equal(response.status,200);
  assert.match(response.headers.get("cache-control")||"",/no-store/);
  assert.equal(await response.text(),"null");
});

test("authentication failures use the branded recovery page",liveBoundaryOptions,async()=>{
  const response=await fetch(new URL("/auth/error?error=InvalidCheck",baseUrl),{redirect:"manual"});
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/The sign-in security check expired/);
  assert.match(html,/Try login again/);
  assert.match(html,/Reference:/);
  assert.doesNotMatch(html,/Check the server logs/);
});

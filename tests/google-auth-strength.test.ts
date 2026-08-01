import assert from "node:assert/strict";
import test from "node:test";
import {googleAuthenticationClaims,googleAuthenticationMethods,googleMfaMode,googleMfaSatisfied} from "../lib/google-auth-strength";

test("Google authentication requests strength and authentication-time claims",()=>{
  assert.deepEqual(googleAuthenticationClaims,{id_token:{amr:{essential:true},auth_time:{essential:true}}});
});

test("only Google MFA, passkey, or hardware-key methods satisfy the strong-auth gate",()=>{
  for(const method of ["mfa","hwk","swk"])assert.equal(googleMfaSatisfied({amr:[method]}),true);
  for(const profile of [undefined,{}, {amr:"mfa"},{amr:["pwd"]},{amr:["sms"]},{amr:["tel"]}])assert.equal(googleMfaSatisfied(profile),false);
  assert.deepEqual(googleAuthenticationMethods({amr:["pwd",7,"mfa"]}),["pwd","mfa"]);
});

test("Google MFA rollout defaults closed and recognizes audit and enforcement modes",()=>{
  assert.equal(googleMfaMode(undefined),"disabled");
  assert.equal(googleMfaMode("audit"),"audit");
  assert.equal(googleMfaMode("enforced"),"enforced");
  assert.equal(googleMfaMode("unexpected"),"disabled");
});

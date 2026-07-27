import { hkdfSync } from "node:crypto";

export class KeyDerivationConfigurationError extends Error {}

function rootSecret(explicit?:string){
  const secret=explicit??process.env.AUTH_SECRET??process.env.NEXTAUTH_SECRET;
  if(!secret||secret.length<32)throw new KeyDerivationConfigurationError("A permanent authentication secret is required for security controls.");
  return secret;
}

export function securitySubkey(label:string,explicit?:string){
  if(!/^[a-z0-9-]{1,80}$/.test(label))throw new KeyDerivationConfigurationError("The security-key purpose is invalid.");
  return Buffer.from(hkdfSync("sha256",rootSecret(explicit),"",`debrief:${label}:v1`,32));
}

"use client";

import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useFormStatus } from "react-dom";

export function GoogleSignInButton(){
  const {pending}=useFormStatus();
  return <button className="login-submit" type="submit" disabled={pending} aria-disabled={pending} aria-live="polite">
    {pending?<LoaderCircle className="login-spinner" size={16} aria-hidden="true"/>:<LockKeyhole size={16} aria-hidden="true"/>}
    {pending?"Connecting to Google…":"Continue with Google"}
  </button>;
}

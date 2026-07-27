"use client";

import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useFormStatus } from "react-dom";

export function MicrosoftSignInButton(){
  const {pending}=useFormStatus();
  return <button className="login-submit" type="submit" disabled={pending} aria-disabled={pending} aria-live="polite">
    {pending?<LoaderCircle className="login-spinner" size={16} aria-hidden="true"/>:<ShieldCheck size={16} aria-hidden="true"/>}
    {pending?"Connecting to Microsoft…":"Continue with Microsoft"}
  </button>;
}

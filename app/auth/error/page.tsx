import { ArrowLeft, RefreshCw, ShieldAlert } from "lucide-react";

const errorMessages:Record<string,{title:string;message:string;next:string}>={
  AccessDenied:{title:"This account is not authorized yet.",message:"During closed Alpha, Google sign-in is limited to email addresses on the tester allowlist.",next:"Ask the Alpha administrator to add the exact email address connected to your Google Account."},
  OAuthAccountNotLinked:{title:"This email is connected differently.",message:"For account safety, Debrief will not automatically combine sign-in methods that use the same email address.",next:"Use the Google Account originally connected to this Debrief workspace."},
  OAuthCallbackError:{title:"Google sign-in did not finish.",message:"The authorization response could not be completed.",next:"Close older Google sign-in tabs and begin one fresh attempt."},
  OAuthSignin:{title:"Google sign-in could not start.",message:"Debrief could not open a valid authorization request.",next:"Wait a moment, then begin one fresh attempt."},
  InvalidCheck:{title:"The sign-in security check expired.",message:"The temporary browser check was missing, expired, or replaced by another login attempt.",next:"Close older Google sign-in tabs and begin one fresh attempt."},
  Configuration:{title:"Debrief could not complete sign-in.",message:"The login request reached the server but could not be completed safely.",next:"Try once in a private browser window. If it repeats, report the time and reference code below."},
  Default:{title:"Sign-in was not completed.",message:"Debrief stopped the login attempt before creating a session.",next:"Close older Google sign-in tabs and begin one fresh attempt."}
};

function safeErrorCode(value:unknown){
  if(typeof value!=="string")return "Default";
  const normalized=value.replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,80);
  return normalized||"Default";
}

export default async function AuthErrorPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const code=safeErrorCode((await searchParams).error);
  const content=errorMessages[code]??errorMessages.Default;
  return <main className="login-screen">
    <div className="login-grid" aria-hidden="true"/>
    <a className="login-back" href="/"><ArrowLeft size={15} aria-hidden="true"/> Return to briefing</a>
    <section className="login-card auth-error-card" aria-labelledby="auth-error-title">
      <div className="login-emblem auth-error-emblem"><ShieldAlert size={25} aria-hidden="true"/></div>
      <div className="classification">SECURE ACCESS // ATTEMPT ENDED</div>
      <span className="login-kicker">Debrief workspace</span>
      <h1 id="auth-error-title">{content.title}</h1>
      <p>{content.message}</p>
      <div className="auth-error-next"><strong>Recommended next step</strong><span>{content.next}</span></div>
      <a className="login-submit auth-retry-button" href="/login?retry=1"><RefreshCw size={16} aria-hidden="true"/> Try login again</a>
      <p className="auth-error-reference">Reference: <code>{code}</code></p>
      <p className="login-disclaimer">Do not send passwords, authentication codes, or screenshots containing private account information when reporting an error.</p>
    </section>
  </main>;
}

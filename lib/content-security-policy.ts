export function contentSecurityPolicy(isDevelopment:boolean){
  const directives=[
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment?" 'unsafe-eval'":""}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'none'",
    "manifest-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "worker-src 'self' blob:"
  ];
  if(!isDevelopment)directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

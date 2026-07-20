import { getDeploymentIdentity } from "@/lib/deployment-environment";

export function DeploymentBanner(){
  const deployment=getDeploymentIdentity();
  if(deployment.environment==="production")return null;

  return <>
    <div className="deployment-banner-spacer" aria-hidden="true"/>
    <aside className="deployment-banner" role="status" aria-label={`${deployment.label} deployment`}>
      <strong>Development build — fictional data only</strong>
      <span>{deployment.label} · Release {deployment.release}</span>
    </aside>
  </>;
}

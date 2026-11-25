import type { MetadataRoute } from "next";

export default function robots():MetadataRoute.Robots{
  if(process.env.DATA_ENVIRONMENT!=="production")return{rules:{userAgent:"*",disallow:"/"}};
  return {
    rules:{userAgent:"*",allow:"/",disallow:"/api/"},
    sitemap:"https://debriefclaims.com/sitemap.xml",
    host:"https://debriefclaims.com",
  };
}

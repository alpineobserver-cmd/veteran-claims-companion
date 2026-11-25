import type {MetadataRoute} from "next";
import {conditions} from "@/lib/conditions";
import {vaForms} from "@/lib/va-forms";

export default function sitemap():MetadataRoute.Sitemap{
 if(process.env.DATA_ENVIRONMENT!=="production")return[];
 const origin="https://debriefclaims.com";
 const paths=["/","/conditions","/forms","/exposure-record-check","/sources","/status","/support","/privacy","/terms","/changelog","/licenses"];
 return [...paths.map(path=>({url:`${origin}${path}`})),...conditions.map(({slug})=>({url:`${origin}/conditions/${slug}`})),...vaForms.map(({slug})=>({url:`${origin}/forms/${slug}`}))];
}

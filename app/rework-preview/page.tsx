import type {Metadata} from "next";
import {ReworkPrototype} from "@/components/rework-prototype";
import "./rework-preview.css";

export const metadata:Metadata={
  title:"Guided case journey preview",
  description:"A fictional, interactive preview of the proposed Debrief case journey."
};

export default function ReworkPreviewPage(){return <ReworkPrototype/>}


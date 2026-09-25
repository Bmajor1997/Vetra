import Constants from "expo-constants";

const DEFAULT_API_URL="http://localhost:4173";
function developmentApiUrl(){const hostUri=Constants.expoConfig?.hostUri;const host=hostUri?.split(":")[0];return host?`http://${host}:4173`:DEFAULT_API_URL;}
export function voticApiUrl(){return (process.env.EXPO_PUBLIC_VOTIC_API_URL||developmentApiUrl()).replace(/\/$/,"")}
export async function extractDocument(name:string,bytes:ArrayBuffer){const response=await fetch(voticApiUrl()+"/api/extract",{method:"POST",headers:{"Content-Type":"application/octet-stream","X-Votic-Filename":encodeURIComponent(name)},body:bytes});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||"Votic could not read this document.");if(typeof result.text!=="string"||!result.text.trim())throw new Error("This document does not contain readable text.");return result.text}

export type VoticAnswer={answer:string;mode:string;sectionIndex:number|null;sectionTitle:string|null};
export async function askVotic(question:string,document?:{title:string;sections:{heading:string;text:string}[]}):Promise<VoticAnswer>{
 const response=await fetch(voticApiUrl()+"/api/help",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question,document})});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.error||"Votic could not answer right now.");
 if(typeof result.answer!=="string"||!result.answer.trim())throw new Error("Votic returned an empty answer.");
 return {answer:result.answer.trim(),mode:String(result.mode||"built-in"),sectionIndex:Number.isInteger(result.sectionIndex)?result.sectionIndex:null,sectionTitle:typeof result.sectionTitle==="string"?result.sectionTitle:null};
}

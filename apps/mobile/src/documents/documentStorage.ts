import AsyncStorage from "@react-native-async-storage/async-storage";import { VoticDocument } from "./types";
const KEY="votic.mobile.documents.v1";
export async function loadDocuments():Promise<VoticDocument[]>{try{const raw=await AsyncStorage.getItem(KEY);if(!raw)return[];const value=JSON.parse(raw);return Array.isArray(value)?value.filter(valid):[]}catch{return[]}}
export async function saveDocuments(documents:VoticDocument[]){await AsyncStorage.setItem(KEY,JSON.stringify(documents))}
function valid(value:any):value is VoticDocument{return value&&typeof value.id==="string"&&typeof value.title==="string"&&typeof value.plainText==="string"&&typeof value.progress==="number"&&Number.isInteger(value.sentenceIndex)&&Number.isInteger(value.wordIndex)}

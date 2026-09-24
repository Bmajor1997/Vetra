import AsyncStorage from "@react-native-async-storage/async-storage";import { VoticDocument } from "./types";
const KEY="votic.mobile.documents.v1",COLLECTIONS_KEY="votic.mobile.collections.v1";
export async function loadDocuments():Promise<VoticDocument[]>{try{const raw=await AsyncStorage.getItem(KEY);if(!raw)return[];const value=JSON.parse(raw);return Array.isArray(value)?value.filter(valid):[]}catch{return[]}}
export async function saveDocuments(documents:VoticDocument[]){await AsyncStorage.setItem(KEY,JSON.stringify(documents))}
export async function loadCollections():Promise<string[]>{try{const raw=await AsyncStorage.getItem(COLLECTIONS_KEY);if(!raw)return[];const value=JSON.parse(raw);return Array.isArray(value)?value.filter(item=>typeof item==="string"&&item.trim()).map(item=>item.trim()):[]}catch{return[]}}
export async function saveCollections(collections:string[]){await AsyncStorage.setItem(COLLECTIONS_KEY,JSON.stringify(collections))}
function valid(value:any):value is VoticDocument{return value&&typeof value.id==="string"&&typeof value.title==="string"&&typeof value.plainText==="string"&&typeof value.progress==="number"&&Number.isInteger(value.sentenceIndex)&&Number.isInteger(value.wordIndex)}

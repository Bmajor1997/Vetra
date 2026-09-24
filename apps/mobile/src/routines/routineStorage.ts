import AsyncStorage from "@react-native-async-storage/async-storage";
import { ReadingRoutine } from "./types";

const KEY="votic.mobile.routines.v1";
export async function loadRoutines():Promise<ReadingRoutine[]>{try{const raw=await AsyncStorage.getItem(KEY);if(!raw)return[];const value=JSON.parse(raw);return Array.isArray(value)?value.filter(valid):[]}catch{return[]}}
export async function saveRoutines(routines:ReadingRoutine[]){await AsyncStorage.setItem(KEY,JSON.stringify(routines));}
function valid(value:any):value is ReadingRoutine{return value&&typeof value.id==="string"&&typeof value.name==="string"&&Array.isArray(value.days)&&typeof value.time==="string"&&typeof value.enabled==="boolean"&&Array.isArray(value.notificationIds);}

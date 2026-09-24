import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { createContext,PropsWithChildren,useContext,useEffect,useState } from "react";
import { loadRoutines,saveRoutines } from "./routineStorage";
import { ReadingRoutine } from "./types";

type RoutineDraft=Omit<ReadingRoutine,"notificationIds"|"createdAt"|"updatedAt">;
type RoutineContextValue={routines:ReadingRoutine[];saveRoutine:(draft:RoutineDraft,documentTitle?:string)=>Promise<void>;setRoutineEnabled:(id:string,enabled:boolean,documentTitle?:string)=>Promise<void>;removeRoutine:(id:string)=>Promise<void>};
const RoutineContext=createContext<RoutineContextValue|null>(null);

async function cancel(ids:string[]){await Promise.all(ids.map(id=>Notifications.cancelScheduledNotificationAsync(id).catch(()=>{})));}
async function schedule(routine:RoutineDraft,documentTitle?:string){
  const permissions=await Notifications.getPermissionsAsync();const status=permissions.granted?permissions:await Notifications.requestPermissionsAsync();
  if(!status.granted)throw new Error("Notifications are turned off. You can enable them in your device settings when you want reminders.");
  if(Platform.OS==="android")await Notifications.setNotificationChannelAsync("reading-routines",{name:"Reading routines",importance:Notifications.AndroidImportance.DEFAULT});
  const [hour,minute]=routine.time.split(":").map(Number);const ids:string[]=[];
  try{for(const day of routine.days){ids.push(await Notifications.scheduleNotificationAsync({content:{title:`Time for ${routine.name}`,body:documentTitle?`Continue ${documentTitle} when you are ready.`:"Your planned reading time is ready when you are.",data:{routineId:routine.id,documentId:routine.documentId||""}},trigger:{type:Notifications.SchedulableTriggerInputTypes.WEEKLY,weekday:day+1,hour,minute,channelId:"reading-routines"}}));}}catch(error){await cancel(ids);throw error;}
  return ids;
}

export function RoutineProvider({children}:PropsWithChildren){
  const [routines,setRoutines]=useState<ReadingRoutine[]>([]);const [hydrated,setHydrated]=useState(false);
  useEffect(()=>{loadRoutines().then(saved=>{setRoutines(saved);setHydrated(true);});},[]);
  useEffect(()=>{if(hydrated)saveRoutines(routines).catch(()=>{});},[routines,hydrated]);
  async function saveRoutine(draft:RoutineDraft,documentTitle?:string){const previous=routines.find(routine=>routine.id===draft.id);const now=Date.now();const notificationIds=draft.enabled?await schedule(draft,documentTitle):[];if(previous)await cancel(previous.notificationIds);const next:ReadingRoutine={...draft,notificationIds,createdAt:previous?.createdAt||now,updatedAt:now};setRoutines(current=>[...current.filter(routine=>routine.id!==draft.id),next]);}
  async function setRoutineEnabled(id:string,enabled:boolean,documentTitle?:string){const routine=routines.find(value=>value.id===id);if(!routine)return;const draft:RoutineDraft={id:routine.id,name:routine.name,days:routine.days,time:routine.time,documentId:routine.documentId,enabled};const notificationIds=enabled?await schedule(draft,documentTitle):[];await cancel(routine.notificationIds);setRoutines(current=>current.map(value=>value.id===id?{...value,enabled,notificationIds,updatedAt:Date.now()}:value));}
  async function removeRoutine(id:string){const routine=routines.find(value=>value.id===id);if(routine)await cancel(routine.notificationIds);setRoutines(current=>current.filter(value=>value.id!==id));}
  return <RoutineContext.Provider value={{routines,saveRoutine,setRoutineEnabled,removeRoutine}}>{children}</RoutineContext.Provider>;
}
export function useRoutines(){const context=useContext(RoutineContext);if(!context)throw new Error("useRoutines must be used inside RoutineProvider");return context;}

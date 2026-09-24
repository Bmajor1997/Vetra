import { VoticDocument } from "./types";

const WORDS_PER_MINUTE=200;

export function estimatedMinutesRemaining(document:VoticDocument){
  const totalWords=document.plainText.match(/\S+/g)?.length||0;
  const remainingWords=Math.max(0,Math.round(totalWords*(1-document.progress)));
  return Math.max(remainingWords?1:0,Math.ceil(remainingWords/(WORDS_PER_MINUTE*Math.max(.5,document.playbackRate||1))));
}

export function startOfCurrentWeek(now=new Date()){
  const start=new Date(now);const day=start.getDay();const distance=day===0?6:day-1;
  start.setDate(start.getDate()-distance);start.setHours(0,0,0,0);return start;
}

export function weeklyInsights(documents:VoticDocument[],now=new Date()){
  const start=startOfCurrentWeek(now);let readingSeconds=0;let listeningSeconds=0;
  for(const document of documents){
    for(const [day,activity] of Object.entries(document.activity||{})){
      if(new Date(day+"T00:00:00").getTime()>=start.getTime()){readingSeconds+=activity.readingSeconds||0;listeningSeconds+=activity.listeningSeconds||0;}
    }
  }
  const completed=documents.filter(document=>document.completedAt&&document.completedAt>=start.getTime()).length;
  return {readingMinutes:Math.round(readingSeconds/60),listeningMinutes:Math.round(listeningSeconds/60),completed};
}

export function mostRecentIncomplete(documents:VoticDocument[]){
  return documents.filter(document=>document.progress<1).sort((a,b)=>(b.lastOpenedAt||b.updatedAt)-(a.lastOpenedAt||a.updatedAt))[0];
}

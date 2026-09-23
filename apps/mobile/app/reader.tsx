import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect,useMemo,useRef,useState } from "react";
import { LayoutChangeEvent,Modal,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,View } from "react-native";
import { useAccessibilityPreferences } from "../src/accessibility/AccessibilityProvider";
import { PlaybackSpeedControl } from "../src/components/PlaybackSpeedControl";
import { VoticLogo } from "../src/components/VoticLogo";
import { controlSizes,radii,spacing,typography } from "../src/design/tokens";
import { useDocumentLibrary } from "../src/documents/DocumentLibraryProvider";
import { formatPlaybackRate } from "../src/playback/rates";
import { useVoticTheme } from "../src/theme/ThemeProvider";

function sentences(text:string){return text.match(/[^.!?]+[.!?]+[\]"')]*|[^.!?]+$/g)?.map(v=>v.trim()).filter(Boolean)||[]}
function wordMatches(text:string){return [...text.matchAll(/\S+/g)]}
function speechSegment(text:string,startWord:number){const words=wordMatches(text);const safe=Math.max(0,Math.min(startWord,Math.max(0,words.length-1)));const start=words[safe]?.index??0;return {text:text.slice(start),startChar:start,startWord:safe,words}}
function readerType(textSize:"default"|"large"|"extra-large",readingSpacing:"default"|"extra"){
  const fontSize=textSize==="extra-large"?24:textSize==="large"?21:18;
  const lineHeight=Math.round(fontSize*(readingSpacing==="extra"?1.85:1.65));
  return {fontSize,lineHeight};
}

export default function Reader(){
  const {theme}=useVoticTheme();
  const accessibility=useAccessibilityPreferences();
  const {activeDocument,updateProgress,updatePlaybackRate}=useDocumentLibrary();
  const passages=useMemo(()=>sentences(activeDocument?.plainText||""),[activeDocument?.plainText]);
  const [index,setIndex]=useState(activeDocument?.sentenceIndex||0);
  const [wordIndex,setWordIndex]=useState(activeDocument?.wordIndex||0);
  const [rate,setRate]=useState(activeDocument?.playbackRate||1);
  const [playing,setPlaying]=useState(false);
  const [speedOpen,setSpeedOpen]=useState(false);
  const scrollRef=useRef<ScrollView>(null);\n  const speechSession=useRef(0);
  const sentenceY=useRef<Record<number,number>>({});
  const readingType=readerType(accessibility.textSize,accessibility.readingSpacing);

  useEffect(()=>()=>{speechSession.current+=1;Speech.stop()},[]);
  useEffect(()=>{if(!activeDocument||!passages.length)return;updateProgress(activeDocument.id,index/Math.max(1,passages.length),index,wordIndex)},[index,wordIndex]);
  useEffect(()=>{scrollToSentence(index)},[index,accessibility.reduceMotion]);

  function scrollToSentence(sentenceIndex:number){
    const y=sentenceY.current[sentenceIndex];
    if(y===undefined)return;
    scrollRef.current?.scrollTo({y:Math.max(0,y-72),animated:!accessibility.reduceMotion});
  }
  function measureSentence(sentenceIndex:number,event:LayoutChangeEvent){
    sentenceY.current[sentenceIndex]=event.nativeEvent.layout.y;
    if(sentenceIndex===index)scrollToSentence(sentenceIndex);
  }
  async function stop(){
    speechSession.current+=1;
    setPlaying(false);
    await Speech.stop();
  }
  function speak(at=index,startWord=at===index?wordIndex:0){
    const session=speechSession.current+1;
    speechSession.current=session;
    void beginSpeech(at,startWord,session,true);
  }
  async function beginSpeech(at:number,startWord:number,session:number,clearQueue:boolean){
    if(!activeDocument||!passages[at]||session!==speechSession.current)return;
    if(clearQueue)await Speech.stop();
    if(session!==speechSession.current)return;
    const passage=passages[at];
    const segment=speechSegment(passage,startWord);
    setIndex(at);setWordIndex(segment.startWord);setPlaying(true);
    Speech.speak(segment.text,{rate,onBoundary:(event:any)=>{
      if(session!==speechSession.current)return;
      if(event?.name&&event.name!=="word")return;
      const relativeOffset=Number(event?.charIndex);
      if(!Number.isFinite(relativeOffset))return;
      const sourceOffset=segment.startChar+relativeOffset;
      let next=segment.words.findIndex((match,i)=>sourceOffset>=(match.index??0)&&sourceOffset<(segment.words[i+1]?.index??Infinity));
      if(next<0)next=segment.startWord;
      if(next>=0)setWordIndex(next)
    },onDone:()=>{
      if(session!==speechSession.current)return;
      if(at<passages.length-1)void beginSpeech(at+1,0,session,false);
      else setPlaying(false)
    },onStopped:()=>{if(session===speechSession.current)setPlaying(false)},onError:()=>{if(session===speechSession.current)setPlaying(false)}})
  }
  function toggle(){playing?void stop():speak()}
  function jump(delta:number){void stop();setWordIndex(0);setIndex(current=>Math.max(0,Math.min(passages.length-1,current+delta)))}
  function changeRate(value:number){setRate(value);if(activeDocument)updatePlaybackRate(activeDocument.id,value)}
  const progress=passages.length?Math.min(1,(index+1)/passages.length):0;

  return <SafeAreaView style={[s.safe,{backgroundColor:theme.background}]}>
    <View style={s.content}>
      <View style={s.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close reader" onPress={()=>{void stop();router.back()}} style={({pressed})=>[s.close,{opacity:pressed ? .55 : 1}]}><Ionicons name="chevron-down" size={27} color={theme.text}/></Pressable>
        <VoticLogo compact/>
        <View style={s.topSpacer}/>
      </View>
      <View style={s.documentHeader}>
        <Text numberOfLines={2} style={[s.title,{color:theme.text}]}>{activeDocument?.title||"Document reader"}</Text>
        <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:Math.round(progress*100)}} style={[s.track,{backgroundColor:theme.border}]}><View style={[s.fill,{backgroundColor:theme.accent,width:`${progress*100}%` as `${number}%`}]}/></View>
      </View>
      <ScrollView ref={scrollRef} style={s.textArea} contentContainerStyle={s.readingContent}>
        {passages.map((passage,passageIndex)=>{
          const current=passageIndex===index;
          const tokens=current?passage.split(/(\s+)/):[];
          return <Text key={passageIndex} onLayout={event=>measureSentence(passageIndex,event)} style={[s.sentence,readingType,{color:theme.text},current&&{backgroundColor:theme.sentenceHighlight}]}>
            {current?tokens.map((token,tokenIndex)=>{
              if(/^\s+$/.test(token))return token;
              const before=tokens.slice(0,tokenIndex).join("");
              const spokenIndex=before.match(/\S+/g)?.length||0;
              const active=spokenIndex===wordIndex;
              const emphasis=active&&accessibility.wordEmphasis;
              return <Text key={tokenIndex} style={active?[{backgroundColor:theme.wordHighlight},emphasis&&{fontWeight:"800",fontSize:readingType.fontSize+2}]:undefined}>{token}</Text>
            }):passage}
          </Text>
        })}
      </ScrollView>
      <View style={s.player}>
        <View style={s.controls}>
          <Pressable disabled={index===0} accessibilityRole="button" accessibilityLabel="Previous passage" onPress={()=>jump(-1)} style={({pressed})=>[s.control,{opacity:index===0 ? .35 : pressed ? .55 : 1}]}><Ionicons name="play-skip-back" size={28} color={index===0?theme.mutedText:theme.text}/></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={playing?"Pause":"Play"} onPress={toggle} style={({pressed})=>[s.play,{backgroundColor:theme.playButton},!accessibility.reduceMotion&&{transform:[{scale:pressed ? .96 : 1}]}]}><Ionicons name={playing?"pause":"play"} size={34} color={theme.playIcon}/></Pressable>
          <Pressable disabled={!passages.length||index>=passages.length-1} accessibilityRole="button" accessibilityLabel="Next passage" onPress={()=>jump(1)} style={({pressed})=>[s.control,{opacity:index>=passages.length-1 ? .35 : pressed ? .55 : 1}]}><Ionicons name="play-skip-forward" size={28} color={index>=passages.length-1?theme.mutedText:theme.text}/></Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={"Playback speed "+formatPlaybackRate(rate)} accessibilityHint="Opens compact playback speed controls" onPress={()=>{void stop();setSpeedOpen(true)}} style={({pressed})=>[s.speedButton,{backgroundColor:theme.surfaceMuted,opacity:pressed ? .7 : 1}]}><Text style={[s.speed,{color:theme.text}]}>{formatPlaybackRate(rate)}</Text></Pressable>
      </View>
    </View>
    <Modal visible={speedOpen} transparent animationType={accessibility.reduceMotion?"none":"fade"} onRequestClose={()=>setSpeedOpen(false)}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close playback speed controls" onPress={()=>setSpeedOpen(false)} style={s.modalBackdrop}>
        <Pressable accessibilityRole="none" onPress={event=>event.stopPropagation()} style={[s.sheet,{backgroundColor:theme.surface}]}>
          <View style={[s.handle,{backgroundColor:theme.border}]}/>
          <View style={s.sheetHeader}><Text accessibilityRole="header" style={[s.sheetTitle,{color:theme.text}]}>Playback speed</Text><Pressable accessibilityRole="button" accessibilityLabel="Close playback speed controls" onPress={()=>setSpeedOpen(false)} style={s.sheetClose}><Ionicons name="close" size={24} color={theme.text}/></Pressable></View>
          <PlaybackSpeedControl rate={rate} onChange={changeRate}/>
        </Pressable>
      </Pressable>
    </Modal>
  </SafeAreaView>
}

const s=StyleSheet.create({
  safe:{flex:1},content:{flex:1,paddingHorizontal:spacing.xl},topBar:{minHeight:56,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},close:{width:controlSizes.minimumTouch,height:controlSizes.minimumTouch,justifyContent:"center",alignItems:"center"},topSpacer:{width:controlSizes.minimumTouch},documentHeader:{gap:spacing.md,paddingTop:spacing.md,paddingBottom:spacing.lg},title:{...typography.screenTitle,fontSize:26},track:{height:4,borderRadius:2,overflow:"hidden"},fill:{height:"100%"},textArea:{flex:1},readingContent:{paddingTop:spacing.sm,paddingBottom:spacing.xxl},sentence:{marginBottom:spacing.sm},player:{paddingTop:spacing.md,paddingBottom:spacing.sm,alignItems:"center",gap:spacing.sm},controls:{flexDirection:"row",justifyContent:"center",alignItems:"center",gap:spacing.xxl},control:{width:controlSizes.icon,height:controlSizes.icon,justifyContent:"center",alignItems:"center"},play:{width:controlSizes.play,height:controlSizes.play,borderRadius:radii.pill,justifyContent:"center",alignItems:"center"},speedButton:{minHeight:40,minWidth:72,borderRadius:radii.pill,paddingHorizontal:spacing.md,justifyContent:"center",alignItems:"center"},speed:{...typography.control,fontVariant:["tabular-nums"]},modalBackdrop:{flex:1,backgroundColor:"rgba(0,0,0,.28)",justifyContent:"flex-end"},sheet:{borderTopLeftRadius:radii.sheet,borderTopRightRadius:radii.sheet,paddingHorizontal:spacing.xl,paddingTop:spacing.sm,paddingBottom:spacing.xxl},handle:{width:36,height:4,borderRadius:2,alignSelf:"center",marginBottom:spacing.md},sheetHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},sheetTitle:{...typography.sheetTitle},sheetClose:{width:controlSizes.minimumTouch,height:controlSizes.minimumTouch,alignItems:"center",justifyContent:"center"}
});

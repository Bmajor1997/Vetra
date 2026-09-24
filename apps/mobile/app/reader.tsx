import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import { ReactNode,useEffect,useMemo,useRef,useState } from "react";
import { LayoutChangeEvent,Modal,Pressable,SafeAreaView,ScrollView,StyleSheet,Switch,Text,TextStyle,View } from "react-native";
import { HighlightMode,ReaderFont,ReadingSpacing,TextSize,useAccessibilityPreferences } from "../src/accessibility/AccessibilityProvider";
import { PlaybackSpeedControl } from "../src/components/PlaybackSpeedControl";
import { VoticLogo } from "../src/components/VoticLogo";
import { controlSizes,radii,spacing,typography } from "../src/design/tokens";
import { useDocumentLibrary } from "../src/documents/DocumentLibraryProvider";
import { formatPlaybackRate } from "../src/playback/rates";
import { AppearanceMode,useVoticTheme } from "../src/theme/ThemeProvider";

type ReaderSheet="appearance"|"focus"|"listen"|null;
type Voice=Awaited<ReturnType<typeof Speech.getAvailableVoicesAsync>>[number];

function sentences(text:string){return text.match(/[^.!?]+[.!?]+[\]"')]*|[^.!?]+$/g)?.map(value=>value.trim()).filter(Boolean)||[];}
function wordMatches(text:string){return [...text.matchAll(/\S+/g)];}
function speechSegment(text:string,startWord:number){const words=wordMatches(text);const safe=Math.max(0,Math.min(startWord,Math.max(0,words.length-1)));const start=words[safe]?.index??0;return {text:text.slice(start),startChar:start,startWord:safe,words};}
function readerType(textSize:TextSize,readingSpacing:ReadingSpacing,readerFont:ReaderFont,textSpacing:"default"|"wide"):TextStyle{
  const fontSize=textSize==="extra-large"?25:textSize==="large"?21:18;
  const lineScale=readingSpacing==="extra"?1.9:readingSpacing==="compact"?1.42:1.65;
  return {fontSize,lineHeight:Math.round(fontSize*lineScale),letterSpacing:textSpacing==="wide"?.75:0,fontFamily:readerFont==="serif"?"serif":readerFont==="accessible"?"sans-serif":undefined};
}

function Choice<T extends string>({label,value,current,onChange}:{label:string;value:T;current:T;onChange:(value:T)=>void}){
  const {theme}=useVoticTheme();const selected=value===current;
  return <Pressable accessibilityRole="radio" accessibilityState={{checked:selected}} onPress={()=>onChange(value)} style={({pressed})=>[s.choice,{borderColor:selected?theme.accent:theme.border,backgroundColor:selected?theme.sentenceHighlight:theme.surface,opacity:pressed?.7:1}]}><Text style={[s.choiceText,{color:selected?theme.accent:theme.text}]}>{label}</Text></Pressable>;
}

function Setting({label,children}:{label:string;children:ReactNode}){const {theme}=useVoticTheme();return <View style={s.setting}><Text style={[s.settingLabel,{color:theme.mutedText}]}>{label}</Text><View style={s.choiceRow}>{children}</View></View>;}

export default function Reader(){
  const {theme,appearanceMode,setAppearanceMode}=useVoticTheme();
  const accessibility=useAccessibilityPreferences();
  const {activeDocument,updateProgress,updatePlaybackRate}=useDocumentLibrary();
  const passages=useMemo(()=>sentences(activeDocument?.plainText||""),[activeDocument?.plainText]);
  const [index,setIndex]=useState(activeDocument?.sentenceIndex||0);
  const [wordIndex,setWordIndex]=useState(activeDocument?.wordIndex||0);
  const [rate,setRate]=useState(activeDocument?.playbackRate||1);
  const [playing,setPlaying]=useState(false);
  const [sheet,setSheet]=useState<ReaderSheet>(null);
  const [voices,setVoices]=useState<Voice[]>([]);
  const scrollRef=useRef<ScrollView>(null);
  const speechSession=useRef(0);
  const sentenceY=useRef<Record<number,number>>({});
  const readingType=readerType(accessibility.textSize,accessibility.readingSpacing,accessibility.readerFont,accessibility.textSpacing);

  useEffect(()=>{void Speech.getAvailableVoicesAsync().then(available=>setVoices(available.filter(voice=>voice.language.toLowerCase().startsWith("en")).slice(0,8))).catch(()=>setVoices([]));},[]);
  useEffect(()=>()=>{speechSession.current+=1;void Speech.stop();},[]);
  useEffect(()=>{if(!activeDocument||!passages.length)return;updateProgress(activeDocument.id,index/Math.max(1,passages.length),index,wordIndex);},[index,wordIndex]);
  useEffect(()=>{scrollToSentence(index);},[index,accessibility.reduceMotion]);

  function scrollToSentence(sentenceIndex:number){const y=sentenceY.current[sentenceIndex];if(y===undefined)return;scrollRef.current?.scrollTo({y:Math.max(0,y-72),animated:!accessibility.reduceMotion});}
  function measureSentence(sentenceIndex:number,event:LayoutChangeEvent){sentenceY.current[sentenceIndex]=event.nativeEvent.layout.y;if(sentenceIndex===index)scrollToSentence(sentenceIndex);}
  async function stop(){speechSession.current+=1;setPlaying(false);await Speech.stop();}
  function speak(at=index,startWord=at===index?wordIndex:0){const session=speechSession.current+1;speechSession.current=session;void beginSpeech(at,startWord,session,true);}
  async function beginSpeech(at:number,startWord:number,session:number,clearQueue:boolean){
    if(!activeDocument||!passages[at]||session!==speechSession.current)return;
    if(clearQueue)await Speech.stop();if(session!==speechSession.current)return;
    const passage=passages[at];const segment=speechSegment(passage,startWord);setIndex(at);setWordIndex(segment.startWord);setPlaying(true);
    Speech.speak(segment.text,{rate,voice:accessibility.voiceIdentifier||undefined,onBoundary:(event:any)=>{if(session!==speechSession.current||event?.name&&event.name!=="word")return;const relativeOffset=Number(event?.charIndex);if(!Number.isFinite(relativeOffset))return;const sourceOffset=segment.startChar+relativeOffset;let next=segment.words.findIndex((match,i)=>sourceOffset>=(match.index??0)&&sourceOffset<(segment.words[i+1]?.index??Infinity));if(next<0)next=segment.startWord;if(next>=0)setWordIndex(next);},onDone:()=>{if(session!==speechSession.current)return;if(at<passages.length-1)void beginSpeech(at+1,0,session,false);else setPlaying(false);},onStopped:()=>{if(session===speechSession.current)setPlaying(false);},onError:()=>{if(session===speechSession.current)setPlaying(false);}});
  }
  function toggle(){playing?void stop():speak();}
  function jump(delta:number){void stop();setWordIndex(0);setIndex(current=>Math.max(0,Math.min(passages.length-1,current+delta)));}
  function changeRate(value:number){setRate(value);if(activeDocument)updatePlaybackRate(activeDocument.id,value);}
  function openSheet(next:Exclude<ReaderSheet,null>){setSheet(next);}
  const progress=passages.length?Math.min(1,(index+1)/passages.length):0;
  const sentenceHighlight=accessibility.highlightMode==="sentence"||accessibility.highlightMode==="both";
  const wordHighlight=accessibility.highlightMode==="word"||accessibility.highlightMode==="both";

  return <SafeAreaView style={[s.safe,{backgroundColor:theme.background}]}>
    <View style={s.content}>
      <View style={s.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close reader" onPress={()=>{void stop();router.back();}} style={({pressed})=>[s.iconButton,{opacity:pressed?.55:1}]}><Ionicons name="chevron-down" size={27} color={theme.text}/></Pressable>
        <VoticLogo compact/>
        <Pressable accessibilityRole="button" accessibilityLabel="Open worksheet workspace" onPress={()=>{void stop();router.push("/worksheet");}} style={({pressed})=>[s.iconButton,{opacity:pressed?.55:1}]}><Ionicons name="create-outline" size={22} color={theme.text}/></Pressable>
      </View>
      <View style={s.documentHeader}>
        <Text numberOfLines={2} style={[s.title,{color:theme.text}]}>{activeDocument?.title||"Document reader"}</Text>
        <View style={s.progressCopy}><Text style={[s.progressText,{color:theme.mutedText}]}>{Math.round(progress*100)}% read</Text><Text style={[s.progressText,{color:theme.mutedText}]}>{Math.max(0,passages.length-index-1)} passages left</Text></View>
        <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:Math.round(progress*100)}} style={[s.track,{backgroundColor:theme.border}]}><View style={[s.fill,{backgroundColor:theme.accent,width:`${progress*100}%` as `${number}%`}]}/></View>
      </View>
      <ScrollView ref={scrollRef} style={s.textArea} contentContainerStyle={s.readingContent}>
        {passages.map((passage,passageIndex)=>{const current=passageIndex===index;const tokens=current?passage.split(/(\s+)/):[];return <Text key={passageIndex} onLayout={event=>measureSentence(passageIndex,event)} style={[s.sentence,readingType,{color:theme.text},current&&sentenceHighlight&&{backgroundColor:theme.sentenceHighlight}]}>{current?tokens.map((token,tokenIndex)=>{if(/^\s+$/.test(token))return token;const before=tokens.slice(0,tokenIndex).join("");const spokenIndex=before.match(/\S+/g)?.length||0;const active=spokenIndex===wordIndex;return <Text key={tokenIndex} style={active&&wordHighlight?[{backgroundColor:theme.wordHighlight},accessibility.wordEmphasis&&{fontWeight:"800",fontSize:(readingType.fontSize as number)+2}]:undefined}>{token}</Text>;}):passage}</Text>;})}
      </ScrollView>

      <Pressable accessibilityRole="button" accessibilityLabel="Ask Votic about this document" onPress={()=>{void stop();router.push("/assistant");}} style={({pressed})=>[s.ask,{backgroundColor:theme.accent,opacity:pressed?.8:1}]}><Ionicons name="chatbubble-ellipses" size={20} color="#FFF"/><Text style={s.askText}>Ask Votic</Text></Pressable>

      <View style={[s.dock,{borderColor:theme.border,backgroundColor:theme.surface}]}>
        <View style={s.controls}>
          <Pressable disabled={index===0} accessibilityRole="button" accessibilityLabel="Previous passage" onPress={()=>jump(-1)} style={({pressed})=>[s.control,{opacity:index===0?.3:pressed?.55:1}]}><Ionicons name="play-skip-back" size={25} color={index===0?theme.mutedText:theme.text}/></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={playing?"Pause":"Play"} onPress={toggle} style={({pressed})=>[s.play,{backgroundColor:theme.playButton},!accessibility.reduceMotion&&{transform:[{scale:pressed?.96:1}]}]}><Ionicons name={playing?"pause":"play"} size={30} color={theme.playIcon}/></Pressable>
          <Pressable disabled={!passages.length||index>=passages.length-1} accessibilityRole="button" accessibilityLabel="Next passage" onPress={()=>jump(1)} style={({pressed})=>[s.control,{opacity:index>=passages.length-1?.3:pressed?.55:1}]}><Ionicons name="play-skip-forward" size={25} color={index>=passages.length-1?theme.mutedText:theme.text}/></Pressable>
          <Text style={[s.nowPlaying,{color:theme.mutedText}]} numberOfLines={1}>{playing?"Listening":"Ready"} · {formatPlaybackRate(rate)}</Text>
        </View>
        <View style={[s.toolRow,{borderTopColor:theme.border}]}>
          <ToolButton icon="text-outline" label="Appearance" active={sheet==="appearance"} onPress={()=>openSheet("appearance")}/>
          <ToolButton icon="eye-outline" label="Focus" active={sheet==="focus"} onPress={()=>openSheet("focus")}/>
          <ToolButton icon="volume-high-outline" label="Listen" active={sheet==="listen"} onPress={()=>openSheet("listen")}/>
        </View>
      </View>
    </View>

    <Modal visible={sheet!==null} transparent animationType={accessibility.reduceMotion?"none":"slide"} onRequestClose={()=>setSheet(null)}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close reader controls" onPress={()=>setSheet(null)} style={s.modalBackdrop}>
        <Pressable accessibilityRole="none" onPress={event=>event.stopPropagation()} style={[s.sheet,{backgroundColor:theme.surface}]}>
          <View style={[s.handle,{backgroundColor:theme.border}]}/>
          <View style={s.sheetHeader}><View><Text accessibilityRole="header" style={[s.sheetTitle,{color:theme.text}]}>{sheet==="appearance"?"Appearance":sheet==="focus"?"Reading focus":"Listen"}</Text><Text style={[s.sheetSubtitle,{color:theme.mutedText}]}>{sheet==="appearance"?"Changes appear in the document immediately.":sheet==="focus"?"Choose the guidance that helps you track the text.":"Choose a voice and comfortable listening speed."}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close reader controls" onPress={()=>setSheet(null)} style={s.iconButton}><Ionicons name="close" size={24} color={theme.text}/></Pressable></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.sheetContent}>
            {sheet==="appearance"?<>
              <Setting label="Text size"><Choice label="A" value="default" current={accessibility.textSize} onChange={accessibility.setTextSize}/><Choice label="A+" value="large" current={accessibility.textSize} onChange={accessibility.setTextSize}/><Choice label="A++" value="extra-large" current={accessibility.textSize} onChange={accessibility.setTextSize}/></Setting>
              <Setting label="Font"><Choice label="Votic Sans" value="system" current={accessibility.readerFont} onChange={accessibility.setReaderFont}/><Choice label="Serif" value="serif" current={accessibility.readerFont} onChange={accessibility.setReaderFont}/><Choice label="Accessible" value="accessible" current={accessibility.readerFont} onChange={accessibility.setReaderFont}/></Setting>
              <Setting label="Theme"><Choice label="Light" value="light" current={appearanceMode} onChange={(value:AppearanceMode)=>setAppearanceMode(value)}/><Choice label="Dark" value="dark" current={appearanceMode} onChange={(value:AppearanceMode)=>setAppearanceMode(value)}/><Choice label="Device" value="system" current={appearanceMode} onChange={(value:AppearanceMode)=>setAppearanceMode(value)}/></Setting>
              <Setting label="Line spacing"><Choice label="Compact" value="compact" current={accessibility.readingSpacing} onChange={accessibility.setReadingSpacing}/><Choice label="Comfortable" value="default" current={accessibility.readingSpacing} onChange={accessibility.setReadingSpacing}/><Choice label="Open" value="extra" current={accessibility.readingSpacing} onChange={accessibility.setReadingSpacing}/></Setting>
              <Setting label="Text spacing"><Choice label="Standard" value="default" current={accessibility.textSpacing} onChange={accessibility.setTextSpacing}/><Choice label="Wide" value="wide" current={accessibility.textSpacing} onChange={accessibility.setTextSpacing}/></Setting>
            </>:null}
            {sheet==="focus"?<>
              <Setting label="Spoken-text highlight"><Choice label="Off" value="off" current={accessibility.highlightMode} onChange={accessibility.setHighlightMode}/><Choice label="Sentence" value="sentence" current={accessibility.highlightMode} onChange={accessibility.setHighlightMode}/><Choice label="Word" value="word" current={accessibility.highlightMode} onChange={accessibility.setHighlightMode}/><Choice label="Both" value="both" current={accessibility.highlightMode} onChange={accessibility.setHighlightMode}/></Setting>
              <View style={[s.toggleRow,{borderColor:theme.border}]}><View style={s.toggleCopy}><Text style={[s.toggleTitle,{color:theme.text}]}>Emphasize current word</Text><Text style={[s.toggleDescription,{color:theme.mutedText}]}>Adds weight and size as Votic reads.</Text></View><Switch accessibilityLabel="Emphasize current word" value={accessibility.wordEmphasis} onValueChange={accessibility.setWordEmphasis} trackColor={{true:theme.accent}}/></View>
            </>:null}
            {sheet==="listen"?<>
              <PlaybackSpeedControl rate={rate} onChange={changeRate}/>
              <Setting label="Voice">{voices.length?voices.map(voice=><Choice key={voice.identifier} label={voice.name} value={voice.identifier} current={accessibility.voiceIdentifier||""} onChange={value=>{void stop();accessibility.setVoiceIdentifier(value);}}/>):<Text style={[s.emptyVoices,{color:theme.mutedText}]}>Your device voice will be used.</Text>}</Setting>
            </>:null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  </SafeAreaView>;
}

function ToolButton({icon,label,active,onPress}:{icon:React.ComponentProps<typeof Ionicons>["name"];label:string;active:boolean;onPress:()=>void}){const {theme}=useVoticTheme();return <Pressable accessibilityRole="button" accessibilityState={{expanded:active}} onPress={onPress} style={({pressed})=>[s.tool,{backgroundColor:active?theme.sentenceHighlight:"transparent",opacity:pressed?.65:1}]}><Ionicons name={icon} size={20} color={active?theme.accent:theme.text}/><Text style={[s.toolLabel,{color:active?theme.accent:theme.text}]}>{label}</Text></Pressable>;}

const s=StyleSheet.create({
  safe:{flex:1},content:{flex:1,paddingHorizontal:spacing.lg},topBar:{minHeight:54,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},iconButton:{width:controlSizes.minimumTouch,height:controlSizes.minimumTouch,justifyContent:"center",alignItems:"center"},documentHeader:{gap:spacing.sm,paddingTop:spacing.sm,paddingBottom:spacing.md},title:{...typography.screenTitle,fontSize:25},progressCopy:{flexDirection:"row",justifyContent:"space-between"},progressText:{fontSize:12,fontWeight:"600"},track:{height:4,borderRadius:2,overflow:"hidden"},fill:{height:"100%"},textArea:{flex:1},readingContent:{paddingTop:spacing.sm,paddingBottom:150},sentence:{marginBottom:spacing.sm,paddingHorizontal:2,borderRadius:4},ask:{position:"absolute",right:spacing.xl,bottom:142,minHeight:46,borderRadius:radii.pill,paddingHorizontal:spacing.lg,flexDirection:"row",alignItems:"center",gap:spacing.sm,elevation:5,shadowColor:"#000",shadowOpacity:.16,shadowRadius:8,shadowOffset:{width:0,height:3}},askText:{...typography.control,color:"#FFF"},dock:{borderWidth:1,borderRadius:radii.sheet,overflow:"hidden",marginBottom:spacing.sm},controls:{height:68,flexDirection:"row",alignItems:"center",paddingHorizontal:spacing.md,gap:spacing.md},control:{width:controlSizes.minimumTouch,height:controlSizes.minimumTouch,justifyContent:"center",alignItems:"center"},play:{width:52,height:52,borderRadius:26,justifyContent:"center",alignItems:"center"},nowPlaying:{flex:1,fontSize:13,fontWeight:"600",marginLeft:spacing.sm},toolRow:{borderTopWidth:1,flexDirection:"row",padding:spacing.xs},tool:{flex:1,minHeight:50,borderRadius:radii.md,alignItems:"center",justifyContent:"center",gap:2},toolLabel:{fontSize:12,fontWeight:"700"},modalBackdrop:{flex:1,backgroundColor:"rgba(0,0,0,.24)",justifyContent:"flex-end"},sheet:{maxHeight:"66%",borderTopLeftRadius:radii.sheet,borderTopRightRadius:radii.sheet,paddingHorizontal:spacing.xl,paddingTop:spacing.sm,paddingBottom:spacing.xl},handle:{width:38,height:4,borderRadius:2,alignSelf:"center",marginBottom:spacing.md},sheetHeader:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:spacing.md},sheetTitle:{...typography.sheetTitle},sheetSubtitle:{fontSize:13,marginTop:3,maxWidth:300},sheetContent:{paddingTop:spacing.lg,paddingBottom:spacing.xl,gap:spacing.lg},setting:{gap:spacing.sm},settingLabel:{fontSize:13,fontWeight:"700",textTransform:"uppercase",letterSpacing:.5},choiceRow:{flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},choice:{minHeight:44,borderWidth:1,borderRadius:radii.md,paddingHorizontal:spacing.md,alignItems:"center",justifyContent:"center",flexGrow:1},choiceText:{...typography.control},toggleRow:{minHeight:72,borderWidth:1,borderRadius:radii.md,padding:spacing.md,flexDirection:"row",alignItems:"center",gap:spacing.md},toggleCopy:{flex:1},toggleTitle:{...typography.control},toggleDescription:{fontSize:13,marginTop:2},emptyVoices:{fontSize:14,paddingVertical:spacing.sm}
});

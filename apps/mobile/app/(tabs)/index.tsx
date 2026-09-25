import { Ionicons } from "@expo/vector-icons";
import { Link,router } from "expo-router";
import { Pressable,StyleSheet,Text,View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { radii,spacing,typography } from "../../src/design/tokens";
import { useDocumentLibrary } from "../../src/documents/DocumentLibraryProvider";
import { estimatedMinutesRemaining,mostRecentIncomplete,weeklyInsights } from "../../src/documents/insights";
import { useVoticTheme } from "../../src/theme/ThemeProvider";

function minutesLabel(minutes:number){return minutes===1?"1 minute":minutes+" minutes";}

export default function Home(){
  const {theme}=useVoticTheme();
  const {documents,openDocument}=useDocumentLibrary();
  const recent=mostRecentIncomplete(documents);
  const insights=weeklyInsights(documents);
  const remaining=recent?estimatedMinutesRemaining(recent):0;
  function resume(){if(!recent)return;openDocument(recent.id);router.push("/reader");}

  return <Screen title="Home">
    {recent?<View style={[s.continueCard,{backgroundColor:theme.surface,borderColor:theme.border}]}>
      <View style={s.continueHeader}><Text style={[s.eyebrow,{color:theme.accent}]}>CONTINUE READING</Text><Text style={[s.percent,{color:theme.mutedText}]}>{Math.round(recent.progress*100)}%</Text></View>
      <Text numberOfLines={2} style={[s.heading,{color:theme.text}]}>{recent.title}</Text>
      <Text style={[s.meta,{color:theme.mutedText}]}>{remaining?`About ${minutesLabel(remaining)} remaining`:"Almost finished"}</Text>
      <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:Math.round(recent.progress*100)}} style={[s.track,{backgroundColor:theme.border}]}><View style={[s.fill,{backgroundColor:theme.accent,width:`${recent.progress*100}%` as `${number}%`}]}/></View>
      <Pressable accessibilityRole="button" accessibilityLabel={"Continue reading "+recent.title} onPress={resume} style={({pressed})=>[s.primary,{backgroundColor:theme.accent,opacity:pressed?.78:1}]}><Ionicons name="play" size={19} color="#FFF"/><Text style={s.primaryText}>Resume</Text></Pressable>
    </View>:documents.length?<View style={[s.continueCard,{backgroundColor:theme.surface,borderColor:theme.border}]}>
      <Text style={[s.eyebrow,{color:theme.accent}]}>LIBRARY COMPLETE</Text><Text style={[s.heading,{color:theme.text}]}>Everything is finished.</Text><Text style={[s.body,{color:theme.mutedText}]}>Add another document whenever you are ready for your next reading session.</Text>
    </View>:<View style={s.section}>
      <Text style={[s.eyebrow,{color:theme.mutedText}]}>YOUR LIBRARY</Text><Text style={[s.heading,{color:theme.text}]}>Start with something you want to hear.</Text><Text style={[s.body,{color:theme.mutedText}]}>Add a document and Votic will keep your reading position for next time.</Text>
    </View>}

    <View style={s.section}>
      <Text style={[s.sectionHeading,{color:theme.text}]}>This week</Text>
      <View style={s.insightRow}>
        <Insight icon="book-outline" value={minutesLabel(insights.readingMinutes)} label="Focused reading"/>
        <Insight icon="headset-outline" value={minutesLabel(insights.listeningMinutes)} label="Listening"/>
        <Insight icon="checkmark-circle-outline" value={String(insights.completed)} label={insights.completed===1?"Document finished":"Documents finished"}/>
      </View>
      {!insights.readingMinutes&&!insights.completed?<Text style={[s.insightHint,{color:theme.mutedText}]}>Your reading time and completed documents will appear here as you use Votic.</Text>:null}
      <Pressable accessibilityRole="button" accessibilityLabel="View weekly recap" onPress={()=>router.push("/recap")} style={({pressed})=>[s.recapButton,{borderColor:theme.border,backgroundColor:pressed?theme.surfaceMuted:"transparent"}]}><View><Text style={[s.recapTitle,{color:theme.text}]}>Weekly recap</Text><Text style={[s.recapCopy,{color:theme.mutedText}]}>See progress, saved ideas, and what to continue.</Text></View><Ionicons name="arrow-forward" size={20} color={theme.accent}/></Pressable>
    </View>

    <View style={[s.divider,{backgroundColor:theme.border}]}/>
    <View style={s.section}>
      <View style={s.sectionHeader}><Text style={[s.sectionHeading,{color:theme.text}]}>Notes</Text><Ionicons name="bookmark-outline" size={20} color={theme.accent}/></View>
      <Text style={[s.body,{color:theme.mutedText}]}>Review notes and saved passages from every document in one place.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Open notes workspace" onPress={()=>router.push("/notes")} style={({pressed})=>[s.recapButton,{borderColor:theme.border,backgroundColor:pressed?theme.surfaceMuted:"transparent"}]}><View><Text style={[s.recapTitle,{color:theme.text}]}>Notes workspace</Text><Text style={[s.recapCopy,{color:theme.mutedText}]}>Search, review, and return to the source.</Text></View><Ionicons name="arrow-forward" size={20} color={theme.accent}/></Pressable>
    </View>
    <View style={[s.divider,{backgroundColor:theme.border}]}/>
    <View style={s.section}>
      <Text style={[s.sectionHeading,{color:theme.text}]}>Your next document</Text><Text style={[s.body,{color:theme.mutedText}]}>Import a PDF, Word file, text file, or Markdown document.</Text>
      <Link href="/documents" asChild><Pressable accessibilityRole="button" accessibilityLabel="Go to Documents" style={({pressed})=>[s.secondary,{borderColor:theme.border,backgroundColor:pressed?theme.surfaceMuted:"transparent"}]}><Ionicons name="add" size={22} color={theme.text}/><Text style={[s.secondaryText,{color:theme.text}]}>Add document</Text></Pressable></Link>
    </View>
  </Screen>;
}

function Insight({icon,value,label}:{icon:React.ComponentProps<typeof Ionicons>["name"];value:string;label:string}){const {theme}=useVoticTheme();return <View style={[s.insight,{backgroundColor:theme.surfaceMuted}]}><Ionicons name={icon} size={21} color={theme.accent}/><Text numberOfLines={1} adjustsFontSizeToFit style={[s.insightValue,{color:theme.text}]}>{value}</Text><Text style={[s.insightLabel,{color:theme.mutedText}]}>{label}</Text></View>;}

const s=StyleSheet.create({continueCard:{borderWidth:1,borderRadius:radii.lg,padding:spacing.lg,gap:spacing.md},continueHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},section:{gap:spacing.md},eyebrow:{...typography.eyebrow},percent:{fontSize:13,fontWeight:"700"},heading:{...typography.sectionTitle,fontSize:22},sectionHeading:{...typography.sectionTitle},sectionHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},body:{...typography.body},meta:{fontSize:15},track:{height:5,borderRadius:3,overflow:"hidden"},fill:{height:"100%"},primary:{minHeight:52,borderRadius:radii.md,flexDirection:"row",gap:spacing.sm,alignItems:"center",justifyContent:"center",marginTop:spacing.xs},primaryText:{color:"#FFF",...typography.control},insightRow:{flexDirection:"row",gap:spacing.sm},insight:{flex:1,minHeight:116,borderRadius:radii.md,padding:spacing.md,gap:spacing.xs},insightValue:{fontSize:17,fontWeight:"800",marginTop:spacing.xs},insightLabel:{fontSize:12,lineHeight:16},insightHint:{fontSize:13,lineHeight:19},recapButton:{minHeight:68,borderWidth:1,borderRadius:radii.md,paddingHorizontal:spacing.md,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:spacing.md},recapTitle:{fontSize:16,fontWeight:"800"},recapCopy:{fontSize:12,marginTop:2},divider:{height:1,marginVertical:spacing.xs},secondary:{minHeight:52,borderWidth:1,borderRadius:radii.md,flexDirection:"row",gap:spacing.sm,alignItems:"center",justifyContent:"center",marginTop:spacing.xs},secondaryText:{...typography.control}});

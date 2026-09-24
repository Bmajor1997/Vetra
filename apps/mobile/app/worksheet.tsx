import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect,useMemo,useState } from "react";
import { Pressable,SafeAreaView,ScrollView,StyleSheet,Text,TextInput,View } from "react-native";
import { spacing,typography } from "../src/design/tokens";
import { useDocumentLibrary } from "../src/documents/DocumentLibraryProvider";
import { useVoticTheme } from "../src/theme/ThemeProvider";

type Block={id:string;before:string;kind:"answer"|"checkbox";after:string;checked?:boolean};
function blocks(text:string):Block[]{
 const lines=text.split(/\r?\n/).filter(v=>v.trim());
 return lines.flatMap<Block>((line,i)=>{
  const checkbox=line.match(/^\s*[☐□☑☒]\s*(.*)$/);
  if(checkbox)return[{id:"line-"+i,before:checkbox[1]||"Worksheet item",kind:"checkbox",after:"",checked:/^\s*[☑☒]/.test(line)}];
  const blank=line.match(/^(.*?)(_{5,})(.*)$/);
  if(blank)return[{id:"line-"+i,before:blank[1].trim(),kind:"answer",after:blank[3].trim()}];
  return[];
 });
}
export default function Worksheet(){
 const {theme}=useVoticTheme();
 const {activeDocument,updateWorksheetResponses}=useDocumentLibrary();
 const controls=useMemo(()=>blocks(activeDocument?.plainText||""),[activeDocument?.plainText]);
 const [responses,setResponses]=useState<Record<string,string|boolean>>(activeDocument?.worksheetResponses||{});
 useEffect(()=>{setResponses(activeDocument?.worksheetResponses||{})},[activeDocument?.id]);
 function save(next:Record<string,string|boolean>){setResponses(next);if(activeDocument)updateWorksheetResponses(activeDocument.id,next)}
 return <SafeAreaView style={[s.safe,{backgroundColor:theme.background}]}><View style={[s.header,{borderBottomColor:theme.border}]}><Pressable accessibilityRole="button" accessibilityLabel="Close worksheet" onPress={()=>router.back()} style={s.icon}><Ionicons name="chevron-down" size={27} color={theme.text}/></Pressable><View style={s.headerCopy}><Text style={[s.title,{color:theme.text}]}>Worksheet</Text><Text numberOfLines={1} style={[s.context,{color:theme.mutedText}]}>{activeDocument?.title||"Document"}</Text></View><View style={s.icon}/></View>
 <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">{controls.length===0?<View style={s.empty}><Ionicons name="create-outline" size={30} color={theme.mutedText}/><Text style={[s.heading,{color:theme.text}]}>No worksheet fields found</Text><Text style={[s.body,{color:theme.mutedText}]}>Votic recognizes checkbox symbols and answer blanks made from underscores. This document can still be used in the Reader.</Text></View>:<>
 <View style={s.intro}><Text style={[s.heading,{color:theme.text}]}>Complete your worksheet</Text><View accessibilityLiveRegion="polite" style={s.savedRow}><Ionicons name="checkmark-circle-outline" size={17} color={theme.mutedText}/><Text style={[s.saved,{color:theme.mutedText}]}>Saved automatically on this device</Text></View></View>
 {controls.map((b,n)=><View key={b.id} style={[s.block,{borderBottomColor:theme.border}]}><Text style={[s.number,{color:theme.mutedText}]}>{String(n+1).padStart(2,"0")}</Text>{b.kind==="checkbox"?<Pressable accessibilityRole="checkbox" accessibilityState={{checked:Boolean(responses[b.id]??b.checked)}} onPress={()=>save({...responses,[b.id]:!Boolean(responses[b.id]??b.checked)})} style={s.checkRow}><Ionicons name={Boolean(responses[b.id]??b.checked)?"checkbox":"square-outline"} size={28} color={Boolean(responses[b.id]??b.checked)?theme.accent:theme.mutedText}/><Text style={[s.body,{color:theme.text,flex:1}]}>{b.before}</Text></Pressable>:<View style={s.answer}><Text style={[s.body,{color:theme.text}]}>{b.before||"Your answer"}</Text><TextInput accessibilityLabel={"Answer "+(n+1)} value={typeof responses[b.id]==="string"?responses[b.id] as string:""} onChangeText={v=>save({...responses,[b.id]:v})} placeholder="Type your answer" placeholderTextColor={theme.mutedText} multiline style={[s.input,{color:theme.text,borderColor:theme.border,backgroundColor:theme.surfaceMuted}]}/>{b.after?<Text style={[s.body,{color:theme.text}]}>{b.after}</Text>:null}</View>}</View>)}</>}</ScrollView></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1},header:{minHeight:68,borderBottomWidth:1,flexDirection:"row",alignItems:"center",paddingHorizontal:spacing.md},icon:{width:48,height:48,alignItems:"center",justifyContent:"center"},headerCopy:{flex:1,alignItems:"center"},title:{...typography.sectionTitle},context:{fontSize:12,maxWidth:"90%"},content:{padding:spacing.xl,paddingBottom:spacing.section},intro:{gap:spacing.sm,marginBottom:spacing.lg},savedRow:{minHeight:24,flexDirection:"row",alignItems:"center",gap:spacing.xs},saved:{fontSize:13,lineHeight:18},heading:{...typography.sectionTitle},body:{...typography.body},block:{borderBottomWidth:1,paddingVertical:spacing.xl,gap:spacing.sm},number:{...typography.eyebrow},checkRow:{minHeight:48,flexDirection:"row",alignItems:"center",gap:spacing.md},answer:{gap:spacing.sm},input:{minHeight:56,maxHeight:180,borderWidth:1,borderRadius:12,padding:spacing.md,fontSize:16,textAlignVertical:"top"},empty:{alignItems:"center",gap:spacing.sm,paddingTop:spacing.section}});

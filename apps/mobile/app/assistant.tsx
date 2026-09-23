import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator,KeyboardAvoidingView,Platform,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,TextInput,View } from "react-native";
import { askVotic } from "../src/api/voticApi";
import { spacing,typography } from "../src/design/tokens";
import { useDocumentLibrary } from "../src/documents/DocumentLibraryProvider";
import { useVoticTheme } from "../src/theme/ThemeProvider";

type Message={role:"user"|"votic";text:string};
export default function Assistant(){
 const {theme}=useVoticTheme();const {activeDocument}=useDocumentLibrary();
 const [question,setQuestion]=useState("");const [messages,setMessages]=useState<Message[]>([]);const [sending,setSending]=useState(false);const [error,setError]=useState("");
 async function send(){
  const clean=question.trim();if(!clean||sending)return;setQuestion("");setError("");setMessages(v=>[...v,{role:"user",text:clean}]);setSending(true);
  try{const document=activeDocument?{title:activeDocument.title,sections:[{heading:"Document",text:activeDocument.plainText}]}:undefined;const answer=await askVotic(clean,document);setMessages(v=>[...v,{role:"votic",text:answer.answer}])}
  catch(e){setError(e instanceof Error?e.message:"Votic could not answer right now.")}finally{setSending(false)}
 }
 return <SafeAreaView style={[s.safe,{backgroundColor:theme.background}]}><KeyboardAvoidingView style={s.safe} behavior={Platform.OS==="ios"?"padding":undefined}>
  <View style={[s.header,{borderBottomColor:theme.border}]}><Pressable accessibilityRole="button" accessibilityLabel="Close Ask Votic" onPress={()=>router.back()} style={s.icon}><Ionicons name="chevron-down" size={27} color={theme.text}/></Pressable><View style={s.headerCopy}><Text style={[s.title,{color:theme.text}]}>Ask Votic</Text><Text numberOfLines={1} style={[s.context,{color:theme.mutedText}]}>{activeDocument?"About "+activeDocument.title:"Votic help"}</Text></View><View style={s.icon}/></View>
  <ScrollView contentContainerStyle={s.messages} keyboardShouldPersistTaps="handled">
   {messages.length===0?<View style={s.welcome}><Text style={[s.welcomeTitle,{color:theme.text}]}>What would you like to understand?</Text><Text style={[s.body,{color:theme.mutedText}]}>{activeDocument?"Ask about this document, clarify a passage, or find an idea you heard.":"Ask a question about using Votic."}</Text></View>:messages.map((m,i)=><View key={i} style={[s.message,m.role==="user"?s.userMessage:s.voticMessage,m.role==="user"&&{backgroundColor:theme.surfaceMuted}]}><Text style={[s.body,{color:theme.text}]}>{m.text}</Text></View>)}
   {sending?<View accessibilityLiveRegion="polite" style={s.thinking}><ActivityIndicator color={theme.accent}/><Text style={[s.status,{color:theme.mutedText}]}>Thinking about your question…</Text></View>:null}
   {error?<Text accessibilityLiveRegion="polite" style={[s.error,{color:theme.text,borderColor:theme.border}]}>{error}</Text>:null}
  </ScrollView>
  <View style={[s.composer,{borderTopColor:theme.border,backgroundColor:theme.background}]}><TextInput accessibilityLabel="Ask Votic a question" value={question} onChangeText={setQuestion} placeholder={activeDocument?"Ask about this document":"Ask Votic"} placeholderTextColor={theme.mutedText} multiline maxLength={1000} style={[s.input,{color:theme.text,backgroundColor:theme.surfaceMuted}]} onSubmitEditing={()=>void send()}/><Pressable accessibilityRole="button" accessibilityLabel="Send question" disabled={!question.trim()||sending} onPress={()=>void send()} style={[s.send,{backgroundColor:theme.accent,opacity:!question.trim()||sending?.4:1}]}><Ionicons name="arrow-up" size={22} color="#FFF"/></Pressable></View>
 </KeyboardAvoidingView></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1},header:{minHeight:68,borderBottomWidth:1,flexDirection:"row",alignItems:"center",paddingHorizontal:spacing.md},icon:{width:48,height:48,alignItems:"center",justifyContent:"center"},headerCopy:{flex:1,alignItems:"center"},title:{...typography.sectionTitle},context:{fontSize:12,maxWidth:"90%"},messages:{padding:spacing.xl,gap:spacing.lg,flexGrow:1},welcome:{marginTop:spacing.section,gap:spacing.sm},welcomeTitle:{...typography.screenTitle,fontSize:26},body:{...typography.body},message:{maxWidth:"92%",paddingVertical:spacing.sm},userMessage:{alignSelf:"flex-end",borderRadius:16,paddingHorizontal:spacing.md},voticMessage:{alignSelf:"flex-start"},thinking:{flexDirection:"row",alignItems:"center",gap:spacing.sm},status:{fontSize:14},error:{borderWidth:1,borderRadius:12,padding:spacing.md},composer:{borderTopWidth:1,padding:spacing.md,flexDirection:"row",alignItems:"flex-end",gap:spacing.sm},input:{flex:1,minHeight:48,maxHeight:120,borderRadius:18,paddingHorizontal:spacing.lg,paddingVertical:12,fontSize:16},send:{width:48,height:48,borderRadius:24,alignItems:"center",justifyContent:"center"}});

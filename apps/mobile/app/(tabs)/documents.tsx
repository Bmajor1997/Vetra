import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator,Alert,Pressable,StyleSheet,Text,View } from "react-native";
import { extractDocument } from "../../src/api/voticApi";
import { Screen } from "../../src/components/Screen";
import { spacing,typography } from "../../src/design/tokens";
import { canReadLocally,validateImport } from "../../src/documents/importDocument";
import { useDocumentLibrary } from "../../src/documents/DocumentLibraryProvider";
import { useVoticTheme } from "../../src/theme/ThemeProvider";

export default function Documents(){
  const {theme}=useVoticTheme();const {documents,addTextDocument,openDocument}=useDocumentLibrary();const [importing,setImporting]=useState(false);
  async function addDocument(){setImporting(true);try{const result=await DocumentPicker.getDocumentAsync({type:["text/plain","text/markdown","application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document"],copyToCacheDirectory:true,multiple:false});if(result.canceled)return;const asset=result.assets[0];validateImport({name:asset.name,size:asset.size,uri:asset.uri,mimeType:asset.mimeType});let text:string;if(canReadLocally(asset.name))text=await new File(asset.uri).text();else text=await extractDocument(asset.name,await new File(asset.uri).arrayBuffer());if(!text.trim())throw new Error("This document does not contain readable text.");addTextDocument(asset.name,text);router.push("/reader")}catch(error){Alert.alert("Could not import document",error instanceof Error?error.message:"Votic could not read this document.")}finally{setImporting(false)}}
  function open(id:string){openDocument(id);router.push("/reader")}
  return <Screen title="Documents">
    <Pressable accessibilityRole="button" accessibilityLabel="Add document" accessibilityHint="Choose a document from this device" accessibilityState={{disabled:importing,busy:importing}} disabled={importing} onPress={addDocument} style={({pressed})=>[s.add,{backgroundColor:theme.accent,opacity:importing?.6:pressed?.78:1}]}>{importing?<ActivityIndicator color="#FFF"/>:<Ionicons name="add" size={22} color="#FFF"/>}<Text accessibilityLiveRegion="polite" style={s.addText}>{importing?"Importing document…":"Add document"}</Text></Pressable>
    {documents.length===0?<View style={s.empty}><Ionicons name="document-text-outline" size={32} color={theme.mutedText}/><Text style={[s.h,{color:theme.text}]}>No documents yet</Text><Text style={[s.body,{color:theme.mutedText}]}>Add a PDF, Word file, TXT, or Markdown document to begin reading and listening.</Text></View>:<View style={s.list}>{documents.map((doc,i)=><Pressable key={doc.id} accessibilityRole="button" accessibilityLabel={"Open "+doc.title} accessibilityHint={doc.progress?"Resume listening":"Open in Votic reader"} onPress={()=>open(doc.id)} style={({pressed})=>[s.documentRow,{borderBottomColor:theme.border,backgroundColor:pressed?theme.surfaceMuted:"transparent"}]}>
      <View style={s.documentText}><Text numberOfLines={2} style={[s.h,{color:theme.text}]}>{doc.title}</Text><Text numberOfLines={1} style={[s.meta,{color:theme.mutedText}]}>{doc.progress?Math.round(doc.progress*100)+"% complete":"Ready to listen"} · {doc.sourceName}</Text><View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:Math.round(doc.progress*100)}} style={[s.track,{backgroundColor:theme.border}]}><View style={[s.fill,{backgroundColor:theme.accent,width:`${doc.progress*100}%` as `${number}%`}]}/></View></View>
      <Ionicons name="chevron-forward" size={20} color={theme.mutedText}/>
    </Pressable>)}</View>}
  </Screen>
}
const s=StyleSheet.create({add:{minHeight:52,borderRadius:14,justifyContent:"center",alignItems:"center",flexDirection:"row",gap:spacing.sm},addText:{color:"#FFF",...typography.control},empty:{alignItems:"center",paddingVertical:spacing.section,gap:spacing.sm},h:{...typography.sectionTitle},body:{...typography.body,textAlign:"center"},meta:{fontSize:14},list:{marginTop:spacing.xs},documentRow:{minHeight:94,borderBottomWidth:1,flexDirection:"row",alignItems:"center",gap:spacing.md,paddingVertical:spacing.md,paddingHorizontal:spacing.xs},documentText:{flex:1,gap:spacing.sm},track:{height:3,borderRadius:2,overflow:"hidden"},fill:{height:"100%"}});

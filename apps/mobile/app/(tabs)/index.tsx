import { Ionicons } from "@expo/vector-icons";
import { Link,router } from "expo-router";
import { Pressable,StyleSheet,Text,View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { spacing,typography } from "../../src/design/tokens";
import { useDocumentLibrary } from "../../src/documents/DocumentLibraryProvider";
import { useVoticTheme } from "../../src/theme/ThemeProvider";

export default function Home(){
  const {theme}=useVoticTheme();
  const {documents,openDocument}=useDocumentLibrary();
  const recent=documents[0];
  function resume(){if(!recent)return;openDocument(recent.id);router.push("/reader")}
  return <Screen title="Home">
    {recent?<View style={s.section}>
      <Text style={[s.eyebrow,{color:theme.mutedText}]}>CONTINUE LISTENING</Text>
      <Text numberOfLines={2} style={[s.heading,{color:theme.text}]}>{recent.title}</Text>
      <Text style={[s.meta,{color:theme.mutedText}]}>{recent.progress?Math.round(recent.progress*100)+"% complete":"Ready to listen"}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={"Continue listening to "+recent.title} onPress={resume} style={({pressed})=>[s.primary,{backgroundColor:theme.accent,opacity:pressed?.78:1}]}><Ionicons name="play" size={19} color="#FFF"/><Text style={s.primaryText}>Continue listening</Text></Pressable>
    </View>:<View style={s.section}>
      <Text style={[s.eyebrow,{color:theme.mutedText}]}>YOUR LIBRARY</Text>
      <Text style={[s.heading,{color:theme.text}]}>Start with something you want to hear.</Text>
      <Text style={[s.body,{color:theme.mutedText}]}>Add a document and Votic will keep your reading position for next time.</Text>
    </View>}
    <View style={[s.divider,{backgroundColor:theme.border}]}/>
    <View style={s.section}>
      <Text style={[s.heading,{color:theme.text}]}>Listen to a document</Text>
      <Text style={[s.body,{color:theme.mutedText}]}>Import a PDF, Word file, text file, or Markdown document.</Text>
      <Link href="/documents" asChild><Pressable accessibilityRole="button" accessibilityLabel="Go to Documents" style={({pressed})=>[s.secondary,{borderColor:theme.border,backgroundColor:pressed?theme.surfaceMuted:"transparent"}]}><Ionicons name="add" size={22} color={theme.text}/><Text style={[s.secondaryText,{color:theme.text}]}>Add document</Text></Pressable></Link>
    </View>
  </Screen>
}
const s=StyleSheet.create({section:{gap:spacing.md},eyebrow:{...typography.eyebrow},heading:{...typography.sectionTitle,fontSize:22},body:{...typography.body},meta:{fontSize:15},divider:{height:1,marginVertical:spacing.sm},primary:{minHeight:52,borderRadius:14,flexDirection:"row",gap:spacing.sm,alignItems:"center",justifyContent:"center",marginTop:spacing.xs},primaryText:{color:"#FFF",...typography.control},secondary:{minHeight:52,borderWidth:1,borderRadius:14,flexDirection:"row",gap:spacing.sm,alignItems:"center",justifyContent:"center",marginTop:spacing.xs},secondaryText:{...typography.control}});

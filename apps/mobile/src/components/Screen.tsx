import { PropsWithChildren } from "react";
import { ScrollView,StyleSheet,Text,View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVoticTheme } from "../theme/ThemeProvider";
import { VoticLogo } from "./VoticLogo";

export function Screen({title,children}:PropsWithChildren<{title:string}>){
  const {theme}=useVoticTheme();
  return <SafeAreaView edges={["top","left","right"]} style={[s.safe,{backgroundColor:theme.background}]}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View accessibilityRole="header"><VoticLogo compact/></View>
      <Text accessibilityRole="header" style={[s.title,{color:theme.text}]}>{title}</Text>
      {children}
    </ScrollView>
  </SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1},content:{paddingHorizontal:20,paddingBottom:32,gap:16},title:{fontSize:30,fontWeight:"800",marginTop:4}});

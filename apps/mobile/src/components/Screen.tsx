import { PropsWithChildren,ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable,ScrollView,StyleSheet,Text,View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVoticTheme } from "../theme/ThemeProvider";
import { VoticLogo } from "./VoticLogo";

export function Screen({title,children,hideTitle=false,titleAction}:PropsWithChildren<{title:string;hideTitle?:boolean;titleAction?:ReactNode}>){
  const {theme}=useVoticTheme();
  return <SafeAreaView edges={["top","left","right"]} style={[s.safe,{backgroundColor:theme.background}]}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={s.brandBar} accessibilityRole="header"><VoticLogo/><Pressable accessibilityRole="button" accessibilityLabel="Search" style={s.headerIcon}><Ionicons name="search" size={22} color={theme.text}/></Pressable></View>
      {!hideTitle?<View style={s.titleRow}><Text accessibilityRole="header" style={[s.title,{color:theme.text}]}>{title}</Text>{titleAction}</View>:null}
      {children}
    </ScrollView>
  </SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1},content:{paddingHorizontal:20,paddingBottom:32,gap:16},brandBar:{minHeight:58,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},headerIcon:{width:44,height:44,alignItems:"center",justifyContent:"center"},titleRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},title:{fontSize:26,fontWeight:"800",letterSpacing:-.5,flexShrink:1}});

import { StyleSheet,Text,View } from "react-native";import { useVoticTheme } from "../theme/ThemeProvider";
export function VoticLogo({compact=false}:{compact?:boolean}){const {theme}=useVoticTheme();return <View accessible accessibilityRole="image" accessibilityLabel="Votic logo"><Text style={[compact?s.compact:s.logo,{color:theme.accent}]}>Votic</Text></View>}
const s=StyleSheet.create({logo:{fontSize:30,fontWeight:"900",letterSpacing:-1},compact:{fontSize:22,fontWeight:"900",letterSpacing:-.7}});

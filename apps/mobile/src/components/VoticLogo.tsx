import { Image,StyleSheet,Text,View } from "react-native";
import { useVoticTheme } from "../theme/ThemeProvider";

export function VoticLogo({compact=false,markOnly=false}:{compact?:boolean;markOnly?:boolean}){
  const {theme}=useVoticTheme();
  const size=compact?24:34;
  return <View accessible accessibilityRole="image" accessibilityLabel="Votic logo" style={s.row}>
    <View style={{width:size,height:size,marginTop:1}}><Image source={require("../../assets/votic-mark.png")} resizeMode="contain" style={{width:size,height:size}}/><Image source={require("../../assets/votic-wings-mask.png")} resizeMode="contain" tintColor={theme.logoWing} style={[s.wings,{width:size,height:size}]}/></View>
    {markOnly?null:<Text style={[compact?s.compact:s.logo,{color:theme.text}]}>otic</Text>}
  </View>;
}

const s=StyleSheet.create({row:{flexDirection:"row",alignItems:"center"},wings:{position:"absolute",left:0,top:0},logo:{fontSize:30,lineHeight:34,fontWeight:"900",letterSpacing:-1.2,marginLeft:-3},compact:{fontSize:22,lineHeight:24,fontWeight:"900",letterSpacing:-.9,marginLeft:-3}});

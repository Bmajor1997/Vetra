import { Image,StyleSheet,Text,View } from "react-native";
import { useVoticTheme } from "../theme/ThemeProvider";

export function VoticLogo({compact=false}:{compact?:boolean}){
  const {theme}=useVoticTheme();
  const size=compact?28:36;
  return <View accessible accessibilityRole="image" accessibilityLabel="Votic logo" style={s.row}>
    <Image source={require("../../assets/votic-mark.png")} resizeMode="contain" style={{width:size,height:size,marginTop:1}}/>
    <Text style={[compact?s.compact:s.logo,{color:theme.text}]}>otic</Text>
  </View>;
}

const s=StyleSheet.create({row:{flexDirection:"row",alignItems:"center"},logo:{fontSize:31,lineHeight:36,fontWeight:"900",letterSpacing:-1.2,marginLeft:-3},compact:{fontSize:24,lineHeight:28,fontWeight:"900",letterSpacing:-.9,marginLeft:-3}});

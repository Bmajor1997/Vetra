import { Image,StyleSheet,Text,View } from "react-native";
import { useVoticTheme } from "../theme/ThemeProvider";

export function VoticLogo({compact=false}:{compact?:boolean}){
  const {theme}=useVoticTheme();
  const size=compact?24:34;
  return <View accessible accessibilityRole="image" accessibilityLabel="Votic logo" style={s.row}>
    <Image source={require("../../assets/votic-mark.png")} resizeMode="contain" style={{width:size*1.08,height:size}}/>
    <Text style={[compact?s.compact:s.logo,{color:theme.text}]}>otic</Text>
  </View>;
}

const s=StyleSheet.create({row:{flexDirection:"row",alignItems:"center"},logo:{fontSize:30,fontWeight:"900",letterSpacing:-1.2,marginLeft:-3},compact:{fontSize:22,fontWeight:"900",letterSpacing:-.8,marginLeft:-2}});

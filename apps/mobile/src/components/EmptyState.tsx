import { Image,ImageSourcePropType,StyleSheet,Text,View } from "react-native";
import { spacing,typography } from "../design/tokens";
import { useVoticTheme } from "../theme/ThemeProvider";

type EmptyStateProps={
  image:ImageSourcePropType;
  imageAccessibilityLabel:string;
  title:string;
  description:string;
};

export function EmptyState({image,imageAccessibilityLabel,title,description}:EmptyStateProps){
  const {theme}=useVoticTheme();
  return <View style={s.container}>
    <Image source={image} resizeMode="contain" accessible accessibilityRole="image" accessibilityLabel={imageAccessibilityLabel} style={s.image}/>
    <Text accessibilityRole="header" style={[s.title,{color:theme.text}]}>{title}</Text>
    <Text style={[s.description,{color:theme.mutedText}]}>{description}</Text>
  </View>;
}

const s=StyleSheet.create({
  container:{alignItems:"center",paddingVertical:spacing.xl,gap:spacing.sm},
  image:{width:"100%",maxWidth:280,aspectRatio:1,marginBottom:spacing.sm},
  title:{...typography.sectionTitle,textAlign:"center"},
  description:{...typography.body,textAlign:"center",maxWidth:360},
});

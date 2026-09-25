import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVoticTheme } from "../../src/theme/ThemeProvider";

export default function TabLayout(){
  const {theme}=useVoticTheme();
  const insets=useSafeAreaInsets();
  return <Tabs screenOptions={{
    headerShown:false,
    tabBarActiveTintColor:theme.accent,
    tabBarInactiveTintColor:theme.mutedText,
    tabBarHideOnKeyboard:true,
    tabBarStyle:{
      backgroundColor:theme.surface,
      borderTopColor:theme.border,
      borderTopWidth:1,
      height:64+insets.bottom,
      paddingTop:6,
      paddingBottom:Math.max(insets.bottom,8)
    },
    tabBarLabelStyle:{fontSize:11,fontWeight:"700"},
    tabBarItemStyle:{minHeight:52}
  }}>
    <Tabs.Screen name="index" options={{title:"Home",tabBarAccessibilityLabel:"Home",tabBarIcon:({color,size,focused})=><Ionicons name={focused?"home":"home-outline"} color={color} size={size}/>}}/>
    <Tabs.Screen name="documents" options={{title:"Documents",tabBarAccessibilityLabel:"Documents",tabBarIcon:({color,size,focused})=><Ionicons name={focused?"documents":"documents-outline"} color={color} size={size}/>}}/>
    <Tabs.Screen name="notes" options={{title:"Notes",tabBarAccessibilityLabel:"Notes",tabBarIcon:({color,size,focused})=><Ionicons name={focused?"bookmarks":"bookmarks-outline"} color={color} size={size}/>}}/>
    <Tabs.Screen name="settings" options={{title:"Settings",tabBarAccessibilityLabel:"Settings",tabBarIcon:({color,size,focused})=><Ionicons name={focused?"settings":"settings-outline"} color={color} size={size}/>}}/>
  </Tabs>;
}

import { Stack } from "expo-router";
import { ThemeProvider } from "../src/theme/ThemeProvider";
export default function RootLayout(){return <ThemeProvider><Stack screenOptions={{headerShown:false}}><Stack.Screen name="(tabs)"/><Stack.Screen name="reader"/></Stack></ThemeProvider>}

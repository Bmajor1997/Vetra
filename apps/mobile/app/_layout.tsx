import { Stack } from "expo-router";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AccessibilityProvider } from "../src/accessibility/AccessibilityProvider";
export default function RootLayout(){return <ThemeProvider><AccessibilityProvider><Stack screenOptions={{headerShown:false}}><Stack.Screen name="(tabs)"/><Stack.Screen name="reader"/></Stack></AccessibilityProvider></ThemeProvider>}

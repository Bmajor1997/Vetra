import { Stack } from "expo-router";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AccessibilityProvider } from "../src/accessibility/AccessibilityProvider";
import { DocumentLibraryProvider } from "../src/documents/DocumentLibraryProvider";

export default function RootLayout(){
  return <ThemeProvider><AccessibilityProvider><DocumentLibraryProvider>
    <Stack screenOptions={{headerShown:false}}>
      <Stack.Screen name="(tabs)"/>
      <Stack.Screen name="reader"/>
      <Stack.Screen name="assistant"/>
      <Stack.Screen name="notes"/>
      <Stack.Screen name="review"/>
      <Stack.Screen name="recap"/>
    </Stack>
  </DocumentLibraryProvider></AccessibilityProvider></ThemeProvider>;
}

import { Stack } from "expo-router";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { AccessibilityProvider } from "../src/accessibility/AccessibilityProvider";
import { DocumentLibraryProvider } from "../src/documents/DocumentLibraryProvider";
import { RoutineProvider } from "../src/routines/RoutineProvider";
export default function RootLayout(){return <ThemeProvider><AccessibilityProvider><DocumentLibraryProvider><RoutineProvider><Stack screenOptions={{headerShown:false}}><Stack.Screen name="(tabs)"/><Stack.Screen name="reader"/><Stack.Screen name="assistant"/><Stack.Screen name="worksheet"/><Stack.Screen name="recap"/></Stack></RoutineProvider></DocumentLibraryProvider></AccessibilityProvider></ThemeProvider>}

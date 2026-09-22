import { createContext,PropsWithChildren,useContext,useMemo,useState } from "react";
import { useColorScheme } from "react-native";
export type AccentName="blue"|"purple"|"orange"|"red";
export type AppearanceMode="light"|"dark"|"system";
const accents:Record<AccentName,string>={blue:"#2563EB",purple:"#7C3AED",orange:"#B45309",red:"#B91C1C"};
const palettes={light:{background:"#FFFFFF",surface:"#FFFFFF",surfaceMuted:"#F5F5F4",text:"#292D32",mutedText:"#626262",border:"#E5E7EB"},dark:{background:"#292D32",surface:"#32373D",surfaceMuted:"#24282D",text:"#FAFAF9",mutedText:"#D1D5DB",border:"#4B5158"}} as const;
const C=createContext<any>(null);
export function ThemeProvider({children}:PropsWithChildren){const system=useColorScheme();const [accentName,setAccentName]=useState<AccentName>("orange");const [appearanceMode,setAppearanceMode]=useState<AppearanceMode>("light");const resolvedMode:Exclude<AppearanceMode,"system">=appearanceMode==="system"?(system==="dark"?"dark":"light"):appearanceMode;const theme=useMemo(()=>({...palettes[resolvedMode],accent:accents[accentName],mode:resolvedMode,isDark:resolvedMode==="dark"}),[accentName,resolvedMode]);return <C.Provider value={{accentName,setAccentName,appearanceMode,setAppearanceMode,resolvedMode,theme}}>{children}</C.Provider>}
export function useVoticTheme(){const c=useContext(C);if(!c)throw new Error("useVoticTheme must be used inside ThemeProvider");return c}

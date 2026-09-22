import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";
export type AccentName = "blue"|"purple"|"orange"|"red";
const accents:Record<AccentName,string>={blue:"#2563EB",purple:"#7C3AED",orange:"#C2410C",red:"#B91C1C"};
const C=createContext<any>(null);
export function ThemeProvider({children}:PropsWithChildren){const [accentName,setAccentName]=useState<AccentName>("blue");const theme=useMemo(()=>({accent:accents[accentName],background:"#F7F7F8",surface:"#FFFFFF",text:"#171717",mutedText:"#626262",border:"#DEDEE3"}),[accentName]);return <C.Provider value={{accentName,setAccentName,theme}}>{children}</C.Provider>}
export function useVoticTheme(){const c=useContext(C);if(!c)throw new Error("useVoticTheme must be used inside ThemeProvider");return c}

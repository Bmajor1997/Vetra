import { createContext,PropsWithChildren,useContext,useState } from "react";
export type TextSize="default"|"large"|"extra-large"; export type ReadingSpacing="default"|"extra";
type A={textSize:TextSize;setTextSize:(v:TextSize)=>void;readingSpacing:ReadingSpacing;setReadingSpacing:(v:ReadingSpacing)=>void;reduceMotion:boolean;setReduceMotion:(v:boolean)=>void;wordEmphasis:boolean;setWordEmphasis:(v:boolean)=>void};
const C=createContext<A|null>(null);
export function AccessibilityProvider({children}:PropsWithChildren){const [textSize,setTextSize]=useState<TextSize>("default");const [readingSpacing,setReadingSpacing]=useState<ReadingSpacing>("default");const [reduceMotion,setReduceMotion]=useState(false);const [wordEmphasis,setWordEmphasis]=useState(true);return <C.Provider value={{textSize,setTextSize,readingSpacing,setReadingSpacing,reduceMotion,setReduceMotion,wordEmphasis,setWordEmphasis}}>{children}</C.Provider>}
export function useAccessibilityPreferences(){const c=useContext(C);if(!c)throw new Error("useAccessibilityPreferences must be used inside AccessibilityProvider");return c}

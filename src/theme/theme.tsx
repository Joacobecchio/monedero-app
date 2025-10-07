import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { loadPrefs, savePrefs, ThemeMode } from '../store/prefs';
import { LIGHT, DARK, Palette } from './tokens';


interface ThemeCtx { mode:ThemeMode; scheme: 'light'|'dark'; tokens:Palette; setMode:(m:ThemeMode)=>Promise<void>; }
const Ctx = createContext<ThemeCtx|null>(null);


export function ThemeProvider({children}:{children:React.ReactNode}){
const [mode,setMode] = useState<ThemeMode>('system');
const [device,setDevice]=useState<ColorSchemeName>(Appearance.getColorScheme());


useEffect(()=>{
const sub = Appearance.addChangeListener(({colorScheme})=>setDevice(colorScheme));
(async()=>{ const p=await loadPrefs(); if(p?.themeMode) setMode(p.themeMode); })();
return ()=>sub.remove();
},[]);


const scheme = (mode==='system' ? device : mode) === 'dark' ? 'dark':'light';
const tokens = scheme==='dark'? DARK: LIGHT;


const value = useMemo(()=>({
mode, scheme: scheme as 'light'|'dark', tokens,
setMode: async (m:ThemeMode)=>{ setMode(m); const p=await loadPrefs(); await savePrefs({...(p||{country:'AR',currency:'ARS',language:'es',onboarded:false}), themeMode:m}); }
}),[mode,scheme]);


return (
    <Ctx.Provider value={value}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {children}
    </Ctx.Provider>
  );
}


export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("ThemeProvider missing"); 
  return v;
}
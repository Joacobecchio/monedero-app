import AsyncStorage from '@react-native-async-storage/async-storage';


export type ThemeMode = 'light'|'dark'|'system';
export type Currency = 'ARS'|'USD';


export interface Prefs {
onboarded: boolean;
country: string; // ISO-3166, ej: "AR"
currency: Currency; // 'ARS' | 'USD'
language: 'es'|'en';
themeMode: ThemeMode;
}


const KEY = 'monedero:prefs:v1';
const DEFAULTS: Prefs = { onboarded:false, country:'AR', currency:'ARS', language:'es', themeMode:'system' };


export async function loadPrefs(): Promise<Prefs> {
try { const raw = await AsyncStorage.getItem(KEY); return raw? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS; }
catch { return DEFAULTS; }
}
export async function savePrefs(p: Partial<Prefs>) {
const cur = await loadPrefs();
const next = { ...cur, ...p } as Prefs;
await AsyncStorage.setItem(KEY, JSON.stringify(next));
return next;
}
export async function resetPrefs(){ await AsyncStorage.removeItem(KEY); }
// app/onboarding.tsx
import { useState } from 'react';
import { View, Pressable, Keyboard, TouchableWithoutFeedback, ScrollView, Modal, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedView, ThemedText } from '../src/ui/Themed';
import Button from '../src/ui/Button';
// (Input no se usa en esta versión)
import { savePrefs, loadPrefs, type Currency } from '../src/store/prefs';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/theme';
import { Picker } from '@react-native-picker/picker';

const COUNTRIES = [
  { code: 'AR', name: 'Argentina' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'MX', name: 'México' },
  { code: 'ES', name: 'España' },
  { code: 'US', name: 'Estados Unidos' },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens } = useTheme();

  const [country, setCountry] = useState('AR');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [countryModal, setCountryModal] = useState(false);

  const selectedCountry = COUNTRIES.find(c => c.code === country)?.name || country;

  async function handleStart() {
    const cur = await loadPrefs();
    await savePrefs({ ...cur, country, currency, language, onboarded: true });
    router.replace('/');
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={{ flex: 1, paddingTop: insets.top, backgroundColor: tokens.background }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 14 }}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText style={{ fontSize: 28, fontWeight: '800' }}>¡Bienvenido!</ThemedText>
          <ThemedText>Configurá lo básico para arrancar.</ThemedText>

          {/* País */}
          <ThemedText style={{ marginTop: 8 }}>País</ThemedText>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setCountryModal(true);
            }}
            style={{
              borderWidth: 1,
              borderColor: tokens.border,
              backgroundColor: tokens.card,
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 12,
            }}
          >
            <ThemedText>{selectedCountry} ({country})</ThemedText>
          </Pressable>

          {/* Moneda */}
          <ThemedText style={{ marginTop: 16 }}>Moneda</ThemedText>
          <ThemedView style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="ARS" kind={currency === 'ARS' ? 'primary' : 'ghost'} onPress={() => setCurrency('ARS')} />
            <Button title="USD" kind={currency === 'USD' ? 'primary' : 'ghost'} onPress={() => setCurrency('USD')} />
          </ThemedView>

          {/* Idioma */}
          <ThemedText style={{ marginTop: 16 }}>Idioma</ThemedText>
          <ThemedView style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Español" kind={language === 'es' ? 'primary' : 'ghost'} onPress={() => setLanguage('es')} />
            <Button title="English" kind={language === 'en' ? 'primary' : 'ghost'} onPress={() => setLanguage('en')} />
          </ThemedView>

          <Button title="Comenzar" onPress={handleStart} style={{ marginTop: 24 }} />
        </ScrollView>

        {/* Modal de selección de país */}
        <Modal
  visible={countryModal}
  transparent
  animationType="fade"
  onRequestClose={() => setCountryModal(false)}
>
  <View style={{ flex: 1, justifyContent: 'flex-end' }}>
    {/* Backdrop como HERMANO, no padre del sheet */}
    <TouchableWithoutFeedback onPress={() => setCountryModal(false)}>
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: '#0007',
        }}
      />
    </TouchableWithoutFeedback>

    {/* Sheet: captura sus propios toques y NO burbujea al backdrop */}
    <Pressable
      onPress={() => {}}
      style={{
        backgroundColor: tokens.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 12,
      }}
    >
      <ThemedText style={{ fontWeight: '700', marginBottom: 6 }}>
        Elegí tu país
      </ThemedText>

      <Picker
        selectedValue={country}
        onValueChange={(v) => setCountry(String(v))}
        dropdownIconColor={tokens.text}
        style={{ color: tokens.text }}
      >
        {COUNTRIES.map((c) => (
          <Picker.Item key={c.code} label={`${c.name} (${c.code})`} value={c.code} />
        ))}
      </Picker>

      <Button title="Listo" onPress={() => setCountryModal(false)} />
    </Pressable>
  </View>
</Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

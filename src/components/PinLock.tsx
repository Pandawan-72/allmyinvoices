import { useState, useEffect , useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Vibration } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Icons from "lucide-react-native";
import { verifyPIN, isBiometricAvailable, authenticateWithBiometrics, isBiometricEnabled } from "@/src/lib/pin";
import { useTheme } from "@/src/contexts/ThemeContext";

type Props = {
  onUnlock: () => void;
  onClose?: () => void;
};

export default function PinLock({ onUnlock, onClose }: Props) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      const hwAvailable = await isBiometricAvailable();
      const userEnabled = await isBiometricEnabled();
      const available = hwAvailable && userEnabled;
      setBiometricAvailable(available);
      if (available) {
        tryBiometric();
      }
    })();
  }, []);

  const tryBiometric = async () => {
    const success = await authenticateWithBiometrics();
    if (success) onUnlock();
  };

  const onPress = async (digit: string) => {
    const newInput = input + digit;
    setInput(newInput);
    setError(false);

    if (newInput.length === 4) {
      const ok = await verifyPIN(newInput);
      if (ok) {
        onUnlock();
      } else {
        Vibration.vibrate(400);
        setError(true);
        setTimeout(() => {
          setInput("");
          setError(false);
        }, 800);
      }
    }
  };

  const onDelete = () => {
    setInput(prev => prev.slice(0, -1));
    setError(false);
  };

  const dots = [0, 1, 2, 3];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {onClose ? (
        <View style={{ alignItems: "flex-end", paddingRight: 16, paddingTop: 8 }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Icons.X color="#6B7280" size={24} />
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.container}>
        <View style={styles.logoWrap}>
          <Icons.Lock color={theme.accent} size={40} strokeWidth={1.5} />
          <Text style={styles.title}>All My Cards</Text>
          <Text style={styles.subtitle}>Entrez votre code PIN</Text>
        </View>

        {/* Dots */}
        <View style={styles.dotsRow}>
          {dots.map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                input.length > i && styles.dotFilled,
                error && styles.dotError,
              ]}
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>Code incorrect</Text> : <Text style={styles.errorText}> </Text>}

        {/* Keypad */}
        <View style={styles.keypad}>
          {["1","2","3","4","5","6","7","8","9"].map((d) => (
            <TouchableOpacity key={d} style={styles.key} onPress={() => onPress(d)}>
              <Text style={styles.keyText}>{d}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.key}>
            {biometricAvailable ? (
              <TouchableOpacity onPress={tryBiometric}>
                <Icons.Fingerprint color={theme.accent} size={28} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={styles.key} onPress={() => onPress("0")}>
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.key} onPress={onDelete}>
            <Icons.Delete color={theme.text} size={24} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  logoWrap: { alignItems: "center", marginBottom: 40 },
  title: { fontSize: 24, fontWeight: "900", color: theme.text, marginTop: 12 },
  subtitle: { fontSize: 15, color: theme.textMuted, marginTop: 6 },
  dotsRow: { flexDirection: "row", gap: 20, marginBottom: 12 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: theme.border, backgroundColor: "transparent" },
  dotFilled: { backgroundColor: theme.accent, borderColor: theme.accent },
  dotError: { backgroundColor: theme.danger, borderColor: theme.danger },
  errorText: { fontSize: 13, color: theme.danger, fontWeight: "700", marginBottom: 24, height: 20 },
  keypad: { flexDirection: "row", flexWrap: "wrap", width: 280, gap: 16, justifyContent: "center" },
  key: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" },
  keyText: { fontSize: 26, fontWeight: "700", color: theme.text },
});
}

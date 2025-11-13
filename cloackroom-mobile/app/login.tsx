import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { useHealth } from "@/hooks/useHealth";

type LoginType = "staff" | "admin";

export default function LoginScreen() {
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [type, setType] = useState<LoginType>("staff");
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    data: health,
    isFetching: healthLoading,
    refetch: refetchHealth,
    error: healthError,
  } = useHealth();
  const [hasCheckedHealth, setHasCheckedHealth] = useState(false);

  const mongoConnected = health?.mongo.connected;
  const mongoStatusLabel = healthLoading
    ? "Checking..."
    : !hasCheckedHealth
    ? "Status unchecked"
    : mongoConnected === undefined
    ? "Status unknown"
    : mongoConnected
    ? "MongoDB connected"
    : "MongoDB offline";
  const mongoErrorMessage = (() => {
    if (healthLoading) return undefined;
    if (mongoConnected) return undefined;
    if (health?.mongo.error) return health.mongo.error;
    if (healthError instanceof Error) return healthError.message;
    if (typeof healthError === "string") return healthError;
    return undefined;
  })();

  const disabled = !email || !password || submitting;

  async function handleSubmit() {
    if (disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn({ email, password, type, remember });
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Login failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckHealth() {
    setHasCheckedHealth(true);
    try {
      await refetchHealth({ throwOnError: false });
    } catch (err) {
      console.warn("Health check failed", err);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.box}>
          <Text style={styles.brand}>Cloackroom Private</Text>
          <Text style={styles.subtitle}>
            Sign in with your staff or admin account.
          </Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  !hasCheckedHealth
                    ? styles.statusDotUnknown
                    : healthLoading
                    ? styles.statusDotPending
                    : mongoConnected
                    ? styles.statusDotOnline
                    : styles.statusDotOffline,
                ]}
              />
              <Text style={styles.statusText}>{mongoStatusLabel}</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.statusButton}
              onPress={handleCheckHealth}
              disabled={healthLoading}
            >
              {healthLoading ? (
                <ActivityIndicator color="#38bdf8" size="small" />
              ) : (
                <Text style={styles.statusButtonText}>Check now</Text>
              )}
            </TouchableOpacity>
            {mongoErrorMessage ? (
              <Text style={styles.statusError} numberOfLines={2}>
                {mongoErrorMessage}
              </Text>
            ) : null}
          </View>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setType("staff")}
              style={[
                styles.toggleChip,
                type === "staff" && styles.toggleChipActive,
              ]}
            >
              <Text
                style={
                  type === "staff" ? styles.toggleTextActive : styles.toggleText
                }
              >
                Staff
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setType("admin")}
              style={[
                styles.toggleChip,
                type === "admin" && styles.toggleChipActive,
              ]}
            >
              <Text
                style={
                  type === "admin" ? styles.toggleTextActive : styles.toggleText
                }
              >
                Admin
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="Email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRemember((prev) => !prev)}
          >
            <View
              style={[styles.checkbox, remember && styles.checkboxChecked]}
            />
            <Text style={styles.rememberLabel}>Remember me on this device</Text>
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleSubmit}
            disabled={disabled}
            style={[styles.button, disabled && styles.buttonDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>
          {isLoading ? (
            <Text style={styles.loadingHint}>Checking existing session...</Text>
          ) : null}
          {type === "admin" ? (
            <Text style={styles.hint}>
              Admins can manage staff, events and review all reports.
            </Text>
          ) : (
            <Text style={styles.hint}>
              Staff accounts are scoped to their assigned event.
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#070b14" },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  box: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0d1627",
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  brand: { fontSize: 24, fontWeight: "700", color: "#f8fafc" },
  subtitle: { fontSize: 14, color: "#cbd5f5" },
  toggleRow: { flexDirection: "row", gap: 12 },
  toggleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    alignItems: "center",
  },
  toggleChipActive: { backgroundColor: "#38bdf8", borderColor: "#38bdf8" },
  toggleText: { color: "#e2e8f0", fontWeight: "600" },
  toggleTextActive: { color: "#04101f", fontWeight: "700" },
  input: {
    backgroundColor: "#101b2e",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f8fafc",
    borderWidth: 1,
    borderColor: "#1f2b3f",
  },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "transparent",
  },
  checkboxChecked: { backgroundColor: "#38bdf8", borderColor: "#38bdf8" },
  rememberLabel: { color: "#e2e8f0" },
  button: {
    backgroundColor: "#38bdf8",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#04101f", fontWeight: "700", fontSize: 16 },
  error: { color: "#f97316", fontSize: 13 },
  hint: { color: "#64748b", fontSize: 13 },
  loadingHint: { color: "#94a3b8", fontSize: 12 },
  statusCard: {
    backgroundColor: "#101b2e",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1f2b3f",
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fbbf24",
  },
  statusDotOnline: { backgroundColor: "#22c55e" },
  statusDotOffline: { backgroundColor: "#ef4444" },
  statusDotPending: { backgroundColor: "#fbbf24" },
  statusDotUnknown: { backgroundColor: "#64748b" },
  statusText: { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },
  statusButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    backgroundColor: "#101b2e",
  },
  statusButtonText: { color: "#38bdf8", fontWeight: "600" },
  statusError: { marginTop: 8, color: "#fca5a5", fontSize: 12 },
});

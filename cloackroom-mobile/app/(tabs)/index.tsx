import { Href, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useEvents } from "@/hooks/useEvents";
import { useHandoversList } from "@/hooks/useHandovers";
import { useHealth } from "@/hooks/useHealth";
import { useAuth } from "@/providers/AuthProvider";

type ActionItem = {
  key: string;
  title: string;
  description: string;
  target: Href;
  adminOnly?: boolean;
};

const actions: readonly ActionItem[] = [
  {
    key: "handover",
    title: "New Handover",
    description: "Capture a new lost-ticket handover with photos.",
    target: "/(tabs)/handover",
  },
  {
    key: "reports",
    title: "Reports",
    description: "Browse existing handovers and open print view.",
    target: "/(tabs)/reports",
  },
  {
    key: "admin",
    title: "Admin",
    description: "Manage events and staff accounts.",
    target: "/(tabs)/admin",
    adminOnly: true,
  },
] as const;

export default function TabHomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { data: events } = useEvents(!!user);
  const { data: handovers } = useHandoversList({ q: "" }, !!user);
  const {
    data: health,
    isFetching: healthLoading,
    refetch: refetchHealth,
    error: healthError,
  } = useHealth();
  const [signingOut, setSigningOut] = useState(false);
  const insets = useSafeAreaInsets();
  const assignedEvent = useMemo(() => {
    if (!events || !user?.authorizedEventId) return null;
    return events.find((ev) => ev.id === user.authorizedEventId) ?? null;
  }, [events, user?.authorizedEventId]);

  const visibleActions = actions.filter((item) =>
    item.adminOnly ? user?.type === "admin" : true
  );

  const [hasCheckedHealth, setHasCheckedHealth] = useState(false);
  const mongoConnected = health?.mongo.connected;
  const mongoStatusLabel = healthLoading
    ? "Checking..."
    : !hasCheckedHealth
    ? "Status unchecked"
    : mongoConnected === undefined
    ? "Unknown"
    : mongoConnected
    ? "MongoDB connected"
    : "MongoDB offline";
  const mongoSampleCount =
    hasCheckedHealth && typeof health?.mongo.sampleCount === "number"
      ? `${health.mongo.sampleCount} recent record${
          health.mongo.sampleCount === 1 ? "" : "s"
        } fetched`
      : undefined;
  const mongoErrorMessage = (() => {
    if (healthLoading) return undefined;
    if (!hasCheckedHealth) return undefined;
    if (mongoConnected) return undefined;
    if (health?.mongo.error) return health.mongo.error;
    if (healthError instanceof Error) return healthError.message;
    if (typeof healthError === "string") return healthError;
    return undefined;
  })();
  const handleCheckHealth = async () => {
    setHasCheckedHealth(true);
    try {
      await refetchHealth({ throwOnError: false });
    } catch (err) {
      console.warn("Health check failed", err);
    }
  };

  const confirmSignOut = () => {
    Alert.alert("Sign out", "End the current session on this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          setSigningOut(true);
          void signOut()
            .catch((error) => {
              console.error("Failed to sign out", error);
              Alert.alert(
                "Sign out failed",
                "Could not end the session. Please try again."
              );
            })
            .finally(() => {
              setSigningOut(false);
            });
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.heading}>Private area</Text>
          <Text style={styles.subtitle}>Signed in as {user?.fullName}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.signOutButton, signingOut && styles.signOutDisabled]}
          onPress={confirmSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator color="#f8fafc" size="small" />
          ) : (
            <Text style={styles.signOutText}>Sign out</Text>
          )}
        </TouchableOpacity>
      </View>
      {assignedEvent ? (
        <View style={styles.eventBanner}>
          <Text style={styles.eventTitle}>{assignedEvent.name}</Text>
          <Text style={styles.eventDates}>
            {new Date(assignedEvent.startsAt).toLocaleString()} –{" "}
            {new Date(assignedEvent.endsAt).toLocaleString()}
          </Text>
        </View>
      ) : null}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Handovers</Text>
          <Text style={styles.metricValue}>{handovers?.length ?? "—"}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Events</Text>
          <Text style={styles.metricValue}>{events?.length ?? "—"}</Text>
        </View>
      </View>
      <View style={styles.statusCard}>
        <Text style={styles.metricLabel}>Database</Text>
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
        {mongoSampleCount ? (
          <Text style={styles.statusDetail}>{mongoSampleCount}</Text>
        ) : null}
        {mongoErrorMessage ? (
          <Text style={styles.statusError} numberOfLines={2}>
            {mongoErrorMessage}
          </Text>
        ) : null}
      </View>
      <FlatList
        data={visibleActions}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(item.target)}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.description}</Text>
          </Pressable>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#070b14",
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  heading: { fontSize: 24, fontWeight: "700", color: "#f8fafc" },
  subtitle: { marginTop: 4, fontSize: 14, color: "#cbd5f5" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerTextGroup: { flex: 1 },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ef4444",
    backgroundColor: "#101b2e",
  },
  signOutDisabled: { opacity: 0.6 },
  signOutText: { color: "#fca5a5", fontWeight: "700" },
  eventBanner: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#0d1627",
    borderWidth: 1,
    borderColor: "#1f2b3f",
  },
  eventTitle: { fontSize: 16, fontWeight: "700", color: "#e2e8f0" },
  eventDates: { marginTop: 6, color: "#94a3b8", fontSize: 13 },
  metricsRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  metricCard: {
    flex: 1,
    backgroundColor: "#0d1627",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2b3f",
  },
  metricLabel: { color: "#94a3b8", fontSize: 13 },
  metricValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "700",
    color: "#f8fafc",
  },
  listContent: { marginTop: 28, paddingBottom: 80, gap: 16 },
  card: {
    backgroundColor: "#0d1627",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1f2b3f",
  },
  cardPressed: { backgroundColor: "#11203a" },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 6,
  },
  cardBody: { color: "#cbd5f5", fontSize: 14 },
  statusCard: {
    marginTop: 20,
    backgroundColor: "#0d1627",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2b3f",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fbbf24",
  },
  statusDotOnline: { backgroundColor: "#22c55e" },
  statusDotOffline: { backgroundColor: "#ef4444" },
  statusDotPending: { backgroundColor: "#fbbf24" },
  statusDotUnknown: { backgroundColor: "#64748b" },
  statusText: { color: "#f8fafc", fontSize: 14, fontWeight: "600" },
  statusButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    backgroundColor: "#101b2e",
  },
  statusButtonText: { color: "#38bdf8", fontWeight: "600" },
  statusDetail: { marginTop: 8, color: "#94a3b8", fontSize: 13 },
  statusError: { marginTop: 6, color: "#fca5a5", fontSize: 12 },
});

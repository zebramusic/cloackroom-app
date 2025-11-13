import { Href, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDeleteHandover, useHandoversList } from "@/hooks/useHandovers";
import { useAuth } from "@/providers/AuthProvider";

interface FiltersState {
  q: string;
  coat: string;
  name: string;
  phone: string;
  eventName: string;
}

export default function ReportsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [filters, setFilters] = useState<FiltersState>({
    q: "",
    coat: "",
    name: "",
    phone: "",
    eventName: "",
  });
  const router = useRouter();
  const deleteHandover = useDeleteHandover();
  const isAdmin = user?.type === "admin";

  // Use filters directly for now to avoid debouncing issues
  const queryFilters = useMemo(() => {
    return {
      q: filters.q || undefined,
      coat: filters.coat || undefined,
      name: filters.name || undefined,
      phone: filters.phone || undefined,
      eventName:
        user?.type === "staff" ? undefined : filters.eventName || undefined,
      eventId: user?.type === "staff" ? user.authorizedEventId : undefined,
    };
  }, [filters, user?.authorizedEventId, user?.type]);

  const { data, isLoading, refetch, isRefetching } = useHandoversList(
    queryFilters,
    !!user
  );

  const onReset = useCallback(() => {
    setFilters({ q: "", coat: "", name: "", phone: "", eventName: "" });
  }, []);

  const confirmDelete = useCallback(
    (id: string) => {
      if (!isAdmin) return;
      Alert.alert(
        "Delete handover",
        "Are you sure you want to delete this handover?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              void deleteHandover
                .mutateAsync(id)
                .then(() =>
                  Alert.alert(
                    "Handover deleted",
                    "The handover has been removed."
                  )
                )
                .catch((error) =>
                  Alert.alert(
                    "Delete failed",
                    error instanceof Error
                      ? error.message
                      : "Could not delete the handover."
                  )
                );
            },
          },
        ]
      );
    },
    [deleteHandover, isAdmin]
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={styles.heading}>Recent handovers</Text>
      <Text style={styles.subtitle}>
        Search saved reports, open details or trigger a PDF from the web app.
      </Text>

      <View style={styles.filters}>
        <TextInput
          placeholder="Quick search"
          placeholderTextColor="#64748b"
          style={styles.input}
          value={filters.q}
          onChangeText={(value) =>
            setFilters((prev) => ({ ...prev, q: value }))
          }
        />
        <View style={styles.inlineRow}>
          <TextInput
            placeholder="Coat #"
            placeholderTextColor="#64748b"
            style={[styles.input, styles.shortInput]}
            value={filters.coat}
            onChangeText={(value) =>
              setFilters((prev) => ({ ...prev, coat: value }))
            }
          />
          <TextInput
            placeholder="Name"
            placeholderTextColor="#64748b"
            style={styles.input}
            value={filters.name}
            onChangeText={(value) =>
              setFilters((prev) => ({ ...prev, name: value }))
            }
          />
        </View>
        <View style={styles.inlineRow}>
          <TextInput
            placeholder="Phone"
            placeholderTextColor="#64748b"
            style={styles.input}
            value={filters.phone}
            onChangeText={(value) =>
              setFilters((prev) => ({ ...prev, phone: value }))
            }
          />
          {user?.type !== "staff" ? (
            <TextInput
              placeholder="Event name"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={filters.eventName}
              onChangeText={(value) =>
                setFilters((prev) => ({ ...prev, eventName: value }))
              }
            />
          ) : null}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.resetButton}
          onPress={onReset}
        >
          <Text style={styles.resetText}>Reset filters</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#38bdf8" />
          <Text style={styles.loadingText}>Loading handovers…</Text>
        </View>
      ) : null}

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.rowContent}
              onPress={() => router.push(`/reports/${item.id}` as Href)}
            >
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>
                  #{item.coatNumber} — {item.fullName}
                </Text>
                <Text style={styles.rowTimestamp}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
              <View style={styles.rowMeta}>
                {item.staff ? (
                  <Text style={styles.metaPill}>Staff: {item.staff}</Text>
                ) : null}
                {item.phone ? (
                  <Text style={styles.metaPill}>Tel: {item.phone}</Text>
                ) : null}
                {item.language ? (
                  <Text style={styles.metaPill}>
                    Lang: {item.language.toUpperCase()}
                  </Text>
                ) : null}
                {item.eventName ? (
                  <Text style={styles.metaPill}>Event: {item.eventName}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
            {isAdmin ? (
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => confirmDelete(item.id)}
                  disabled={deleteHandover.isPending}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.empty}>No handovers found.</Text>
          ) : null
        }
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
  subtitle: { marginTop: 4, color: "#cbd5f5", fontSize: 14 },
  filters: {
    marginTop: 20,
    backgroundColor: "#0d1627",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    gap: 12,
  },
  input: {
    backgroundColor: "#101b2e",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    color: "#f8fafc",
    flex: 1,
  },
  shortInput: { flex: 0.4 },
  inlineRow: { flexDirection: "row", gap: 12 },
  resetButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    backgroundColor: "#101b2e",
  },
  resetText: { color: "#38bdf8", fontWeight: "600" },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  loadingText: { color: "#94a3b8" },
  listContent: { paddingVertical: 24, gap: 14, paddingBottom: 120 },
  row: {
    backgroundColor: "#0d1627",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    padding: 16,
    gap: 12,
  },
  rowContent: { gap: 8 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowTitle: { color: "#f8fafc", fontWeight: "700", flex: 1, flexWrap: "wrap" },
  rowTimestamp: { color: "#94a3b8", fontSize: 12 },
  rowMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#101b2e",
    color: "#e2e8f0",
    fontSize: 12,
  },
  rowActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  deleteButton: {
    marginTop: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#dc2626",
  },
  deleteButtonText: { color: "#f8fafc", fontWeight: "600" },
  empty: { color: "#94a3b8", textAlign: "center", marginTop: 40 },
});

import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  useDeleteHandover,
  useHandoverDetail,
  useUpdateHandover,
} from "@/hooks/useHandovers";
import { getApiBaseUrl } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

export default function HandoverDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const handoverId = useMemo(
    () => (Array.isArray(id) ? id[0] : id) || null,
    [id]
  );
  const { data, isLoading } = useHandoverDetail(handoverId);
  const updateHandover = useUpdateHandover();
  const deleteHandover = useDeleteHandover();
  const { user } = useAuth();
  const isAdmin = user?.type === "admin";
  const canEdit = Boolean(isAdmin);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    coatNumber: "",
    fullName: "",
    phone: "",
    email: "",
    staff: "",
    notes: "",
    clothType: "",
    language: "ro" as "ro" | "en",
  });
  const [phoneVerified, setPhoneVerified] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      coatNumber: data.coatNumber,
      fullName: data.fullName,
      phone: data.phone ?? "",
      email: data.email ?? "",
      staff: data.staff ?? "",
      notes: data.notes ?? "",
      clothType: data.clothType ?? "",
      language: data.language ?? "ro",
    });
    setPhoneVerified(Boolean(data.phoneVerified));
  }, [data]);

  if (!handoverId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Missing handover id.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#38bdf8" />
        <Text style={styles.loading}>Loading handover…</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Handover not found.</Text>
      </View>
    );
  }

  async function openPrint() {
    if (!data) return;
    try {
      const url = `${getApiBaseUrl()}/private/handover/print/${encodeURIComponent(
        data.id
      )}`;
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.warn("Failed to open print view", error);
    }
  }

  const handleSave = async () => {
    if (!data) return;
    const coatNumber = form.coatNumber.trim();
    const fullName = form.fullName.trim();
    if (!coatNumber || !fullName) {
      Alert.alert("Missing details", "Coat number and full name are required.");
      return;
    }
    try {
      await updateHandover.mutateAsync({
        ...data,
        coatNumber,
        fullName,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        staff: form.staff.trim() || undefined,
        notes: form.notes.trim() || undefined,
        clothType: form.clothType.trim() || undefined,
        language: form.language,
        phoneVerified,
        phoneVerifiedAt: phoneVerified
          ? data.phoneVerifiedAt && data.phoneVerified
            ? data.phoneVerifiedAt
            : Date.now()
          : undefined,
        phoneVerifiedBy: phoneVerified
          ? data.phoneVerifiedBy || user?.fullName || data.staff || undefined
          : undefined,
        createdAt: data.createdAt,
      });
      Alert.alert("Saved", "Handover updated successfully.");
      setIsEditing(false);
    } catch (error) {
      Alert.alert(
        "Save failed",
        error instanceof Error ? error.message : "Could not save changes."
      );
    }
  };

  const handleDelete = () => {
    if (!isAdmin) return;
    Alert.alert("Delete handover", "Delete this handover permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteHandover
            .mutateAsync(data.id)
            .then(() => {
              Alert.alert("Handover deleted", "The handover has been removed.");
              router.back();
            })
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
    ]);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setForm({
      coatNumber: data.coatNumber,
      fullName: data.fullName,
      phone: data.phone ?? "",
      email: data.email ?? "",
      staff: data.staff ?? "",
      notes: data.notes ?? "",
      clothType: data.clothType ?? "",
      language: data.language ?? "ro",
    });
    setPhoneVerified(Boolean(data.phoneVerified));
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {isEditing ? (
        <View style={styles.editHeader}>
          <TextInput
            style={styles.headingInput}
            value={form.coatNumber}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, coatNumber: value }))
            }
            placeholder="Coat number"
            placeholderTextColor="#64748b"
          />
          <TextInput
            style={styles.subheadingInput}
            value={form.fullName}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, fullName: value }))
            }
            placeholder="Full name"
            placeholderTextColor="#64748b"
          />
        </View>
      ) : (
        <>
          <Text style={styles.heading}>#{data.coatNumber}</Text>
          <Text style={styles.subheading}>{data.fullName}</Text>
        </>
      )}
      <Text style={styles.meta}>
        {new Date(data.createdAt).toLocaleString()}
      </Text>

      {canEdit ? (
        <View style={styles.actionsRow}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSave}
                disabled={updateHandover.isPending}
              >
                {updateHandover.isPending ? (
                  <ActivityIndicator color="#04101f" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={cancelEditing}
              >
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.outlineButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleDelete}
            disabled={deleteHandover.isPending}
          >
            <Text style={styles.dangerButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Contact</Text>
        {isEditing ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Phone"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, phone: value }))
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              keyboardType="email-address"
              value={form.email}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, email: value }))
              }
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Phone verified</Text>
              <Switch
                value={phoneVerified}
                onValueChange={setPhoneVerified}
                disabled={!form.phone.trim()}
              />
            </View>
          </>
        ) : (
          <>
            {data.phone ? (
              <Text style={styles.value}>Phone: {data.phone}</Text>
            ) : null}
            {data.email ? (
              <Text style={styles.value}>Email: {data.email}</Text>
            ) : null}
            {data.phoneVerified ? (
              <Text style={styles.value}>Phone verified ✓</Text>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Details</Text>
        {isEditing ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Staff"
              placeholderTextColor="#64748b"
              value={form.staff}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, staff: value }))
              }
            />
            <View style={styles.languageRow}>
              <Text style={styles.switchLabel}>Language</Text>
              <View style={styles.languagePills}>
                {(["ro", "en"] as const).map((code) => (
                  <TouchableOpacity
                    key={code}
                    style={[
                      styles.languagePill,
                      form.language === code && styles.languagePillActive,
                    ]}
                    onPress={() =>
                      setForm((prev) => ({ ...prev, language: code }))
                    }
                  >
                    <Text
                      style={
                        form.language === code
                          ? styles.languageTextActive
                          : styles.languageText
                      }
                    >
                      {code.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Clothing item"
              placeholderTextColor="#64748b"
              value={form.clothType}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, clothType: value }))
              }
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notes"
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={4}
              value={form.notes}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, notes: value }))
              }
            />
            {data.eventName ? (
              <Text style={styles.metaNote}>Event: {data.eventName}</Text>
            ) : null}
          </>
        ) : (
          <>
            {data.staff ? (
              <Text style={styles.value}>Staff: {data.staff}</Text>
            ) : null}
            {data.eventName ? (
              <Text style={styles.value}>Event: {data.eventName}</Text>
            ) : null}
            {data.language ? (
              <Text style={styles.value}>
                Language: {data.language.toUpperCase()}
              </Text>
            ) : null}
            {data.clothType ? (
              <Text style={styles.value}>Item: {data.clothType}</Text>
            ) : null}
            {data.notes ? <Text style={styles.value}>{data.notes}</Text> : null}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Photos</Text>
        <View style={styles.photoGrid}>
          {data.photos?.map((src, index) => (
            <ExpoImage
              key={index}
              source={{ uri: src }}
              style={styles.photo}
              contentFit="cover"
              accessibilityLabel={`Evidence photo ${index + 1}`}
            />
          ))}
        </View>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        style={styles.printButton}
        onPress={openPrint}
      >
        <Text style={styles.printText}>Open print view</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#070b14" },
  content: { padding: 20, paddingBottom: 120, gap: 20 },
  centered: {
    flex: 1,
    backgroundColor: "#070b14",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  heading: { fontSize: 26, fontWeight: "700", color: "#f8fafc" },
  subheading: { fontSize: 18, color: "#cbd5f5" },
  editHeader: { gap: 12 },
  headingInput: {
    fontSize: 26,
    fontWeight: "700",
    color: "#f8fafc",
    backgroundColor: "#101b2e",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  subheadingInput: {
    fontSize: 18,
    color: "#f8fafc",
    backgroundColor: "#101b2e",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  meta: { color: "#94a3b8", fontSize: 12 },
  loading: { color: "#94a3b8" },
  error: { color: "#f97316", fontSize: 15 },
  card: {
    backgroundColor: "#0d1627",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    padding: 16,
    gap: 8,
  },
  label: { color: "#f8fafc", fontWeight: "700", fontSize: 15 },
  value: { color: "#cbd5f5", fontSize: 14 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photo: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2b3f",
  },
  printButton: {
    backgroundColor: "#38bdf8",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  printText: { color: "#04101f", fontWeight: "700", fontSize: 16 },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  primaryButton: {
    backgroundColor: "#38bdf8",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  primaryButtonText: { color: "#04101f", fontWeight: "700", fontSize: 15 },
  outlineButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#38bdf8",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  outlineButtonText: { color: "#38bdf8", fontWeight: "600", fontSize: 15 },
  dangerButton: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#dc2626",
  },
  dangerButtonText: { color: "#f8fafc", fontWeight: "600", fontSize: 15 },
  input: {
    backgroundColor: "#101b2e",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f8fafc",
  },
  textArea: { height: 120, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: { color: "#f8fafc", fontWeight: "600" },
  languageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  languagePills: { flexDirection: "row", gap: 10 },
  languagePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  languagePillActive: {
    backgroundColor: "#38bdf8",
    borderColor: "#38bdf8",
  },
  languageText: { color: "#cbd5f5", fontWeight: "600" },
  languageTextActive: { color: "#04101f", fontWeight: "700" },
  metaNote: { color: "#94a3b8", fontSize: 12 },
});

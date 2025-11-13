import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useEvents } from "@/hooks/useEvents";
import { useCreateHandover } from "@/hooks/useHandovers";
import { getApiBaseUrl } from "@/lib/api";
import type { HandoverReport } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

const photoPrompts = [
  "Client ID document",
  "Client holding the ID",
  "Clothing item",
  "Distinctive mark / label",
];

export default function HandoverScreen() {
  const { user } = useAuth();
  const { data: events } = useEvents(!!user);
  const createMutation = useCreateHandover();
  const insets = useSafeAreaInsets();

  const [clothType, setClothType] = useState("");
  const [coatNumber, setCoatNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [email, setEmail] = useState("");
  const [staff, setStaff] = useState(user?.fullName ?? "");
  const [notes, setNotes] = useState("");
  const [language, setLanguage] = useState<"ro" | "en">("ro");
  const [eventId, setEventId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [lastCreatedHandoverId, setLastCreatedHandoverId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (user?.authorizedEventId) {
      setEventId(user.authorizedEventId);
    }
  }, [user?.authorizedEventId]);

  useEffect(() => {
    if (user?.fullName && !staff) {
      setStaff(user.fullName);
    }
  }, [staff, user?.fullName]);

  useEffect(() => {
    if (user?.type === "admin" && !eventId && events?.length === 1) {
      setEventId(events[0].id);
    }
  }, [eventId, events, user?.type]);

  const selectedEventName = useMemo(() => {
    if (!events || !eventId) return undefined;
    return events.find((ev) => ev.id === eventId)?.name;
  }, [eventId, events]);

  async function ensureCameraPermission() {
    const current = await ImagePicker.getCameraPermissionsAsync();
    if (current.granted) {
      return true;
    }
    if (!current.canAskAgain) {
      Alert.alert(
        "Camera permission needed",
        "Enable camera access for Cloackroom in your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open settings",
            onPress: () => {
              void Linking.openSettings();
            },
          },
        ]
      );
      return false;
    }
    const requested = await ImagePicker.requestCameraPermissionsAsync();
    if (requested.granted) {
      return true;
    }
    if (requested.canAskAgain) {
      Alert.alert(
        "Camera permission needed",
        "We still need camera access to capture photos."
      );
    } else {
      Alert.alert(
        "Camera permission needed",
        "Enable camera access for Cloackroom in your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open settings",
            onPress: () => {
              void Linking.openSettings();
            },
          },
        ]
      );
    }
    return false;
  }

  async function addPhoto(slotIndex?: number) {
    if (isRequestingCamera) return;
    setIsRequestingCamera(true);
    try {
      const granted = await ensureCameraPermission();
      if (!granted) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.base64) return;
      const dataUrl = `data:${asset.type || "image/jpeg"};base64,${
        asset.base64
      }`;
      console.log("Photo captured, data URL length:", dataUrl.length);
      setPhotos((prev) => {
        const copy = [...prev];
        if (slotIndex != null && slotIndex < copy.length) {
          copy[slotIndex] = dataUrl;
          console.log(`Updated photo at slot ${slotIndex}`);
          return copy;
        }
        if (slotIndex != null && slotIndex >= copy.length) {
          const next = [...copy];
          next[slotIndex] = dataUrl;
          console.log(`Added photo at new slot ${slotIndex}`);
          return next;
        }
        console.log(`Added photo at end, total: ${copy.length + 1}`);
        return [...copy, dataUrl];
      });
    } catch (error) {
      console.error("Failed to launch camera", error);
      Alert.alert(
        "Camera unavailable",
        "We couldn't open the camera. Check permissions and try again."
      );
    } finally {
      setIsRequestingCamera(false);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function openPrint(handoverId: string) {
    try {
      const url = `${getApiBaseUrl()}/private/handover/print/${encodeURIComponent(
        handoverId
      )}`;
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.warn("Failed to open print view", error);
      Alert.alert("Print Error", "Could not open the print view.");
    }
  }

  const canSubmit =
    coatNumber.trim().length > 0 &&
    fullName.trim().length > 0 &&
    photos.filter(Boolean).length >= 4 &&
    !createMutation.isPending;

  async function handleSubmit() {
    if (!canSubmit || !user) return;
    const now = Date.now();
    const id = `handover_${now}`;
    const payload: HandoverReport = {
      id,
      coatNumber: coatNumber.trim(),
      fullName: fullName.trim(),
      eventId:
        user.type === "staff" ? user.authorizedEventId : eventId || undefined,
      eventName: user.type === "admin" ? selectedEventName : undefined,
      phone: phone.trim() || undefined,
      phoneVerified: phone ? phoneVerified : undefined,
      phoneVerifiedAt: phone && phoneVerified ? now : undefined,
      phoneVerifiedBy:
        phone && phoneVerified ? staff.trim() || user.fullName : undefined,
      email: email.trim() || undefined,
      staff: staff.trim() || user.fullName,
      notes: notes.trim() || undefined,
      photos,
      createdAt: now,
      language,
      clothType: clothType.trim() || undefined,
    };
    try {
      await createMutation.mutateAsync(payload);
      setLastCreatedHandoverId(id);
      Alert.alert("Saved", "Handover stored successfully.", [
        {
          text: "Print",
          onPress: () => openPrint(id),
        },
        {
          text: "OK",
          style: "cancel",
        },
      ]);
      setClothType("");
      setCoatNumber("");
      setFullName("");
      setPhone("");
      setPhoneVerified(false);
      setEmail("");
      setStaff(user.fullName);
      setNotes("");
      setLanguage("ro");
      if (!user.authorizedEventId) setEventId(null);
      setPhotos([]);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Save failed", error.message);
      } else {
        Alert.alert("Save failed", "Something went wrong while saving.");
      }
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top }]}
    >
      <Text style={styles.heading}>New handover</Text>
      <Text style={styles.subtitle}>
        Fill in the client details, capture the required photos and save the
        report.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Event</Text>
        {user?.type === "staff" ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {selectedEventName || "Assigned event"}
            </Text>
          </View>
        ) : (
          <View style={styles.inlineField}>
            <TextInput
              placeholder="Select event"
              value={selectedEventName || ""}
              style={[styles.input, { flex: 1 }]}
              editable={false}
            />
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.selectorButton}
              onPress={() => {
                if (!events?.length) {
                  Alert.alert(
                    "No events",
                    "Create an event on the admin tab first."
                  );
                  return;
                }
                Alert.alert(
                  "Select event",
                  "Choose the active event for this handover.",
                  events.map((ev) => ({
                    text: ev.name,
                    onPress: () => setEventId(ev.id),
                  }))
                );
              }}
            >
              <Text style={styles.selectorButtonText}>Choose</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client details</Text>
        <TextInput
          placeholder="Type of cloth (e.g. Jacket)"
          placeholderTextColor="#64748b"
          style={styles.input}
          value={clothType}
          onChangeText={setClothType}
        />
        <TextInput
          placeholder="Coat number"
          placeholderTextColor="#64748b"
                          <ExpoImage
          value={coatNumber}
          onChangeText={setCoatNumber}
        />
        <TextInput
          placeholder="Full name"
          placeholderTextColor="#64748b"
          style={styles.input}
                            onError={() =>
                              console.log(`Photo ${index} failed to load`)
                            }
        <TextInput
          placeholder="Phone"
          placeholderTextColor="#64748b"
          style={styles.input}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={(value) => {
            setPhone(value);
            setPhoneVerified(false);
          }}
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Phone verified by call</Text>
          <Switch
            value={phoneVerified}
            onValueChange={(value) => {
              setPhoneVerified(value);
            }}
            disabled={!phone}
          />
        </View>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#64748b"
          style={styles.input}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Staff handling"
          placeholderTextColor="#64748b"
          style={styles.input}
          value={staff}
          onChangeText={setStaff}
          editable={user?.type === "admin"}
        />
        <TextInput
          placeholder="Notes (Marca, modelul, seria, culoarea...)"
          placeholderTextColor="#64748b"
          style={[styles.input, styles.multiline]}
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
        />
        <View style={styles.inlineField}>
          <Text style={styles.switchLabel}>Language</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.pill, language === "ro" && styles.pillActive]}
              onPress={() => setLanguage("ro")}
            >
              <Text
                style={
                  language === "ro" ? styles.pillTextActive : styles.pillText
                }
              >
                RO
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.pill, language === "en" && styles.pillActive]}
              onPress={() => setLanguage("en")}
            >
              <Text
                style={
                  language === "en" ? styles.pillTextActive : styles.pillText
                }
              >
                EN
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Evidence photos ({photos.length}/4)
        </Text>
        <Text style={styles.helper}>
          Capture at least four photos covering client ID, client holding the
          ID, the clothing item and a distinctive mark.
        </Text>
        <View style={styles.photoList}>
          {photoPrompts.map((label, index) => {
            const source = photos[index];
            return (
              <View key={label} style={styles.photoSlot}>
                {source ? (
                  <>
                    <Image
                      source={{ uri: source }}
                      style={styles.photoPreview}
                      contentFit="cover"
                      accessibilityLabel={`${label} evidence photo`}
                      onLoad={() =>
                        console.log(`Photo ${index} loaded successfully`)
                      }
                      onError={(error) =>
                        console.log(`Photo ${index} failed to load:`, error)
                      }
                      placeholder={{
                        uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                      }}
                    />
                    <View style={styles.photoActions}>
                      <TouchableOpacity
                        style={styles.photoButton}
                        onPress={() => addPhoto(index)}
                      >
                        <Text style={styles.photoButtonText}>Retake</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.photoButton}
                        onPress={() => removePhoto(index)}
                      >
                        <Text style={styles.photoButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.emptySlot}
                    onPress={() => addPhoto(index)}
                  >
                    <Text style={styles.slotLabel}>{label}</Text>
                    <Text style={styles.slotHint}>Tap to capture</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
        {photos.length > photoPrompts.length ? (
          <View style={styles.extraContainer}>
            <Text style={styles.extraTitle}>Additional evidence</Text>
            <View style={styles.extraGrid}>
              {photos.slice(photoPrompts.length).map((uri, index) => (
                <View key={index} style={styles.extraItem}>
                    <ExpoImage
                    source={{ uri }}
                    style={styles.extraPreview}
                    contentFit="cover"
                    accessibilityLabel={`Additional evidence photo ${
                      index + 1
                    }`}
                  />
                  <TouchableOpacity
                    style={styles.extraRemove}
                    onPress={() => removePhoto(photoPrompts.length + index)}
                  >
                    <Text style={styles.photoButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.addPhotoButton}
          onPress={() => addPhoto()}
        >
          <Text style={styles.addPhotoText}>Capture extra photo</Text>
        </TouchableOpacity>
        {isRequestingCamera ? (
          <View style={styles.cameraOverlay}>
            <ActivityIndicator color="#38bdf8" />
            <Text style={styles.cameraText}>Opening camera…</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
      >
        {createMutation.isPending ? (
          <ActivityIndicator color="#04101f" />
        ) : (
          <Text style={styles.submitText}>Save handover</Text>
        )}
      </TouchableOpacity>

      {lastCreatedHandoverId ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => openPrint(lastCreatedHandoverId)}
          style={styles.printButton}
        >
          <Text style={styles.printText}>Print Last Handover</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#070b14" },
  content: { padding: 16, paddingBottom: 120, gap: 24 },
  heading: { fontSize: 26, fontWeight: "700", color: "#f8fafc" },
  subtitle: { color: "#cbd5f5", fontSize: 14 },
  section: {
    backgroundColor: "#0d1627",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    padding: 18,
    gap: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#f8fafc" },
  helper: { color: "#94a3b8", fontSize: 13 },
  input: {
    backgroundColor: "#101b2e",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    color: "#f8fafc",
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: { color: "#e2e8f0", fontSize: 14, fontWeight: "600" },
  inlineField: { flexDirection: "row", alignItems: "center", gap: 12 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#11203a",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1f2b3f",
  },
  badgeText: { color: "#f8fafc", fontWeight: "600" },
  selectorButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    backgroundColor: "#101b2e",
  },
  selectorButtonText: { color: "#38bdf8", fontWeight: "700" },
  pillRow: { flexDirection: "row", gap: 10 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    backgroundColor: "#101b2e",
  },
  pillActive: { backgroundColor: "#38bdf8", borderColor: "#38bdf8" },
  pillText: { color: "#e2e8f0", fontWeight: "600" },
  pillTextActive: { color: "#04101f", fontWeight: "700" },
  photoList: { gap: 14 },
  photoSlot: {
    borderWidth: 1,
    borderColor: "#1f2b3f",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#101b2e",
  },
  emptySlot: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  slotLabel: { color: "#f8fafc", fontWeight: "600", textAlign: "center" },
  slotHint: { color: "#94a3b8", fontSize: 12 },
  photoPreview: { width: "100%", height: 220 },
  photoActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#0b1424",
    borderTopWidth: 1,
    borderTopColor: "#172134",
  },
  photoButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    backgroundColor: "#101b2e",
  },
  photoButtonText: { color: "#38bdf8", fontWeight: "600" },
  extraContainer: { marginTop: 10, gap: 10 },
  extraTitle: { color: "#f8fafc", fontWeight: "600" },
  extraGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  extraItem: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1f2b3f",
  },
  extraPreview: { width: "100%", height: "75%" },
  extraRemove: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101b2e",
  },
  addPhotoButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    backgroundColor: "#101b2e",
  },
  addPhotoText: { color: "#38bdf8", fontWeight: "600" },
  cameraOverlay: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cameraText: { color: "#94a3b8" },
  submitButton: {
    backgroundColor: "#38bdf8",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#04101f", fontWeight: "700", fontSize: 16 },
  printButton: {
    backgroundColor: "#16a34a",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  printText: { color: "#ffffff", fontWeight: "600", fontSize: 15 },
});

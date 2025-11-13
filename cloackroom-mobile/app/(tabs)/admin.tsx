import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useAdminList,
  useCreateAdminUser,
  useCreateStaff,
  useDeleteAdminUser,
  useDeleteStaff,
  useStaffList,
  useUpdateAdminUser,
  useUpdateStaff,
} from "@/hooks/useAdmin";
import {
  useCreateEvent,
  useDeleteEvent,
  useEvents,
  useUpdateEvent,
} from "@/hooks/useEvents";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

type EventFormState = {
  visible: boolean;
  mode: "create" | "edit";
  id?: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

type StaffFormState = {
  visible: boolean;
  mode: "create" | "edit";
  id?: string;
  fullName: string;
  email: string;
  password: string;
  isAuthorized: boolean;
  authorizedEventId?: string | null;
};

type AdminFormState = {
  visible: boolean;
  mode: "create" | "edit";
  id?: string;
  fullName: string;
  email: string;
  password: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function formatTimestamp(value: number) {
  return new Date(value).toLocaleString();
}

export default function AdminScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const eventsQuery = useEvents(!!user && user.type === "admin");
  const staffQuery = useStaffList(!!user && user.type === "admin");
  const adminsQuery = useAdminList(!!user && user.type === "admin");

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();

  const createAdmin = useCreateAdminUser();
  const updateAdmin = useUpdateAdminUser();
  const deleteAdmin = useDeleteAdminUser();

  const [eventForm, setEventForm] = useState<EventFormState | null>(null);
  const [staffForm, setStaffForm] = useState<StaffFormState | null>(null);
  const [adminForm, setAdminForm] = useState<AdminFormState | null>(null);

  const isAdmin = user?.type === "admin";

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);
  const admins = useMemo(() => adminsQuery.data ?? [], [adminsQuery.data]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.startsAt - b.startsAt),
    [events]
  );
  const sortedStaff = useMemo(
    () => [...staff].sort((a, b) => b.createdAt - a.createdAt),
    [staff]
  );
  const sortedAdmins = useMemo(
    () => [...admins].sort((a, b) => b.createdAt - a.createdAt),
    [admins]
  );

  const eventNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const ev of events) map.set(ev.id, ev.name);
    return map;
  }, [events]);

  const openCreateEvent = () => {
    const now = Date.now();
    setEventForm({
      visible: true,
      mode: "create",
      name: "",
      startsAt: new Date(now).toISOString(),
      endsAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    });
  };

  const openEditEvent = (event: (typeof events)[number]) => {
    setEventForm({
      visible: true,
      mode: "edit",
      id: event.id,
      name: event.name,
      startsAt: new Date(event.startsAt).toISOString(),
      endsAt: new Date(event.endsAt).toISOString(),
    });
  };

  const openCreateStaff = () => {
    setStaffForm({
      visible: true,
      mode: "create",
      fullName: "",
      email: "",
      password: "",
      isAuthorized: true,
      authorizedEventId: null,
    });
  };

  const openEditStaff = (staffMember: (typeof staff)[number]) => {
    setStaffForm({
      visible: true,
      mode: "edit",
      id: staffMember.id,
      fullName: staffMember.fullName,
      email: staffMember.email,
      password: "",
      isAuthorized: staffMember.isAuthorized !== false,
      authorizedEventId: staffMember.authorizedEventId ?? null,
    });
  };

  const openCreateAdmin = () => {
    setAdminForm({
      visible: true,
      mode: "create",
      fullName: "",
      email: "",
      password: "",
    });
  };

  const openEditAdmin = (adminUser: (typeof admins)[number]) => {
    setAdminForm({
      visible: true,
      mode: "edit",
      id: adminUser.id,
      fullName: adminUser.fullName,
      email: adminUser.email,
      password: "",
    });
  };

  const closeEventForm = () => setEventForm(null);
  const closeStaffForm = () => setStaffForm(null);
  const closeAdminForm = () => setAdminForm(null);

  const handleEventSubmit = async () => {
    if (!eventForm) return;
    const name = eventForm.name.trim();
    if (!name) {
      Alert.alert("Missing name", "Event name is required.");
      return;
    }
    const startsAt = Date.parse(eventForm.startsAt);
    const endsAt = Date.parse(eventForm.endsAt);
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
      Alert.alert("Invalid dates", "Provide valid ISO date-times.");
      return;
    }
    if (endsAt < startsAt) {
      Alert.alert("Invalid range", "End time must be after start time.");
      return;
    }
    try {
      if (eventForm.mode === "create") {
        await createEvent.mutateAsync({ name, startsAt, endsAt });
        Alert.alert("Event created", "The event was saved successfully.");
      } else if (eventForm.id) {
        await updateEvent.mutateAsync({
          id: eventForm.id,
          name,
          startsAt,
          endsAt,
        });
        Alert.alert("Event updated", "Changes saved successfully.");
      }
      closeEventForm();
    } catch (error) {
      Alert.alert(
        "Save failed",
        getErrorMessage(error, "Could not save the event.")
      );
    }
  };

  const handleStaffSubmit = async () => {
    if (!staffForm) return;
    const fullName = staffForm.fullName.trim();
    const email = staffForm.email.trim().toLowerCase();
    if (!fullName || !email) {
      Alert.alert("Missing details", "Full name and email are required.");
      return;
    }
    const payload = {
      fullName,
      email,
      isAuthorized: staffForm.isAuthorized,
      authorizedEventId: staffForm.authorizedEventId ?? null,
    };
    try {
      if (staffForm.mode === "create") {
        if (!staffForm.password.trim()) {
          Alert.alert("Missing password", "Password is required.");
          return;
        }
        await createStaff.mutateAsync({
          ...payload,
          password: staffForm.password,
        });
        Alert.alert("Staff created", "Staff account saved successfully.");
      } else if (staffForm.id) {
        await updateStaff.mutateAsync({
          id: staffForm.id,
          ...payload,
          password: staffForm.password.trim() || undefined,
        });
        Alert.alert("Staff updated", "Changes saved successfully.");
      }
      closeStaffForm();
    } catch (error) {
      Alert.alert(
        "Save failed",
        getErrorMessage(error, "Could not save the staff member.")
      );
    }
  };

  const handleAdminSubmit = async () => {
    if (!adminForm) return;
    const fullName = adminForm.fullName.trim();
    const email = adminForm.email.trim().toLowerCase();
    if (!fullName || !email) {
      Alert.alert("Missing details", "Full name and email are required.");
      return;
    }
    try {
      if (adminForm.mode === "create") {
        if (!adminForm.password.trim()) {
          Alert.alert("Missing password", "Password is required.");
          return;
        }
        await createAdmin.mutateAsync({
          fullName,
          email,
          password: adminForm.password,
        });
        Alert.alert("Admin created", "Admin account saved successfully.");
      } else if (adminForm.id) {
        await updateAdmin.mutateAsync({
          id: adminForm.id,
          fullName,
          email,
          password: adminForm.password.trim() || undefined,
        });
        Alert.alert("Admin updated", "Changes saved successfully.");
      }
      closeAdminForm();
    } catch (error) {
      Alert.alert(
        "Save failed",
        getErrorMessage(error, "Could not save the admin account.")
      );
    }
  };

  const confirmDeleteEvent = (id: string) => {
    Alert.alert("Delete event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteEvent
            .mutateAsync(id)
            .then(() => Alert.alert("Event deleted", "The event was removed."))
            .catch((error) =>
              Alert.alert(
                "Delete failed",
                getErrorMessage(error, "Could not delete the event.")
              )
            );
        },
      },
    ]);
  };

  const confirmDeleteStaff = (id: string) => {
    Alert.alert("Delete staff", "Delete this staff account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteStaff
            .mutateAsync(id)
            .then(() =>
              Alert.alert("Staff deleted", "The staff member was removed.")
            )
            .catch((error) =>
              Alert.alert(
                "Delete failed",
                getErrorMessage(error, "Could not delete the staff member.")
              )
            );
        },
      },
    ]);
  };

  const confirmDeleteAdmin = (id: string) => {
    Alert.alert("Delete admin", "Delete this admin account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteAdmin
            .mutateAsync(id)
            .then(() =>
              Alert.alert("Admin deleted", "The admin account was removed.")
            )
            .catch((error) =>
              Alert.alert(
                "Delete failed",
                getErrorMessage(error, "Could not delete the admin account.")
              )
            );
        },
      },
    ]);
  };

  const toggleStaffAuthorization = (id: string, current: boolean) => {
    void updateStaff
      .mutateAsync({ id, isAuthorized: !current })
      .then(() =>
        Alert.alert(
          "Staff updated",
          !current ? "Staff enabled." : "Staff disabled."
        )
      )
      .catch((error) =>
        Alert.alert(
          "Update failed",
          getErrorMessage(error, "Could not update staff access.")
        )
      );
  };

  const assignEventToStaff = () => {
    if (!staffForm) return;
    if (sortedEvents.length === 0) {
      Alert.alert("No events", "Create an event first.");
      return;
    }
    Alert.alert("Assign event", "Choose the event to authorize", [
      ...sortedEvents.map((ev) => ({
        text: ev.name,
        onPress: () =>
          setStaffForm((prev) =>
            prev
              ? {
                  ...prev,
                  authorizedEventId: ev.id,
                }
              : prev
          ),
      })),
      {
        text: "Clear assignment",
        onPress: () =>
          setStaffForm((prev) =>
            prev ? { ...prev, authorizedEventId: null } : prev
          ),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  if (!isAdmin) {
    return (
      <View style={styles.restricted}>
        <Text style={styles.restrictedTitle}>Admins only</Text>
        <Text style={styles.restrictedSubtitle}>
          Contact an administrator if you believe you should have access.
        </Text>
      </View>
    );
  }

  const renderEventModal = () =>
    eventForm ? (
      <Modal
        visible={eventForm.visible}
        animationType="slide"
        transparent
        onRequestClose={closeEventForm}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {eventForm.mode === "create" ? "New event" : "Edit event"}
            </Text>
            <TextInput
              placeholder="Event name"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={eventForm.name}
              onChangeText={(value) =>
                setEventForm((prev) => (prev ? { ...prev, name: value } : prev))
              }
            />
            <TextInput
              placeholder="Starts at (ISO)"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={eventForm.startsAt}
              onChangeText={(value) =>
                setEventForm((prev) =>
                  prev ? { ...prev, startsAt: value } : prev
                )
              }
            />
            <TextInput
              placeholder="Ends at (ISO)"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={eventForm.endsAt}
              onChangeText={(value) =>
                setEventForm((prev) =>
                  prev ? { ...prev, endsAt: value } : prev
                )
              }
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={closeEventForm}
                disabled={createEvent.isPending || updateEvent.isPending}
              >
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleEventSubmit}
                disabled={createEvent.isPending || updateEvent.isPending}
              >
                {createEvent.isPending || updateEvent.isPending ? (
                  <ActivityIndicator color="#04101f" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    ) : null;

  const renderStaffModal = () =>
    staffForm ? (
      <Modal
        visible={staffForm.visible}
        animationType="slide"
        transparent
        onRequestClose={closeStaffForm}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {staffForm.mode === "create" ? "New staff" : "Edit staff"}
            </Text>
            <TextInput
              placeholder="Full name"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={staffForm.fullName}
              onChangeText={(value) =>
                setStaffForm((prev) =>
                  prev ? { ...prev, fullName: value } : prev
                )
              }
            />
            <TextInput
              placeholder="Email"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              value={staffForm.email}
              onChangeText={(value) =>
                setStaffForm((prev) =>
                  prev ? { ...prev, email: value } : prev
                )
              }
            />
            <TextInput
              placeholder={
                staffForm.mode === "edit"
                  ? "New password (optional)"
                  : "Password"
              }
              placeholderTextColor="#64748b"
              secureTextEntry
              style={styles.input}
              value={staffForm.password}
              onChangeText={(value) =>
                setStaffForm((prev) =>
                  prev ? { ...prev, password: value } : prev
                )
              }
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Authorized</Text>
              <Switch
                value={staffForm.isAuthorized}
                onValueChange={(value) =>
                  setStaffForm((prev) =>
                    prev ? { ...prev, isAuthorized: value } : prev
                  )
                }
              />
            </View>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={assignEventToStaff}
            >
              <Text style={styles.selectorLabel}>Assigned event</Text>
              <Text style={styles.selectorValue}>
                {staffForm.authorizedEventId
                  ? eventNameById.get(staffForm.authorizedEventId) ??
                    staffForm.authorizedEventId
                  : "No event"}
              </Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={closeStaffForm}
                disabled={createStaff.isPending || updateStaff.isPending}
              >
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleStaffSubmit}
                disabled={createStaff.isPending || updateStaff.isPending}
              >
                {createStaff.isPending || updateStaff.isPending ? (
                  <ActivityIndicator color="#04101f" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    ) : null;

  const renderAdminModal = () =>
    adminForm ? (
      <Modal
        visible={adminForm.visible}
        animationType="slide"
        transparent
        onRequestClose={closeAdminForm}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {adminForm.mode === "create" ? "New admin" : "Edit admin"}
            </Text>
            <TextInput
              placeholder="Full name"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={adminForm.fullName}
              onChangeText={(value) =>
                setAdminForm((prev) =>
                  prev ? { ...prev, fullName: value } : prev
                )
              }
            />
            <TextInput
              placeholder="Email"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              value={adminForm.email}
              onChangeText={(value) =>
                setAdminForm((prev) =>
                  prev ? { ...prev, email: value } : prev
                )
              }
            />
            <TextInput
              placeholder={
                adminForm.mode === "edit"
                  ? "New password (optional)"
                  : "Password"
              }
              placeholderTextColor="#64748b"
              secureTextEntry
              style={styles.input}
              value={adminForm.password}
              onChangeText={(value) =>
                setAdminForm((prev) =>
                  prev ? { ...prev, password: value } : prev
                )
              }
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={closeAdminForm}
                disabled={createAdmin.isPending || updateAdmin.isPending}
              >
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAdminSubmit}
                disabled={createAdmin.isPending || updateAdmin.isPending}
              >
                {createAdmin.isPending || updateAdmin.isPending ? (
                  <ActivityIndicator color="#04101f" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    ) : null;

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingTop: styles.content.paddingTop + insets.top },
        ]}
      >
        <Text style={styles.heading}>Admin overview</Text>
        <Text style={styles.subtitle}>
          Manage events, staff access and admin accounts.
        </Text>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Events</Text>
            <View style={styles.sectionActions}>
              {eventsQuery.isLoading || createEvent.isPending ? (
                <ActivityIndicator color="#38bdf8" />
              ) : null}
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={openCreateEvent}
              >
                <Text style={styles.outlineButtonText}>New event</Text>
              </TouchableOpacity>
            </View>
          </View>
          {sortedEvents.length === 0 ? (
            <Text style={styles.empty}>No events found.</Text>
          ) : (
            <View style={styles.stack}>
              {sortedEvents.map((item) => {
                const now = Date.now();
                const isActive = now >= item.startsAt && now <= item.endsAt;
                return (
                  <View key={item.id} style={styles.entityCard}>
                    <View style={styles.entityHeader}>
                      <Text style={styles.rowTitle}>{item.name}</Text>
                      {isActive ? (
                        <Text
                          style={[styles.statusPill, styles.statusPillActive]}
                        >
                          Active
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.rowMeta}>
                      {formatTimestamp(item.startsAt)} –{" "}
                      {formatTimestamp(item.endsAt)}
                    </Text>
                    <View style={styles.entityActions}>
                      <TouchableOpacity
                        style={styles.outlineButton}
                        onPress={() => openEditEvent(item)}
                      >
                        <Text style={styles.outlineButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={() => confirmDeleteEvent(item.id)}
                      >
                        <Text style={styles.dangerButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Staff</Text>
            <View style={styles.sectionActions}>
              {staffQuery.isLoading || updateStaff.isPending ? (
                <ActivityIndicator color="#38bdf8" />
              ) : null}
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={openCreateStaff}
              >
                <Text style={styles.outlineButtonText}>Invite staff</Text>
              </TouchableOpacity>
            </View>
          </View>
          {sortedStaff.length === 0 ? (
            <Text style={styles.empty}>No staff accounts found.</Text>
          ) : (
            <View style={styles.stack}>
              {sortedStaff.map((item) => {
                const active = item.isAuthorized !== false;
                const eventLabel = item.authorizedEventId
                  ? eventNameById.get(item.authorizedEventId) ??
                    item.authorizedEventId
                  : null;
                return (
                  <View key={item.id} style={styles.entityCard}>
                    <View style={styles.entityHeader}>
                      <Text style={styles.rowTitle}>{item.fullName}</Text>
                      <Text
                        style={[
                          styles.statusPill,
                          active
                            ? styles.statusPillActive
                            : styles.statusPillPending,
                        ]}
                      >
                        {active ? "Authorized" : "Disabled"}
                      </Text>
                    </View>
                    <Text style={styles.rowMeta}>{item.email}</Text>
                    <Text style={styles.rowMeta}>
                      Created {formatTimestamp(item.createdAt)}
                    </Text>
                    {eventLabel ? (
                      <Text style={styles.rowMeta}>Event: {eventLabel}</Text>
                    ) : (
                      <Text style={styles.rowMeta}>No event assigned</Text>
                    )}
                    <View style={styles.entityActions}>
                      <TouchableOpacity
                        style={styles.outlineButton}
                        onPress={() =>
                          toggleStaffAuthorization(item.id, active)
                        }
                      >
                        <Text style={styles.outlineButtonText}>
                          {active ? "Disable" : "Enable"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.outlineButton}
                        onPress={() => openEditStaff(item)}
                      >
                        <Text style={styles.outlineButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={() => confirmDeleteStaff(item.id)}
                      >
                        <Text style={styles.dangerButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Admins</Text>
            <View style={styles.sectionActions}>
              {adminsQuery.isLoading || updateAdmin.isPending ? (
                <ActivityIndicator color="#38bdf8" />
              ) : null}
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={openCreateAdmin}
              >
                <Text style={styles.outlineButtonText}>New admin</Text>
              </TouchableOpacity>
            </View>
          </View>
          {sortedAdmins.length === 0 ? (
            <Text style={styles.empty}>No admin accounts found.</Text>
          ) : (
            <View style={styles.stack}>
              {sortedAdmins.map((item) => (
                <View key={item.id} style={styles.entityCard}>
                  <Text style={styles.rowTitle}>{item.fullName}</Text>
                  <Text style={styles.rowMeta}>{item.email}</Text>
                  <Text style={styles.rowMeta}>
                    Created {formatTimestamp(item.createdAt)}
                  </Text>
                  <View style={styles.entityActions}>
                    <TouchableOpacity
                      style={styles.outlineButton}
                      onPress={() => openEditAdmin(item)}
                    >
                      <Text style={styles.outlineButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dangerButton}
                      onPress={() => confirmDeleteAdmin(item.id)}
                    >
                      <Text style={styles.dangerButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      {renderEventModal()}
      {renderStaffModal()}
      {renderAdminModal()}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#070b14" },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 120,
    gap: 20,
  },
  heading: { fontSize: 24, fontWeight: "700", color: "#f8fafc" },
  subtitle: { color: "#cbd5f5", fontSize: 14 },
  section: {
    backgroundColor: "#0d1627",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    padding: 16,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle: { color: "#f8fafc", fontSize: 18, fontWeight: "700" },
  empty: { color: "#94a3b8", fontSize: 14 },
  stack: { gap: 12 },
  entityCard: {
    backgroundColor: "#101b2e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    padding: 16,
    gap: 10,
  },
  entityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  entityActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  rowTitle: { color: "#f8fafc", fontWeight: "700", fontSize: 16 },
  rowMeta: { color: "#94a3b8", fontSize: 13 },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "600",
  },
  statusPillActive: {
    backgroundColor: "#22c55e33",
    color: "#4ade80",
  },
  statusPillPending: {
    backgroundColor: "#f9731633",
    color: "#fbbf24",
  },
  outlineButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#38bdf8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  outlineButtonText: {
    color: "#38bdf8",
    fontWeight: "600",
  },
  primaryButton: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#38bdf8",
  },
  primaryButtonText: {
    color: "#04101f",
    fontWeight: "700",
  },
  dangerButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#dc2626",
  },
  dangerButtonText: {
    color: "#f8fafc",
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(7,11,20,0.85)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#0d1627",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    padding: 20,
    gap: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#f8fafc" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  input: {
    backgroundColor: "#101b2e",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f8fafc",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: { color: "#f8fafc", fontWeight: "600" },
  selectorButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2b3f",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#101b2e",
  },
  selectorLabel: { color: "#94a3b8", fontSize: 12 },
  selectorValue: { color: "#f8fafc", fontWeight: "600", marginTop: 4 },
  restricted: {
    flex: 1,
    backgroundColor: "#070b14",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  restrictedTitle: { fontSize: 22, fontWeight: "700", color: "#f8fafc" },
  restrictedSubtitle: { textAlign: "center", color: "#94a3b8" },
});

"use client";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/app/private/toast/ToastContext";
import Image from "next/image";
import type { HandoverReport } from "@/app/models/handover";
import type { Event } from "@/app/models/event";
import { isEventActive } from "@/app/models/event";

type TemplateInput = {
  coatNumber: string;
  fullName: string;
  phone?: string;
  email?: string;
  staff?: string;
  notes?: string;
  createdAt?: number;
};

function buildDeclarationRO(t: TemplateInput) {
  const descriere = t.notes?.trim()
    ? t.notes.trim()
    : "[Marca, modelul, seria, culoarea, starea etc.]";
  const staffText = (t.staff && t.staff.trim()) || "(staff member)";
  const lines = [
    "Declarație pe propria răspundere",
    `Subsemnatul(a) ${t.fullName}, cunoscând prevederile Codului penal în materia falsului, uzului de fals și a înșelăciunii, revendic pe propria răspundere bunul aferent tichetului nr. ${t.coatNumber} cu următoarele caracteristici: ${descriere}, fără prezentarea tichetului primit la predare, întrucât declar că l-am pierdut.`,
    "Sunt de acord cu fotografierea actului meu de identitate, a mea și a bunului revendicat pe propria răspundere și sunt de acord cu prelucrarea și păstrarea datelor mele personale pe o perioadă de 3 ani de la data de azi.",
    "Predarea se face strict pe răspunderea mea și în baza declarațiilor mele.",
    `Aceasta este declarația pe care o dau, o semnez și o susțin în fața domnului ${staffText}, reprezentant al Zebra Music Production s.r.l..`,
    `Data: ${new Date(t.createdAt ?? Date.now()).toLocaleString()}`,
  ];
  return lines.join("\n\n");
}

function buildDeclarationEN(t: TemplateInput) {
  const descriere = t.notes?.trim()
    ? t.notes.trim()
    : "[Brand, model, serial, color, condition, etc.]";
  const staffText = (t.staff && t.staff.trim()) || "(staff member)";
  const lines = [
    "Self-Declaration",
    `I, ${t.fullName}, being aware of the provisions of the Criminal Code regarding forgery, use of forgery and fraud, claim, on my own responsibility, the item corresponding to ticket no. ${t.coatNumber}, with the following characteristics: ${descriere}, without presenting the ticket received at deposit, as I declare I have lost it.`,
    "I agree to the photographing of my identity document, myself, and the claimed item on my own responsibility, and I agree to the processing and storage of my personal data for a period of 3 years from today.",
    "The handover is made strictly under my responsibility and based on my statements.",
    `This is the statement that I make, sign, and uphold in the presence of Mr. ${staffText}, representative of Zebra Music Production S.R.L.`,
    `Date: ${new Date(t.createdAt ?? Date.now()).toLocaleString()}`,
  ];
  return lines.join("\n\n");
}

export default function HandoverClient() {
  const { push } = useToast();
  const [coatNumber, setCoatNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [staff, setStaff] = useState("");
  const [notes, setNotes] = useState("");
  const [language, setLanguage] = useState<"ro" | "en">("ro");
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const coatRef = useRef<HTMLInputElement>(null);
  const [me, setMe] = useState<{ fullName: string; type?: string } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(
    undefined
  );
  // Guard against overlapping camera start attempts (prevents AbortError on play)
  const startingCameraRef = useRef(false);
  const expectedPhotoDetails: { label: string; tips: string[] }[] = [
    {
      label: "Client ID document",
      tips: [
        "Entire ID visible (all 4 edges)",
        "Readable name & number (avoid glare)",
        "No fingers covering key data",
      ],
    },
    {
      label: "Client holding the ID",
      tips: [
        "Client face + ID in frame",
        "ID text roughly readable",
        "Neutral lighting, no sunglasses",
      ],
    },
    {
      label: "Clothing item",
      tips: [
        "Full item laid out or held",
        "Show color & general condition",
        "Avoid background clutter",
      ],
    },
    {
      label: "Distinctive mark / label",
      tips: [
        "Close-up, sharply focused",
        "Show unique feature (label, tear, pattern)",
        "Fill most of the frame with the mark",
      ],
    },
  ];
  const [activePhotoSlot, setActivePhotoSlot] = useState<number | null>(null);

  // Phone verification reset when number changes
  useEffect(() => {
    setPhoneVerified(false);
    setPhoneVerifiedAt(null);
    setCallPhase("idle");
    setCallStartedAt(null);
  }, [phone]);

  // Call verification state machine
  const [callPhase, setCallPhase] = useState<
    "idle" | "dialing" | "ready-confirm"
  >("idle");
  const callPhaseRef = useRef(callPhase);
  useEffect(() => {
    callPhaseRef.current = callPhase;
  }, [callPhase]);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const wasHiddenDuringDial = useRef(false);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (callPhase === "dialing") wasHiddenDuringDial.current = true;
        return;
      }
      if (
        callPhaseRef.current === "dialing" &&
        wasHiddenDuringDial.current &&
        callStartedAt &&
        Date.now() - callStartedAt > 1200
      ) {
        setCallPhase("ready-confirm");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [callPhase, callStartedAt]);

  function stopCamera() {
    videoRef.current?.pause();
    stream?.getTracks().forEach((tr) => tr.stop());
    setStream(null);
    setCameraOpen(false);
  }
  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter((d) => d.kind === "videoinput");
      setVideoDevices(videos);
      if (
        videos.length &&
        !videos.find((d) => d.deviceId === selectedDeviceId)
      ) {
        setSelectedDeviceId(videos[0]?.deviceId);
      }
    } catch (e) {
      console.error(e);
    }
  }
  async function startCamera() {
    if (startingCameraRef.current) return;
    startingCameraRef.current = true;
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : { facingMode: "environment" },
        audio: false,
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      // Stop prior stream tracks before replacing
      stream?.getTracks().forEach((tr) => tr.stop());
      setStream(s);
      if (videoRef.current) {
        const el = videoRef.current as HTMLVideoElement & { srcObject?: MediaStream };
        try {
          if ("srcObject" in el) {
            // Clear first to reduce play() AbortError risk
            el.srcObject = null as unknown as MediaStream;
            el.srcObject = s;
          } else {
            // @ts-expect-error legacy fallback
            el.src = "";
            // @ts-expect-error legacy fallback
            el.src = URL.createObjectURL(s);
          }
          const playResult = el.play();
          if (playResult instanceof Promise) {
            await playResult.catch((err) => {
              if ((err as DOMException)?.name !== "AbortError") {
                console.error(err);
                setCameraError(
                  "Could not start video playback. Tap the video or check browser permissions."
                );
              }
            });
          }
        } catch (e) {
          if ((e as DOMException)?.name !== "AbortError") console.error(e);
          setCameraError(
            "Could not start video playback. Tap the video or check browser permissions."
          );
        }
      }
      setCameraOpen(true);
      await refreshDevices();
    } catch (e) {
      console.error(e);
      const err = e as { name?: string } | null;
      const msg =
        err?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser."
          : err?.name === "NotFoundError"
          ? "No camera found on this device."
          : "Failed to access the camera. Please check permissions and try again.";
      setCameraError(msg);
    } finally {
      startingCameraRef.current = false;
    }
  }

  // Initial load
  useEffect(() => {
    coatRef.current?.focus();
    void refreshDevices();
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.user?.fullName) setStaff((s) => s || j.user.fullName);
        setMe(j.user || null);
      })
      .catch(() => {});
    const handler = () => void refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    const autoTimer = setTimeout(() => {
      if (!cameraOpen) void startCamera();
    }, 250);
    return () => {
      clearTimeout(autoTimer);
      navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
    };
  }, []);

  // Events polling
  useEffect(() => {
    let cancelled = false;
    async function loadEvents() {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        const json = (await res.json()) as { items?: Event[] };
        if (!cancelled && Array.isArray(json.items)) {
          const all = json.items;
          all.sort((a, b) => a.startsAt - b.startsAt);
          setEvents(all);
          const now = Date.now();
          const actives = all.filter((e) => isEventActive(e, now));
          setActiveEvents(actives);
          if (actives.length === 1) {
            setSelectedEventId(actives[0].id);
          } else if (actives.length > 1) {
            setSelectedEventId((prev) =>
              prev && actives.some((e) => e.id === prev) ? prev : null
            );
          } else {
            setSelectedEventId(null);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    void loadEvents();
    const interval = setInterval(loadEvents, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Re-start camera when device changes
  useEffect(() => {
    if (cameraOpen) void startCamera();
  }, [selectedDeviceId, cameraOpen, startCamera]);

  async function submit() {
    if (!coatNumber.trim() || !fullName.trim()) return;
    if (photos.length < 4) return;
    if (phone.trim() && !phoneVerified) return;
    setSubmitting(true);
    try {
      const id = `handover_${Date.now()}`;
      const payload: HandoverReport = {
        id,
        coatNumber: coatNumber.trim(),
        fullName: fullName.trim(),
        eventId: selectedEventId || undefined,
        eventName: selectedEventId
          ? events.find((e) => e.id === selectedEventId)?.name
          : undefined,
        phone: phone.trim() || undefined,
        phoneVerified: phone.trim() ? phoneVerified : undefined,
        phoneVerifiedAt: phoneVerifiedAt || undefined,
        phoneVerifiedBy: phoneVerified
          ? staff.trim() || me?.fullName || undefined
          : undefined,
        email: email.trim() || undefined,
        staff: staff.trim() || undefined,
        notes: notes.trim() || undefined,
        photos,
        createdAt: Date.now(),
        language,
      };
      await fetch(`/api/handover`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      setCoatNumber("");
      setFullName("");
      setPhone("");
      setPhoneVerified(false);
      setPhoneVerifiedAt(null);
      setEmail("");
      setStaff("");
      setNotes("");
      setPhotos([]);
      try {
        sessionStorage.setItem(`handover:${id}`, JSON.stringify(payload));
      } catch {}
      window.open(
        `/private/handover/print/${encodeURIComponent(id)}?lang=${language}`,
        "_blank",
        "noopener,noreferrer"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div className="lg:max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground lg:text-center">
          Handover/Reception report
        </h1>
        <p className="mt-2 text-sm text-muted-foreground lg:text-center">
          Create a report for clients who lost their ticket, using the coat
          number.
        </p>
      </div>

      <div className="mt-6 flex justify-center">
        <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-4">
          {/* Event selection / status */}
          <div className="mb-4 flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-foreground">Event</span>
              {activeEvents.length === 0 ? (
                <span className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                  No active event
                </span>
              ) : activeEvents.length === 1 ? (
                <span className="text-xs rounded-full bg-accent text-accent-foreground px-2 py-0.5">
                  {activeEvents[0].name}
                </span>
              ) : (
                <select
                  value={selectedEventId || ""}
                  onChange={(e) => setSelectedEventId(e.target.value || null)}
                  className="text-xs rounded-full border border-border bg-background px-2 py-1"
                >
                  <option value="">Select event…</option>
                  {activeEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {selectedEventId && (
              <div className="text-[10px] text-muted-foreground">
                Tagged to event – will appear on print.
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Coat number
              </label>
              <input
                ref={coatRef}
                value={coatNumber}
                onChange={(e) => setCoatNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. 127"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Full name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                placeholder="Jane Doe"
              />
            </div>
          </div>
          <div className="mt-4 grid sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Language
              </label>
              <select
                value={language}
                onChange={(e) =>
                  setLanguage((e.target.value as "ro" | "en") || "ro")
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="ro">Română</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                placeholder="+40 712 345 678"
              />
              {phone ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {phoneVerified ? (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-600/10 text-green-700 dark:text-green-300 border border-green-600/30 px-2 py-0.5">
                        ✓ Verified by call
                      </span>
                      {phoneVerifiedAt ? (
                        <span className="text-muted-foreground">
                          {new Date(phoneVerifiedAt).toLocaleTimeString()}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneVerified(false);
                          setPhoneVerifiedAt(null);
                          setCallPhase("idle");
                        }}
                        className="rounded-full border border-border px-2 py-0.5 hover:bg-muted"
                      >
                        Undo
                      </button>
                    </>
                  ) : (
                    <>
                      {callPhase === "idle" && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!phone.trim()) return;
                            const raw = phone.replace(/[^+0-9]/g, "");
                            setCallStartedAt(Date.now());
                            setCallPhase("dialing");
                            wasHiddenDuringDial.current = false;
                            let attempted = false;
                            try {
                              window.location.href = `tel:${raw}`; // mobile browsers
                              attempted = true;
                            } catch {}
                            if (!attempted) {
                              try {
                                const a = document.createElement("a");
                                a.href = `tel:${raw}`;
                                a.style.display = "none";
                                document.body.appendChild(a);
                                a.click();
                                setTimeout(() => a.remove(), 800);
                              } catch {}
                            }
                            // Fallback: if page never hides (desktop) enable confirm after short delay
                            setTimeout(() => {
                              if (
                                document.visibilityState === "visible" &&
                                callPhaseRef.current === "dialing" &&
                                !wasHiddenDuringDial.current
                              ) {
                                setCallPhase("ready-confirm");
                              }
                            }, 4000);
                          }}
                          className="rounded-full border border-border px-3 py-1 hover:bg-muted"
                        >
                          Call number
                        </button>
                      )}
                      {callPhase === "dialing" && (
                        <>
                          <span className="text-muted-foreground animate-pulse">
                            Dialing… (return after answer)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCallPhase("idle");
                              setCallStartedAt(null);
                            }}
                            className="rounded-full border border-border px-2 py-0.5 hover:bg-muted"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {callPhase === "ready-confirm" && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setPhoneVerified(true);
                              setPhoneVerifiedAt(Date.now());
                              push({
                                message: "Phone verified after call.",
                                variant: "success",
                              });
                            }}
                            className="rounded-full border border-border px-3 py-1 hover:bg-muted"
                          >
                            Confirm answered
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCallPhase("idle");
                              setCallStartedAt(null);
                            }}
                            className="rounded-full border border-border px-2 py-0.5 hover:bg-muted"
                          >
                            Retry
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                Staff (who handled)
              </label>
              <input
                value={staff}
                onChange={(e) => setStaff(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                placeholder="Alex"
                readOnly={!!staff}
              />
            </div>
          </div>
          {/* Section 3: Description */}
          <div className="flex items-center gap-2 mb-2 mt-8">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">
              3
            </span>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Item Description
            </h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">
              Notes (Descriere)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
              placeholder="Marca, modelul, seria, culoarea, starea etc."
            />
            <div className="mt-1 text-[10px] text-muted-foreground text-right">
              {notes.length} chars
            </div>
          </div>
          {/* Section 4: Photos */}
          <div className="flex items-center gap-2 mb-2 mt-8">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">
              4
            </span>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Evidence Photos
            </h2>
          </div>
          <div className="mt-6" aria-labelledby="evidence-photos-heading">
            <h3 id="evidence-photos-heading" className="sr-only">
              Evidence photos capture
            </h3>
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-6 xl:col-span-7">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-foreground">
                    Photos (required 4)
                  </p>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {Math.min(photos.length, 4)}/4 required captured
                  </span>
                </div>
                <ol className="mt-2 space-y-2 text-[11px] leading-tight text-muted-foreground">
                  {expectedPhotoDetails.map((slot, i) => {
                    const done = !!photos[i];
                    const next = photos.length === i;
                    // On small & extra-small screens show ONLY the current (next) step until all 4 are captured.
                    const showAll = photos.length >= 4; // after completion show every step again
                    const hideOnMobile = !showAll && !next && !done; // hide future non-current steps
                    const hideCompletedOnMobile = !showAll && done; // hide completed steps too until finished
                    return (
                      <li
                        key={slot.label}
                        className={`rounded-md border px-2 py-2 transition-colors ${
                          hideOnMobile || hideCompletedOnMobile
                            ? "hidden md:block"
                            : ""
                        } ${
                          done
                            ? "border-green-600/40 bg-green-600/5"
                            : next
                            ? "border-accent/60 bg-accent/5 animate-pulse"
                            : photos.length > i
                            ? "border-green-600/40 bg-green-600/5"
                            : "border-border bg-muted/20"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-semibold ring-1 ring-inset ${
                              done
                                ? "bg-green-600 text-white ring-green-600/60"
                                : next
                                ? "bg-accent text-accent-foreground ring-accent/70"
                                : "bg-muted text-foreground ring-border"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {slot.label}
                                {done
                                  ? " – captured"
                                  : next
                                  ? " – capture now"
                                  : ""}
                              </span>
                              {done && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePhotoSlot(i);
                                    if (!cameraOpen) void startCamera();
                                    push({
                                      message: `Retake slot ${i + 1} (${
                                        slot.label
                                      })`,
                                      variant: "info",
                                    });
                                  }}
                                  className="ml-auto text-[10px] rounded-full border border-border px-2 py-0.5 hover:bg-muted"
                                >
                                  Retake
                                </button>
                              )}
                              {!done && next && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePhotoSlot(i);
                                    if (!cameraOpen) void startCamera();
                                  }}
                                  className="ml-auto text-[10px] rounded-full border border-border px-2 py-0.5 hover:bg-muted"
                                >
                                  Select camera
                                </button>
                              )}
                            </div>
                            <ul className="mt-1 ml-1 pl-5 list-disc space-y-0.5">
                              {slot.tips.map((t) => (
                                <li key={t}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {photos.length >= 4 && (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    You can continue adding optional evidence photos after the
                    first four.
                  </p>
                )}
                {photos.length < 4 && (
                  <p className="mt-3 text-xs text-red-600">
                    Please add all 4 required photos before saving.
                  </p>
                )}
              </div>
              <div className="lg:col-span-6 xl:col-span-5 space-y-4">
                <div className="rounded-lg border border-border p-3 bg-muted/10">
                  <div className="flex flex-wrap gap-2">
                    {!cameraOpen ? (
                      <button
                        type="button"
                        onClick={() => void startCamera()}
                        className="flex-1 sm:flex-none text-sm rounded-full border border-border px-4 py-1.5 hover:bg-muted"
                      >
                        Open camera
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="flex-1 sm:flex-none text-sm rounded-full border border-border px-4 py-1.5 hover:bg-muted"
                      >
                        Close camera
                      </button>
                    )}
                    <label className="flex-1 sm:flex-none text-center text-sm rounded-full border border-border px-4 py-1.5 hover:bg-muted cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === "string") {
                              setPhotos((arr) => {
                                if (arr.length < 4) {
                                  if (
                                    arr.length === arr.filter(Boolean).length
                                  ) {
                                    return [...arr, reader.result as string];
                                  }
                                  return arr; // out of order ignore
                                }
                                return [...arr, reader.result as string];
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      Upload photo
                    </label>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      value={selectedDeviceId || ""}
                      onChange={(e) =>
                        setSelectedDeviceId(e.target.value || undefined)
                      }
                      className="w-full sm:flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                      aria-label="Camera device"
                    >
                      {videoDevices.length === 0 ? (
                        <option value="">No cameras</option>
                      ) : (
                        videoDevices.map((d, i) => (
                          <option key={d.deviceId || i} value={d.deviceId}>
                            {d.label || `Camera ${i + 1}`}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => void refreshDevices()}
                        className="flex-1 sm:flex-none text-sm rounded-full border border-border px-3 py-1.5 hover:bg-muted"
                      >
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={() => void startCamera()}
                        className="flex-1 sm:flex-none text-sm rounded-full border border-border px-3 py-1.5 hover:bg-muted"
                        title="Use selected camera"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                  {cameraOpen && (
                    <div className="mt-4">
                      <div className="relative group">
                        <video
                          ref={videoRef}
                          className="w-full rounded-lg border border-border bg-black aspect-video"
                          muted
                          playsInline
                          autoPlay
                        />
                        <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-white/5 group-hover:ring-accent/60 transition" />
                      </div>
                      {cameraError ? (
                        <p
                          className="mt-2 text-xs text-red-600"
                          aria-live="polite"
                        >
                          {cameraError}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!videoRef.current || !canvasRef.current) return;
                            const v = videoRef.current;
                            const rawW = v.videoWidth || 1280;
                            const rawH = v.videoHeight || 720;
                            const landscape = rawW >= rawH;
                            const c = canvasRef.current;
                            const ctx = c.getContext("2d");
                            if (!ctx) return;
                            if (landscape) {
                              c.width = rawW;
                              c.height = rawH;
                              ctx.drawImage(v, 0, 0, rawW, rawH);
                            } else {
                              c.width = rawH;
                              c.height = rawW;
                              ctx.save();
                              ctx.translate(c.width / 2, c.height / 2);
                              ctx.rotate((90 * Math.PI) / 180);
                              ctx.drawImage(
                                v,
                                -rawW / 2,
                                -rawH / 2,
                                rawW,
                                rawH
                              );
                              ctx.restore();
                            }
                            const dataUrl = c.toDataURL("image/jpeg", 0.9);
                            setPhotos((arr) => {
                              if (activePhotoSlot != null) {
                                const copy = [...arr];
                                copy[activePhotoSlot] = dataUrl;
                                return copy;
                              }
                              if (arr.length < 4) return [...arr, dataUrl];
                              return [...arr, dataUrl];
                            });
                            setActivePhotoSlot(null);
                          }}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-full bg-accent text-accent-foreground px-4 py-2 text-sm font-medium shadow hover:opacity-95"
                        >
                          {activePhotoSlot != null && activePhotoSlot < 4
                            ? `Capture slot ${activePhotoSlot + 1}`
                            : photos.length < 4
                            ? `Capture slot ${photos.length + 1}`
                            : "Capture extra"}
                        </button>
                        {activePhotoSlot != null && (
                          <button
                            type="button"
                            onClick={() => setActivePhotoSlot(null)}
                            className="sm:flex-none text-sm rounded-full border border-border px-4 py-2 hover:bg-muted"
                          >
                            Cancel slot
                          </button>
                        )}
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                  )}
                </div>
                {photos.length > 0 && (
                  <div className="rounded-lg border border-border p-3 bg-muted/10">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Array.from({ length: 4 }).map((_, i) => {
                        const src = photos[i];
                        const meta = expectedPhotoDetails[i];
                        return (
                          <div
                            key={i}
                            className={`relative rounded-md border h-32 overflow-hidden flex items-center justify-center text-center text-[11px] p-2 transition ${
                              src
                                ? "border-green-600/50"
                                : photos.length === i
                                ? "border-accent"
                                : "border-border bg-muted/30"
                            }`}
                          >
                            {src ? (
                              <>
                                <Image
                                  src={src}
                                  alt={`slot-${i + 1}`}
                                  fill
                                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                  className="object-cover"
                                />
                                <div className="absolute top-0 left-0 bg-black/60 text-[10px] px-1.5 py-0.5 rounded-br text-white flex items-center gap-1">
                                  <span className="font-semibold">{i + 1}</span>
                                  <span className="hidden md:inline">
                                    {meta.label}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePhotoSlot(i);
                                    if (!cameraOpen) void startCamera();
                                  }}
                                  className="absolute bottom-1 right-1 text-[10px] rounded-full bg-black/60 text-white px-2 py-0.5 hover:bg-black/80"
                                >
                                  Replace
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (photos.length !== i) return;
                                  setActivePhotoSlot(i);
                                  if (!cameraOpen) void startCamera();
                                }}
                                className="flex flex-col items-center gap-1 text-foreground/70 hover:text-foreground"
                              >
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-medium">
                                  {i + 1}
                                </span>
                                <span className="font-medium leading-tight line-clamp-2">
                                  {meta.label}
                                </span>
                                <span className="text-[9px] leading-tight opacity-70">
                                  {meta.tips[0]}
                                </span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {photos.length > 4 && (
                      <div className="mt-4">
                        <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">
                          Additional evidence
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {photos.slice(4).map((src, i) => (
                            <div
                              key={i}
                              className="relative rounded-md overflow-hidden border border-border h-28"
                            >
                              <Image
                                src={src}
                                alt={`extra-${i}`}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover"
                              />
                              <div className="absolute top-0 left-0 bg-black/50 text-[10px] px-1.5 py-0.5 rounded-br text-white">
                                +{i + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Section 5: Declarations Preview */}
          <div className="flex items-center gap-2 mb-2 mt-10">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">
              5
            </span>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Declarations Preview
            </h2>
          </div>
          {/* Preview of declaration text: RO + EN */}
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-foreground">
                Text declarație (RO)
              </label>
              <button
                type="button"
                onClick={() => {
                  const txt = buildDeclarationRO({
                    coatNumber,
                    fullName,
                    phone: phone || undefined,
                    email: email || undefined,
                    staff: staff || undefined,
                    notes: notes || undefined,
                    createdAt: Date.now(),
                  });
                  void navigator.clipboard.writeText(txt);
                }}
                className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
              >
                Copy
              </button>
            </div>
            <textarea
              readOnly
              value={buildDeclarationRO({
                coatNumber,
                fullName,
                phone: phone || undefined,
                email: email || undefined,
                staff: staff || undefined,
                notes: notes || undefined,
                createdAt: Date.now(),
              })}
              rows={8}
              className="mt-1 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-foreground">
                Declaration text (EN)
              </label>
              <button
                type="button"
                onClick={() => {
                  const txt = buildDeclarationEN({
                    coatNumber,
                    fullName,
                    phone: phone || undefined,
                    email: email || undefined,
                    staff: staff || undefined,
                    notes: notes || undefined,
                    createdAt: Date.now(),
                  });
                  void navigator.clipboard.writeText(txt);
                }}
                className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
              >
                Copy
              </button>
            </div>
            <textarea
              readOnly
              value={buildDeclarationEN({
                coatNumber,
                fullName,
                phone: phone || undefined,
                email: email || undefined,
                staff: staff || undefined,
                notes: notes || undefined,
                createdAt: Date.now(),
              })}
              rows={8}
              className="mt-1 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
            />
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-1">
                Semnătură / Signature
              </div>
              <div className="h-9 border-b border-border w-64" />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              disabled={submitting || !coatNumber || !fullName}
              aria-disabled={photos.length < 4}
              onClick={submit}
              className="inline-flex items-center rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium shadow hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & Print
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

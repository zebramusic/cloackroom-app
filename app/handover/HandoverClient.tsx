"use client";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/app/private/toast/ToastContext";
import Image from "next/image";
import type { HandoverReport } from "@/app/models/handover";

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
  const [q, setQ] = useState("");
  const [items, setItems] = useState<HandoverReport[]>([]);
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

  // Reset manual verification if phone number is altered after verification
  useEffect(() => {
    // If user edits the phone after verifying, force re-verify
    setPhoneVerified(false);
    setPhoneVerifiedAt(null);
    setCallPhase("idle");
    setCallStartedAt(null);
  }, [phone]);

  // Phone call verification state
  const [callPhase, setCallPhase] = useState<
    "idle" | "dialing" | "await-return" | "ready-confirm"
  >("idle");
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const wasHiddenDuringDial = useRef(false);

  // Listen for page visibility changes to infer user returning after attempting a call
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (callPhase === "dialing") wasHiddenDuringDial.current = true;
        return;
      }
      // Returned to page
      if (
        callPhase === "dialing" &&
        wasHiddenDuringDial.current &&
        callStartedAt &&
        Date.now() - callStartedAt > 1500 // minimal threshold
      ) {
        setCallPhase("ready-confirm");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [callPhase, callStartedAt]);

  async function startCamera() {
    setCameraError(null);
    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setCameraError(
          "Camera not supported. Use a modern browser and ensure the site is opened via HTTPS or localhost."
        );
        return;
      }
      const isLocalhost =
        typeof location !== "undefined" &&
        /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
      const isSecure =
        typeof window !== "undefined" &&
        typeof window.isSecureContext === "boolean"
          ? window.isSecureContext
          : false;
      if (!isLocalhost && !isSecure) {
        setCameraError(
          "Camera requires a secure context (HTTPS). Please use HTTPS or localhost."
        );
        return;
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
      const baseVideo: MediaTrackConstraints = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId } }
        : {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: { ideal: 16 / 9 },
          };
      const constraints: MediaStreamConstraints = {
        video: baseVideo,
        audio: false,
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s as MediaStream;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.error(e);
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
    }
  }

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

  type TemplateInput = {
    coatNumber: string;
    fullName: string;
    phone?: string;
    email?: string;
    staff?: string;
    notes?: string; // used as description
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

  // Initial focus, fetch list, and prime devices; devicechange listener
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    coatRef.current?.focus();
    void fetchList("");
    void refreshDevices();
    // fetch current staff user
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.user?.fullName) setStaff((s) => s || j.user.fullName);
        setMe(j.user || null);
      })
      .catch(() => {});
    const handler = () => void refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    // Auto-start camera after initial device enumeration (delay for permission prompt order)
    const autoTimer = setTimeout(() => {
      if (!cameraOpen) void startCamera();
    }, 250);
    return () => {
      clearTimeout(autoTimer);
      navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
    };
  }, []);

  useEffect(() => {
    if (cameraOpen) void startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId]);

  async function fetchList(query: string) {
    const res = await fetch(`/api/handover?q=${encodeURIComponent(query)}`, {
      cache: "no-store",
    });
    const json = (await res.json()) as { items: HandoverReport[] };
    setItems(json.items);
  }

  async function submit() {
    if (!coatNumber.trim() || !fullName.trim()) return;
    if (photos.length < 3) {
      push({ message: "Please add at least 3 photos.", variant: "error" });
      return;
    }
    if (phone.trim() && !phoneVerified) {
      push({
        message: "Please verify the phone by calling it first.",
        variant: "warning",
      });
      return;
    }
    setSubmitting(true);
    try {
      const id = `handover_${Date.now()}`;
      const payload: HandoverReport = {
        id,
        coatNumber: coatNumber.trim(),
        fullName: fullName.trim(),
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
      await fetchList("");
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

  function printReport(r: HandoverReport) {
    try {
      sessionStorage.setItem(`handover:${r.id}`, JSON.stringify(r));
    } catch {}
    window.open(
      `/private/handover/print/${encodeURIComponent(r.id)}?open=pdf&lang=${
        r.language || "ro"
      }`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function remove(id: string) {
    const proceed = confirm(
      "Delete this handover report? This action cannot be undone."
    );
    if (!proceed) return;
    try {
      await fetch(`/api/handover?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error(e);
      push({
        message: "Failed to delete report. Please try again.",
        variant: "error",
      });
    } finally {
      await fetchList(q);
    }
  }

  async function addSignedDoc(r: HandoverReport, file: File) {
    // Compress image to reasonable size
    const dataUrl = await fileToJpegDataUrl(file, 1600, 0.85);
    await fetch(`/api/handover`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: r.id, signedDoc: dataUrl }),
    });
    await fetchList(q);
  }

  function fileToJpegDataUrl(
    file: File,
    maxW: number,
    quality: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("Bad file result"));
          return;
        }
        const img = document.createElement("img");
        img.onload = () => {
          try {
            const scale = Math.min(1, maxW / img.width);
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(reader.result as string);
              return;
            }
            ctx.drawImage(img, 0, 0, w, h);
            const out = canvas.toDataURL("image/jpeg", quality);
            resolve(out);
          } catch (e) {
            resolve(reader.result as string);
          }
        };
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("File read error"));
      reader.readAsDataURL(file);
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold text-foreground">
        Handover/Reception report
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create a report for clients who lost their ticket, using the coat
        number.
      </p>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4">
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
                <div className="mt-2 flex items-center gap-2 text-xs">
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
                        }}
                        className="rounded-full border border-border px-2 py-0.5 hover:bg-muted"
                      >
                        Undo
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!phone.trim()) return;
                        const ok = confirm(
                          "Call the number now. Did the client answer and confirm ownership?"
                        );
                        if (ok) {
                          setPhoneVerified(true);
                          setPhoneVerifiedAt(Date.now());
                          push({
                            message: "Phone manually verified.",
                            variant: "success",
                          });
                        }
                      }}
                      className="rounded-full border border-border px-3 py-1 hover:bg-muted"
                    >
                      Verify by call
                    </button>
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
          <div className="mt-4">
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
          </div>
          {/* Photos capture/upload (require at least 3) */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                Photos (min. 3)
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {!cameraOpen ? (
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
                  >
                    Camera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
                  >
                    Close
                  </button>
                )}
                {/* Camera device selector */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedDeviceId || ""}
                    onChange={(e) =>
                      setSelectedDeviceId(e.target.value || undefined)
                    }
                    className="rounded-full border border-border bg-background px-3 py-1 text-sm min-w-40"
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
                  <button
                    type="button"
                    onClick={() => void refreshDevices()}
                    className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
                    title="Use selected camera"
                  >
                    Use
                  </button>
                </div>
                <label className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted cursor-pointer">
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
                          setPhotos((arr) => [...arr, reader.result as string]);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  Add photo
                </label>
              </div>
            </div>
            {cameraOpen ? (
              <div className="mt-3">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg border border-border bg-black aspect-video"
                  muted
                  playsInline
                  autoPlay
                />
                {cameraError ? (
                  <p className="mt-2 text-sm text-red-600" aria-live="polite">
                    {cameraError}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center gap-2">
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
                        // Rotate portrait to landscape (clockwise 90deg)
                        c.width = rawH;
                        c.height = rawW;
                        ctx.save();
                        ctx.translate(c.width / 2, c.height / 2);
                        ctx.rotate((90 * Math.PI) / 180);
                        ctx.drawImage(v, -rawW / 2, -rawH / 2, rawW, rawH);
                        ctx.restore();
                      }
                      const dataUrl = c.toDataURL("image/jpeg", 0.9);
                      setPhotos((arr) => [...arr, dataUrl]);
                    }}
                    className="inline-flex items-center rounded-full bg-accent text-accent-foreground px-4 py-2 text-sm font-medium shadow hover:opacity-95"
                  >
                    Capture
                  </button>
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
            ) : null}

            {photos.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((src, i) => (
                  <div
                    key={i}
                    className="relative rounded-lg overflow-hidden border border-border h-32"
                  >
                    <Image
                      src={src}
                      alt={`photo-${i}`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
            {photos.length < 3 ? (
              <p className="mt-2 text-xs text-red-600">
                Please add at least 3 photos before saving.
              </p>
            ) : null}
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
            {/* Signature box label (visual) */}
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
              aria-disabled={photos.length < 3}
              onClick={submit}
              className="inline-flex items-center rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium shadow hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & Print
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">Reports</h3>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                void fetchList(e.target.value);
              }}
              placeholder="Search by coat or name"
              className="rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="mt-3 grid gap-3">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports yet.</p>
            ) : (
              items.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-border bg-background p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">
                        #{r.coatNumber} — {r.fullName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => printReport(r)}
                        className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
                      >
                        Print
                      </button>
                      {r.signedDoc ? (
                        <a
                          href={r.signedDoc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
                        >
                          Signed
                        </a>
                      ) : (
                        <label className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void addSignedDoc(r, f);
                            }}
                          />
                          Add Signed
                        </label>
                      )}
                      {me?.type === "admin" && (
                        <button
                          onClick={() => void remove(r.id)}
                          className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

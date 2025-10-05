"use client";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/app/private/toast/ToastContext";
import Image from "next/image";
import { useLocale } from "@/app/providers/LocaleProvider";
import type { LostClaim } from "@/app/models/lost";

export default function LostClient() {
  const { push } = useToast();
  const { t } = useLocale();
  const [fullName, setFullName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [claims, setClaims] = useState<LostClaim[]>([]);
  const [q, setQ] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchClaims("");
  }, []);

  async function fetchClaims(query: string) {
    const res = await fetch(`/api/lost?q=${encodeURIComponent(query)}`, {
      cache: "no-store",
    });
    const json = (await res.json()) as { items: LostClaim[] };
    setClaims(json.items);
  }

  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s as MediaStream;
        await videoRef.current.play();
      }
      setCameraOpen(true);
    } catch (e) {
      console.error(e);
    }
  }
  function stopCamera() {
    videoRef.current?.pause();
    stream?.getTracks().forEach((tr) => tr.stop());
    setStream(null);
    setCameraOpen(false);
  }
  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    const dataUrl = c.toDataURL("image/jpeg", 0.9);
    setPhotos((arr) => [...arr, dataUrl]);
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string")
        setPhotos((arr) => [...arr, reader.result as string]);
    };
    reader.readAsDataURL(file);
  }

  async function submitClaim() {
    if (!fullName.trim() || !address1.trim()) return;
    setSubmitting(true);
    try {
      const id = `lost_${Date.now()}`;
      const claim: LostClaim = {
        id,
        fullName: fullName.trim(),
        addressLine1: address1.trim(),
        addressLine2: address2.trim() || undefined,
        city: city.trim() || undefined,
        postalCode: postal.trim() || undefined,
        country: country.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        photos,
        createdAt: Date.now(),
      };
      await fetch(`/api/lost`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(claim),
      });
      // reset
      setFullName("");
      setAddress1("");
      setAddress2("");
      setCity("");
      setPostal("");
      setCountry("");
      setPhone("");
      setEmail("");
      setPhotos([]);
      await fetchClaims("");
      push({ message: t("lost.submitted"), variant: "success" });
    } finally {
      setSubmitting(false);
    }
  }

  async function resolveClaim(id: string, resolved: boolean) {
    await fetch(`/api/lost`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, resolved }),
    });
    await fetchClaims(q);
  }
  async function deleteClaim(id: string) {
    await fetch(`/api/lost?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await fetchClaims(q);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold text-foreground">{t("lost.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("lost.helper")}</p>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                {t("lost.fullName")}
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                {t("lost.phone")}
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                placeholder="+40 712 345 678"
              />
            </div>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                {t("lost.address")}
              </label>
              <input
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                placeholder="Strada Exemplu 10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                {t("lost.address2")}
              </label>
              <input
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                placeholder="Bloc, scară, apartament"
              />
            </div>
          </div>
          <div className="mt-4 grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                {t("lost.city")}
              </label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                placeholder="București"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                {t("lost.postal")}
              </label>
              <input
                value={postal}
                onChange={(e) => setPostal(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                placeholder="010101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                {t("lost.country")}
              </label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                placeholder="România"
              />
            </div>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                {t("lost.email")}
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
                placeholder="jane@example.com"
              />
            </div>
          </div>

          {/* Photos */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                {t("lost.photos")}
              </h3>
              <div className="flex items-center gap-2">
                {!cameraOpen ? (
                  <button
                    onClick={startCamera}
                    className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
                  >
                    Camera
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
                  >
                    Close
                  </button>
                )}
                <label className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onUpload}
                  />
                  {t("lost.addPhoto")}
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
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={capturePhoto}
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
                    className="relative rounded-lg overflow-hidden border border-border h-40"
                  >
                    <Image
                      src={src}
                      alt={`photo-${i}`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover"
                      priority={false}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              disabled={submitting || !fullName || !address1}
              onClick={submitClaim}
              className="inline-flex items-center rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium shadow hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("lost.submit")}
            </button>
          </div>
        </div>

        {/* Claims list */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">
              {t("lost.list")}
            </h3>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                void fetchClaims(e.target.value);
              }}
              placeholder="Search"
              className="rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="mt-3 grid gap-3">
            {claims.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("lost.none")}</p>
            ) : (
              claims.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-border bg-background p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">
                        {c.fullName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.addressLine1}
                        {c.city ? `, ${c.city}` : ""}{" "}
                        {c.country ? `, ${c.country}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.resolved ? (
                        <button
                          onClick={() => void resolveClaim(c.id, false)}
                          className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
                        >
                          {t("lost.unresolve")}
                        </button>
                      ) : (
                        <button
                          onClick={() => void resolveClaim(c.id, true)}
                          className="text-sm rounded-full bg-accent text-accent-foreground px-3 py-1 hover:opacity-95"
                        >
                          {t("lost.resolve")}
                        </button>
                      )}
                      <button
                        onClick={() => void deleteClaim(c.id)}
                        className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {c.photos?.length ? (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {c.photos.map((src, i) => (
                        <div
                          key={i}
                          className="relative h-24 rounded overflow-hidden"
                        >
                          <Image
                            src={src}
                            alt={`claim-${c.id}-${i}`}
                            fill
                            sizes="(max-width: 640px) 33vw, 20vw"
                            className="object-cover"
                            priority={false}
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

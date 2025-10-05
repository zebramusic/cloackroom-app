"use client";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/app/private/toast/ToastContext";
import { useRouter } from "next/navigation";

export default function SignedDocClient({ initial, id }: { initial?: string; id: string }) {
  const [value, setValue] = useState<string | undefined>(initial);
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { push } = useToast();
  const router = useRouter();

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera API not available in this browser.");
        return;
      }
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s as MediaStream;
        await videoRef.current.play();
      }
      setCameraOpen(true);
    } catch (e) {
      console.error(e);
      setCameraError("Could not start camera. Check permissions.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  async function captureSigned() {
    if (!videoRef.current) return;
    try {
      setUploading(true);
      const v = videoRef.current;
      const rawW = v.videoWidth || 1280;
      const rawH = v.videoHeight || 720;
      const canvas = document.createElement("canvas");
      // Keep original orientation; scale down if very large
      const maxDim = 1800;
      const scale = Math.min(1, maxDim / Math.max(rawW, rawH));
      canvas.width = Math.round(rawW * scale);
      canvas.height = Math.round(rawH * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unsupported");
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const optimized = await compressCanvasToMax(canvas, 300 * 1024);
      await persistSigned(optimized);
      stopCamera();
    } catch (e) {
      console.error(e);
      push({ message: "Capture failed.", variant: "error" });
    } finally {
      setUploading(false);
    }
  }

  async function onFile(f: File) {
    setUploading(true);
    try {
      const base = await fileToJpegDataUrl(f, 1800, 0.9);
      const optimized = await ensureMaxBytes(base, 300 * 1024);
      await persistSigned(optimized);
    } catch (e) {
      console.error(e);
      push({ message: "Failed to store signed document.", variant: "error" });
    } finally {
      setUploading(false);
    }
  }

  async function persistSigned(dataUrl: string) {
    const res = await fetch(`/api/handover`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, signedDoc: dataUrl }),
    });
    if (!res.ok) throw new Error("Upload failed");
    setValue(dataUrl);
    push({ message: "Signed document stored.", variant: "success" });
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border p-4 bg-card">
      <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-muted-foreground">
        Signed Handover
      </h2>
      {value ? (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 flex-wrap">
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
            >
              Open Signed
            </a>
            <label className="text-xs rounded-full border border-border px-3 py-1 cursor-pointer hover:bg-muted">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
              Replace (Upload)
            </label>
            {!cameraOpen ? (
              <button
                type="button"
                onClick={() => void startCamera()}
                className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
              >
                Replace (Camera)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => stopCamera()}
                className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
              >
                Cancel Camera
              </button>
            )}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Signed document"
            className="block max-h-[480px] w-auto rounded-lg border border-border object-contain bg-muted"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            <label className="text-xs rounded-full border border-border px-3 py-1 cursor-pointer hover:bg-muted">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
              {uploading ? "Uploading…" : "Upload Signed Page"}
            </label>
            {!cameraOpen ? (
              <button
                type="button"
                onClick={() => void startCamera()}
                className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
              >
                Use Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={() => stopCamera()}
                className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
              >
                Cancel Camera
              </button>
            )}
          </div>
        </div>
      )}

      {cameraOpen && (
        <div className="mt-4 flex flex-col gap-3">
          <video
            ref={videoRef}
            className="w-full max-w-md aspect-video rounded-lg border border-border bg-black"
            muted
            playsInline
            autoPlay
          />
          {cameraError ? (
            <p className="text-xs text-red-600" aria-live="polite">{cameraError}</p>
          ) : null}
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              disabled={uploading}
              onClick={() => void captureSigned()}
              className="text-xs rounded-full bg-accent text-accent-foreground px-4 py-2 font-medium hover:opacity-95 disabled:opacity-50"
            >
              {uploading ? "Capturing…" : "Capture Signed Page"}
            </button>
            <button
              type="button"
              onClick={() => stopCamera()}
              className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
            >
              Close Camera
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Image automatically optimized (≤ 300KB).
          </p>
        </div>
      )}
    </div>
  );
}

function fileToJpegDataUrl(file: File, maxW: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Bad file result"));
        return;
      }
      const img = new Image();
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

async function compressCanvasToMax(canvas: HTMLCanvasElement, maxBytes: number): Promise<string> {
  let quality = 0.9;
  let attempt = 0;
  let currentCanvas = canvas;
  while (attempt < 12) {
    const dataUrl = currentCanvas.toDataURL("image/jpeg", quality);
    const bytes = estimateDataUrlBytes(dataUrl);
    if (bytes <= maxBytes) return dataUrl;
    // reduce quality first until ~0.4 then scale
    if (quality > 0.45) {
      quality -= 0.1;
    } else {
      // scale down by 85%
      const scaled = document.createElement("canvas");
      scaled.width = Math.round(currentCanvas.width * 0.85);
      scaled.height = Math.round(currentCanvas.height * 0.85);
      const ctx = scaled.getContext("2d");
      if (!ctx) return dataUrl; // fallback
      ctx.drawImage(currentCanvas, 0, 0, scaled.width, scaled.height);
      currentCanvas = scaled;
      // slight quality bump after scale to preserve clarity
      quality = Math.min(0.8, quality + 0.05);
    }
    attempt++;
  }
  return currentCanvas.toDataURL("image/jpeg", quality);
}

function estimateDataUrlBytes(dataUrl: string): number {
  const b64 = dataUrl.split(",")[1] || "";
  // Base64 size formula: (length * 3)/4 - padding
  return Math.round((b64.length * 3) / 4 - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0));
}

async function ensureMaxBytes(dataUrl: string, maxBytes: number): Promise<string> {
  if (estimateDataUrlBytes(dataUrl) <= maxBytes) return dataUrl;
  // load into canvas and compress
  const img = document.createElement("img");
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("img load failed"));
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0);
  return compressCanvasToMax(canvas, maxBytes);
}

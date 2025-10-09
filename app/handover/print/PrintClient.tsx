"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { HandoverReport } from "@/app/models/handover";
type Props = { id: string };

export default function PrintClient({ id }: Props) {
  const [data, setData] = useState<HandoverReport | null>(null);
  const [optimizedPhotos, setOptimizedPhotos] = useState<string[] | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [shouldOpenPdf, setShouldOpenPdf] = useState(false);
  const [shouldAutoPrint, setShouldAutoPrint] = useState(false);
  const [forceLandscape, setForceLandscape] = useState(false); // can be enabled via ?orientation=landscape
  const [maxDim, setMaxDim] = useState(1600); // adjustable via ?quality=low|high
  const [lang, setLang] = useState<"ro" | "en">("ro");
  const userChangedLang = useRef(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`handover:${id}`);
      if (raw) {
        setData(JSON.parse(raw) as HandoverReport);
        return;
      }
    } catch {}
    const load = async () => {
      const res = await fetch(`/api/handover?q=`);
      const json = (await res.json()) as { items: HandoverReport[] };
      setData(json.items.find((x) => x.id === id) || null);
    };
    void load();
  }, [id]);

  // Optimize photos (downscale + EXIF orientation normalization + optional landscape rotation + watermark)
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!data?.photos?.length) {
        setOptimizedPhotos(null);
        return;
      }
      const timestamp = new Date(data.createdAt).toLocaleString();
      const outs = await Promise.all(
        data.photos.map((p) =>
          downscaleImage(p, maxDim, maxDim, maxDim > 1600 ? 0.92 : 0.85, {
            forceLandscape,
            createdAt: new Date(data.createdAt),
            watermark: timestamp, // basic timestamp watermark
          })
        )
      );
      if (!cancelled) setOptimizedPhotos(outs);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [data?.photos, data?.createdAt, forceLandscape, maxDim]);

  const html = useMemo(
    () => (data ? buildHTML(data, optimizedPhotos ?? undefined, lang) : ""),
    [data, optimizedPhotos, lang]
  );

  // PDF generator types and function (defined before any early return to keep hook order stable)
  type Html2Pdf = {
    from: (el: Element) => Html2Pdf;
    set: (opts: Record<string, unknown>) => Html2Pdf;
    save: () => Promise<void> | void;
    toPdf?: () => Html2Pdf;
    get?: (key: "pdf") => unknown;
  };
  type Html2PdfFactory = (() => Html2Pdf) & {
    from: (el: Element) => Html2Pdf;
    set: (opts: Record<string, unknown>) => Html2Pdf;
  };
  type JsPDF = { output: (type: "blob" | string) => Blob | string };
  function isJsPDF(x: unknown): x is JsPDF {
    return !!x && typeof (x as { output?: unknown }).output === "function";
  }

  const downloadPdf = useCallback(async () => {
    try {
      const mod: unknown = await import("html2pdf.js");
      const possible = mod as Html2PdfFactory | { default?: unknown };
      let factory: Html2PdfFactory | undefined;
      if (typeof (possible as { default?: unknown }).default === "function") {
        factory = (possible as { default: Html2PdfFactory }).default;
      } else if (typeof possible === "function") {
        factory = possible as Html2PdfFactory;
      }
      const el = contentRef.current;
      if (!el || !data) return;
      // enlarge images while generating PDF
      el.classList.add("pdf-mode");
      if (!factory) {
        window.print();
        return;
      }
      const worker = factory()
        .from(el)
        .set({
          margin: 10,
          filename: `handover_${data.id}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        });
      if (
        typeof worker.toPdf === "function" &&
        typeof worker.get === "function"
      ) {
        try {
          const w2 = worker.toPdf() as Html2Pdf;
          const pdfUnknown = (w2.get as (k: "pdf") => unknown)("pdf");
          const pdf = isJsPDF(pdfUnknown) ? pdfUnknown : null;
          if (pdf) {
            const blob = pdf.output("blob") as Blob;
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank", "noopener,noreferrer");
          } else {
            await (worker as Html2Pdf).save?.();
          }
        } catch {
          await (worker as Html2Pdf).save?.();
        }
      } else {
        await (worker as Html2Pdf).save?.();
      }
    } catch (e) {
      console.error(e);
      window.print();
    } finally {
      contentRef.current?.classList.remove("pdf-mode");
    }
  }, [data, isJsPDF]);

  // Detect mode from query param and trigger appropriate action
  useEffect(() => {
    const usp = new URLSearchParams(window.location.search);
    setShouldOpenPdf(usp.get("open") === "pdf");
    setShouldAutoPrint(usp.get("auto") === "1" || usp.get("auto") === "true");
    const orient = usp.get("orientation");
    if (orient === "landscape") setForceLandscape(true);
    else if (orient === "original" || orient === "portrait")
      setForceLandscape(false);
    const quality = usp.get("quality");
    if (quality === "high") setMaxDim(2400);
    else if (quality === "low") setMaxDim(1000);
    const lp = usp.get("lang");
    if (lp === "en" || lp === "ro") setLang(lp);
  }, []);

  useEffect(() => {
    if (!data) return;
    const usp = new URLSearchParams(window.location.search);
    if (!usp.get("lang") && !userChangedLang.current) {
      if (data.language) setLang(data.language);
    }
  }, [data]);

  // Auto-open print or PDF depending on mode
  useEffect(() => {
    if (!data || !shouldAutoPrint) return;
    const t = setTimeout(() => {
      if (shouldOpenPdf) void downloadPdf();
      else window.print();
    }, 200); // small delay so buttons are focusable briefly
    return () => clearTimeout(t);
  }, [data, shouldAutoPrint, shouldOpenPdf, downloadPdf]);

  if (!data)
    return (
      <main className="p-6 text-sm text-muted-foreground">Loading report…</main>
    );

  return (
    <main className="p-6">
      <style
        dangerouslySetInnerHTML={{
          __html:
            styles +
            "\n@media print{ .print\\:hidden{ display:none !important } }",
        }}
      />
      <div className="flex items-center justify-between gap-4 print:hidden mb-4 z-10">
        <Link
          href="/private/handover"
          className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          aria-label="Back to Handover"
        >
          ← Back to Handover
        </Link>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 mr-2"
            aria-label="Language toggle"
          >
            <button
              type="button"
              onClick={() => {
                if (lang === "ro") return;
                userChangedLang.current = true;
                setLang("ro");
                const usp = new URLSearchParams(window.location.search);
                usp.set("lang", "ro");
                window.history.replaceState(
                  null,
                  "",
                  `${window.location.pathname}?${usp.toString()}`
                );
              }}
              className={`text-xs rounded-full border px-2 py-1 ${
                lang === "ro"
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border hover:bg-muted"
              }`}
            >
              RO
            </button>
            <button
              type="button"
              onClick={() => {
                if (lang === "en") return;
                userChangedLang.current = true;
                setLang("en");
                const usp = new URLSearchParams(window.location.search);
                usp.set("lang", "en");
                window.history.replaceState(
                  null,
                  "",
                  `${window.location.pathname}?${usp.toString()}`
                );
              }}
              className={`text-xs rounded-full border px-2 py-1 ${
                lang === "en"
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border hover:bg-muted"
              }`}
            >
              EN
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
            type="button"
          >
            Print
          </button>
          <button
            onClick={() => void downloadPdf()}
            className="text-sm rounded-full bg-accent text-accent-foreground px-3 py-1 hover:opacity-95"
            type="button"
          >
            Download PDF
          </button>
        </div>
      </div>
      <div
        ref={contentRef}
        className="print-light"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}

const styles = `
  @page { size: A4 portrait; margin: 10mm; }
  body, .print-light { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#fff; color:#111; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size:13px; }
  .print-light { line-height:1.45; }
  /* Single-page enforced grid layout */
  .single-page-grid{ display:grid; grid-template-columns:1fr; gap:12px; align-items:start; }
  .single-page-grid.narrow-cols{ grid-template-columns:1fr 180px; }
  .single-page-grid .text-section{ display:flex; flex-direction:column; min-width:0; }
  .single-page-grid .photos-section{ display:flex; flex-direction:column; gap:6px; }
  .single-page-grid .photos-heading{ margin:0 0 4px; }
  .single-page-grid .photos-box .grid{ display:grid; gap:6px; grid-template-columns:1fr; }
  .single-page-grid .photos-box .grid img{ aspect-ratio:4/3; width:100%; height:auto; object-fit:cover; border:1px solid #ccc; border-radius:4px; }
  .single-page-grid .muted{ font-size:11px; }
  /* Auto-scale helper when overflow detected */
  .auto-scale{ transform-origin:top left; }
  @media print { .auto-scale{ transform-origin:top left !important; } }
  .layout-two{ display:none; }
  .layout-stack{ display:flex; flex-direction:column; gap:18px; width:100%; }
  .layout-stack .text-section{ display:flex; flex-direction:column; }
  .layout-stack .photos-section{ display:flex; flex-direction:column; }
  .photos-box.no-photos{ display:flex; align-items:center; justify-content:center; min-height:120px; }
  .decl-box{ margin-top:14px; }
  .signature-line{ margin-top:1px; display:flex; align-items:center; gap:12px; }
  .signature-line .sig-label{ font-size:12px; color:#444; min-width:140px; }
  .signature-line .sig-box{ flex:1; height:40px; border-bottom:1px solid #bbb; }
  .small{ font-size:13px; }
  .photos-box{ flex:0 0 auto; display:flex; flex-direction:column; }
  .photos-box .grid{ display:grid; gap:10px; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); align-items:start; }
  .photos-box .grid img{ width:100%; height:auto; object-fit:contain; background:#000; aspect-ratio:16/9; border:1px solid #ccc; border-radius:6px; }
  .photos-box.photos-count-1 .grid{ grid-template-columns:minmax(400px,1fr); }
  .photos-box.photos-count-2 .grid{ grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); }
  .photos-box.photos-count-3 .grid{ grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); }
  @media (max-width:900px){ .photos-box{ width:100%; } }
  h1{ font-size:13px; margin:0 0 10px; font-weight:700; letter-spacing:.5px; }
  h2{ font-size:13px; margin:10px 0 6px; font-weight:600; }
  .header{ margin-bottom:10px; padding:6px 8px; background:#f7f7f9; border:1px solid #e2e2e6; border-radius:6px; }
  .header .company{ font-weight:700; font-size:12px; }
  .row{ margin:4px 0; font-size:13px; }
  .row-duo{ display:flex; flex-wrap:wrap; gap:28px; align-items:flex-start; }
  .row-duo .field{ display:flex; align-items:baseline; gap:6px; }
  .row-duo .field .label{ min-width:auto; }
  .row-multi{ display:flex; flex-wrap:wrap; gap:28px; align-items:flex-start; margin:4px 0; }
  .row-multi .field{ display:flex; align-items:baseline; gap:6px; }
  .row-multi .field .label{ min-width:auto; }
  .label{ display:inline-block; min-width:120px; color:#333; font-weight:500; }
  .box{ border:1px solid #e2e2e6; background:#fcfcfd; border-radius:10px; padding:10px 12px; margin-top:12px; box-shadow:0 0 0 1px #fff inset; }
  .box p{ margin:6px 0; }
  .box p + p{ margin-top:8px; }
  .muted{ color:#555; }
  .photos-heading{ font-size:13px; font-weight:600; letter-spacing:.5px; text-transform:uppercase; margin-bottom:4px; color:#222; }
  .header-inline{ display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
  .header-inline .sep{ color:#888; }
  .pdf-mode, .pdf-mode * { font-size:13px !important; }
  @media print { body, body * { font-size:13px !important; } }
  .pdf-mode h1, .pdf-mode h2 { font-size:13px !important; }
  .print-light p{ line-height:1.5; }
  .box h2 + p{ margin-top:4px; }
  @media print {
    nav, header { display:none !important; }
    .photos-box .grid{ gap:2px; }
    /* Keep stacked layout in portrait */
    .layout-stack { flex-direction:column !important; }
  }
  .pdf-mode .photos-box .grid{ gap:8px; }
`;

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

interface DownscaleOptions {
  forceLandscape?: boolean;
  createdAt?: string | Date;
  watermark?: string; // text watermark
}

async function downscaleImage(
  src: string,
  maxW: number,
  maxH: number,
  quality: number,
  opts: DownscaleOptions = {}
): Promise<string> {
  const img = await loadImage(src);
  let orientation = 1;
  try {
    orientation = await readExifOrientation(src);
  } catch {}
  const normalized = document.createElement("canvas");
  const nctx = normalized.getContext("2d");
  if (!nctx) return src;
  const swap = orientation >= 5 && orientation <= 8;
  normalized.width = swap ? img.height : img.width;
  normalized.height = swap ? img.width : img.height;
  applyExifTransform(nctx, orientation, img.width, img.height);
  nctx.drawImage(img, 0, 0);
  const normW = normalized.width;
  const normH = normalized.height;
  const willRotate = opts.forceLandscape && normH > normW;
  const baseW = willRotate ? normH : normW;
  const baseH = willRotate ? normW : normH;
  const ratio = Math.min(1, maxW / baseW, maxH / baseH);
  const targetW = Math.max(1, Math.round(baseW * ratio));
  const targetH = Math.max(1, Math.round(baseH * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  if (willRotate) {
    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(normalized, -normW / 2, -normH / 2, normW, normH);
  } else {
    ctx.drawImage(normalized, 0, 0, targetW, targetH);
  }
  if (opts.watermark) {
    const pad = Math.max(8, Math.round(targetW * 0.01));
    ctx.font = `${Math.round(targetW * 0.03)}px sans-serif`;
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    const metrics = ctx.measureText(opts.watermark);
    const boxW = metrics.width + pad * 2;
    const boxH = parseInt(ctx.font, 10) + pad * 1.2;
    ctx.fillRect(targetW - boxW - pad, targetH - boxH - pad, boxW, boxH);
    ctx.fillStyle = "#000";
    ctx.fillText(
      opts.watermark,
      targetW - boxW - pad + pad,
      targetH - pad - pad * 0.2
    );
  }
  try {
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return src;
  }
}

async function readExifOrientation(src: string): Promise<number> {
  try {
    const res = await fetch(src, { mode: "cors" });
    const buf = await res.arrayBuffer();
    const view = new DataView(buf);
    if (view.getUint16(0) !== 0xffd8) return 1;
    let offset = 2;
    while (offset < view.byteLength) {
      if (view.getUint16(offset) === 0xffe1) {
        const exifLength = view.getUint16(offset + 2);
        const exifStart = offset + 4;
        if (
          view.getUint32(exifStart) === 0x45786966 &&
          view.getUint16(exifStart + 4) === 0x0000
        ) {
          const tiffOffset = exifStart + 6;
          const endian = view.getUint16(tiffOffset);
          const little = endian === 0x4949;
          if (endian !== 0x4949 && endian !== 0x4d4d) return 1;
          const get16 = (o: number) =>
            little ? view.getUint16(o, true) : view.getUint16(o, false);
          const get32 = (o: number) =>
            little ? view.getUint32(o, true) : view.getUint32(o, false);
          const firstIFDOffset = get32(tiffOffset + 4);
          if (firstIFDOffset < 8) return 1;
          const ifdStart = tiffOffset + firstIFDOffset;
          const entries = get16(ifdStart);
          for (let i = 0; i < entries; i++) {
            const entryOffset = ifdStart + 2 + i * 12;
            const tag = get16(entryOffset);
            if (tag === 0x0112) return get16(entryOffset + 8);
          }
        }
        offset += 2 + exifLength;
      } else if (view.getUint16(offset) === 0xffda) {
        break;
      } else {
        offset += 2 + view.getUint16(offset + 2);
      }
    }
  } catch {}
  return 1;
}

function applyExifTransform(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number
) {
  switch (orientation) {
    case 2:
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(0, -height);
      break;
    case 7:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(width, -height);
      ctx.scale(-1, 1);
      break;
    case 8:
      ctx.rotate(-0.5 * Math.PI);
      ctx.translate(-width, 0);
      break;
    default:
      break;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function buildHTML(
  r: HandoverReport,
  photosOverride?: string[],
  lang: "ro" | "en" = "ro"
) {
  const descriere = r.notes?.trim()
    ? esc(r.notes.trim())
    : "[Marca, modelul, seria, culoarea, starea etc.]";
  const staffText = (r.staff && r.staff.trim()) || "(staff member)";

  const bodyRO = `
    <h2 style="margin:0 0 6px;font-size:13px">Declarație pe propria răspundere</h2>
    <p>Subsemnatul(a) <strong>${esc(
      r.fullName
    )}</strong>, cunoscând prevederile Codului penal în materia falsului, uzului de fals și a înșelăciunii, revendic pe propria răspundere bunul aferent tichetului nr. <strong>${esc(
    r.coatNumber
  )}</strong> cu următoarele caracteristici: <strong>${descriere}</strong>, fără prezentarea tichetului primit la predare, întrucât declar că l-am pierdut.</p>
    <p>Sunt de acord cu fotografierea actului meu de identitate, a mea și a bunului revendicat pe propria răspundere și sunt de acord cu prelucrarea și păstrarea datelor mele personale pe o perioadă de 3 ani de la data de azi.</p>
    <p>Predarea se face strict pe răspunderea mea și în baza declarațiilor mele.</p>
    <p>Aceasta este declarația pe care o dau, o semnez și o susțin în fața lui <strong>${esc(
      staffText
    )}</strong>, reprezentant al Zebra Music Production s.r.l..</p>
  `;

  const bodyEN = `
    <h2 style="margin:8px 0 6px;font-size:13px">Self-Declaration</h2>
    <p>I, <strong>${esc(
      r.fullName
    )}</strong>, being aware of the provisions of the Criminal Code regarding forgery, use of forgery and fraud, claim, on my own responsibility, the item corresponding to ticket no. <strong>${esc(
    r.coatNumber
  )}</strong> with the following characteristics: <strong>${descriere}</strong>, without presenting the ticket received at deposit, as I declare I have lost it.</p>
    <p>I agree to the photographing of my identity document, myself, and the claimed item on my own responsibility, and I agree to the processing and storage of my personal data for a period of 3 years from today.</p>
    <p>The handover is made strictly under my responsibility and based on my statements.</p>
    <p>This is the statement that I make, sign, and uphold in the presence of <strong>${esc(
      staffText
    )}</strong>, representative of Zebra Music Production S.R.L.</p>
  `;

  const imgs = photosOverride ?? r.photos ?? [];
  const shown = imgs.slice(0, 4);
  const extraCount = Math.max(0, imgs.length - shown.length);
  const photos = shown.length
    ? `<div class="photos-box box photos-count-${
        shown.length
      }">\n        <div class="photos-heading">Fotografii / Photos</div>\n        <div class="grid !grid-cols-2">\n          ${shown
        .map((p, i) => `<img src="${p}" alt="photo-${i}" />`)
        .join("")}\n        </div>\n        ${
        extraCount
          ? `<div class="muted" style="margin-top:6px">+${extraCount} alte fotografii / more photos</div>`
          : ""
      }\n      </div>`
    : `<div class="photos-box box no-photos"><div class="muted">(Fără fotografii / No photos)</div></div>`;

  let phoneField = "";
  if (r.phone) {
    phoneField = `<span class="field"><span class="label">Telefon / Phone</span><span>${esc(
      r.phone
    )}`;
    if (r.phoneVerified) {
      phoneField +=
        ' <span style="color:green;font-size:10px;margin-left:4px;font-weight:600;">(Verified)</span>';
    }
    phoneField += "</span></span>";
  }

  const declarationBlock = lang === "ro" ? bodyRO : bodyEN;
  const title =
    lang === "ro" ? "Proces-verbal de predare-primire" : "Handover Statement";

  return `
    <div class="single-page-grid">\n      <div class="text-section">\n        <div class="header header-inline">\n          <span class="company">S.C. ZEBRA MUSIC PRODUCTION S.R.L.</span>\n          <span class="sep">|</span>\n          <span class="muted small">CUI: RO45474152&nbsp;|&nbsp;J04/75/2022</span>\n          <span class="sep">|</span>\n          <span class="muted small">Tel: 0751292540</span>\n        </div>\n        <h1>${title}</h1>\n        <div class="row row-duo">\n          <span class="field"><span class="label">Data / Date</span><strong>${new Date(
    r.createdAt
  ).toLocaleString()}</strong></span>\n          <span class="field"><span class="label">Tichet / Ticket</span><strong>${esc(
    r.coatNumber
  )}</strong></span>\n        </div>\n        <div class="row row-multi">\n          <span class="field"><span class="label">Nume / Name</span><strong>${esc(
    r.fullName
  )}</strong></span>\n          ${phoneField}\n          ${
    r.email
      ? `<span class=\"field\"><span class=\"label\">Email</span><span>${esc(
          r.email
        )}</span></span>`
      : ""
  }\n        </div>\n        ${
    r.eventName || r.eventId
      ? `<div class=\"row\"><span class=\"label\">Eveniment / Event</span><span>${esc(
          r.eventName || r.eventId || ""
        )}</span></div>`
      : ""
  }\n        ${
    r.staff
      ? `<div class=\"row\"><span class=\"label\">Personal / Staff</span><span>${esc(
          r.staff
        )}</span></div>`
      : ""
  }\n        <div class="box decl-box">${declarationBlock}</div>\n        <div class="signature-line"><span class="sig-label">Semnătură / Signature + Bon/Tag</span><div class="sig-box"></div></div>\n      </div>\n      <div class="photos-section">${photos}</div>\n    </div>\n  `;
}

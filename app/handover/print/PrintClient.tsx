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

  // Load report: prefer sessionStorage, fallback to API
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

  // Optimize photos (downscale for PDF speed, increase visual size later with CSS)
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!data?.photos?.length) {
        setOptimizedPhotos(null);
        return;
      }
      const outs = await Promise.all(
        data.photos.map((p) => downscaleImage(p, 1600, 1600, 0.85))
      );
      if (!cancelled) setOptimizedPhotos(outs);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [data?.photos]);

  const html = useMemo(
    () => (data ? buildHTML(data, optimizedPhotos ?? undefined) : ""),
    [data, optimizedPhotos]
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
  }, [data]);

  // Detect mode from query param and trigger appropriate action
  useEffect(() => {
    const usp = new URLSearchParams(window.location.search);
    setShouldOpenPdf(usp.get("open") === "pdf");
    setShouldAutoPrint(usp.get("auto") === "1" || usp.get("auto") === "true");
  }, []);

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
      <div className="flex items-center justify-between gap-4 print:hidden mb-4">
        <Link
          href="/handover"
          className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
        >
          ← Back to Handover
        </Link>
        <div className="flex items-center gap-2">
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
  @page { size: A4; margin: 10mm; }
  /* Light theme base */
  body, .print-light { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#fff; color:#111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-light { line-height:1.45; }
  h1{ font-size:20px; margin:0 0 10px; font-weight:700; letter-spacing:.5px; }
  h2{ font-size:14px; margin:10px 0 6px; font-weight:600; }
  .header{ margin-bottom:10px; padding:6px 8px; background:#f7f7f9; border:1px solid #e2e2e6; border-radius:6px; }
  .header .company{ font-weight:700; font-size:13px; }
  .row{ margin:4px 0; font-size:12px; }
  .label{ display:inline-block; min-width:120px; color:#333; font-weight:500; }
  .box{ border:1px solid #e2e2e6; background:#fcfcfd; border-radius:10px; padding:10px 12px; margin-top:12px; box-shadow:0 0 0 1px #fff inset; }
  .box p{ margin:6px 0; }
  .box p + p{ margin-top:8px; }
  .muted{ color:#555; }
  .divider{ height:1px; background:linear-gradient(90deg,#e5e5e9,#f7f7f9 40%,#e5e5e9); margin:14px 0; }
  .grid{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:8px }
  img{ width:100%; height:120px; object-fit:cover; border-radius:8px; border:1px solid #ddd; background:#fafafa; }
  .photos-heading{ font-size:12px; font-weight:600; letter-spacing:.5px; text-transform:uppercase; margin-bottom:4px; color:#222; }
  /* Force 12px body text but allow larger headings to remain readable */
  .pdf-mode, .pdf-mode * { font-size:12px !important; }
  .pdf-mode h1, .pdf-mode h2 { font-size: inherit !important; } /* Will reset below */
  @media print { body, body :not(h1):not(h2):not(h3) { font-size:12px !important; } }
  /* Reapply heading sizes after global 12px clamp */
  @media print { h1{ font-size:20px !important; } h2{ font-size:14px !important; } }
  .pdf-mode h1{ font-size:20px !important; } .pdf-mode h2{ font-size:14px !important; }
  /* Improve paragraph readability */
  .print-light p{ line-height:1.5; }
  /* Bilingual separation */
  .box h2 + p{ margin-top:4px; }
  /* Images and grid for print */
  @media print {
    .grid{ grid-template-columns: repeat(2, minmax(0,1fr)); }
    img{ height:170px; }
    /* Hide any global navigation / headers when printing this page */
    nav, header { display:none !important; }
  }
  /* Images and grid for generated PDF */
  .pdf-mode .grid{ grid-template-columns: repeat(2, minmax(0,1fr)); }
  .pdf-mode img{ height:170px; }
`;

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function downscaleImage(
  src: string,
  maxW: number,
  maxH: number,
  quality: number
): Promise<string> {
  const img = await loadImage(src);
  const ratio = Math.min(1, maxW / img.width, maxH / img.height);
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0, w, h);
  try {
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    // If canvas is tainted or serialization fails, fall back to original
    return src;
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

function buildHTML(r: HandoverReport, photosOverride?: string[]) {
  const descriere = r.notes?.trim()
    ? esc(r.notes.trim())
    : "[Marca, modelul, seria, culoarea, starea etc.]";

  const staffText = (r.staff && r.staff.trim()) || "(staff member)";
  const bodyRO = `
    <h2 style="margin:0 0 6px;font-size:16px">Declarație pe propria răspundere</h2>
    <p>Subsemnatul(a) <strong>${esc(
      r.fullName
    )}</strong>, cunoscând prevederile Codului penal în materia falsului, uzului de fals și a înșelăciunii, revendic pe propria răspundere bunul aferent tichetului nr. <strong>${esc(
    r.coatNumber
  )}</strong> cu următoarele caracteristici: <strong>${descriere}</strong>, fără prezentarea tichetului primit la predare, întrucât declar că l-am pierdut.</p>
    <p>Sunt de acord cu fotografierea actului meu de identitate, a mea și a bunului revendicat pe propria răspundere și sunt de acord cu prelucrarea și păstrarea datelor mele personale pe o perioadă de 3 ani de la data de azi.</p>
    <p>Predarea se face strict pe răspunderea mea și în baza declarațiilor mele.</p>
    <p>Aceasta este declarația pe care o dau, o semnez și o susțin în fața domnului <strong>${esc(
      staffText
    )}</strong>, reprezentant al Zebra Music Production s.r.l..</p>
  `;

  const bodyEN = `
    <h2 style="margin:8px 0 6px;font-size:16px">Self-Declaration</h2>
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
    ? `<div class="box"><div class="muted">Fotografii / Photos</div>
        <div class="grid">
          ${shown.map((p, i) => `<img src="${p}" alt="photo-${i}" />`).join("")}
        </div>${
          extraCount
            ? `<div class="muted" style="margin-top:4px">+${extraCount} alte fotografii / more photos</div>`
            : ""
        }
      </div>`
    : "";

  return `
    <div class="header">
      <div class="company">S.C. ZEBRA MUSIC PRODUCTION S.R.L.</div>
      <div class="muted">CUI: RO45474152 | J04/75/2022</div>
      <div class="muted">Tel: 0751292540</div>
    </div>
    <h1>Proces-verbal de predare-primire / Handover Statement</h1>
    <div class="row"><span class="label">Data / Date</span><strong>${new Date(
      r.createdAt
    ).toLocaleString()}</strong></div>
    <div class="row"><span class="label">Tichet / Ticket</span><strong>${esc(
      r.coatNumber
    )}</strong></div>
    <div class="row"><span class="label">Nume / Name</span><strong>${esc(
      r.fullName
    )}</strong></div>
    ${
      r.staff
        ? `<div class="row"><span class="label">Personal / Staff</span><span>${esc(
            r.staff
          )}</span></div>`
        : ""
    }
    ${
      r.phone
        ? `<div class="row"><span class="label">Telefon / Phone</span><span>${esc(
            r.phone
          )}</span></div>`
        : ""
    }
    ${
      r.email
        ? `<div class="row"><span class="label">Email</span><span>${esc(
            r.email
          )}</span></div>`
        : ""
    }
    <div class="box">${bodyRO}${bodyEN}</div>
    ${photos}
    <div class="row" style="margin-top:18px">
      <div class="label">Semnătură / Signature</div>
      <div style="display:inline-block;min-width:300px;border-bottom:1px solid #ddd;line-height:40px"></div>
    </div>
  `;
}

import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UploadCloud, Image as ImageIcon, CheckCircle2, AlertTriangle, ChevronRight, X } from "lucide-react";
import OcrVerificationModal from "@/components/imports/OcrVerificationModal";
import { useSubscription } from "@/hooks/useSubscription";
import FeatureGate from "@/components/billing/FeatureGate";

// Monotonic id for queue items (stable across re-renders).
let uid = 0;

export default function OcrDropzone({ athleteId, onSaved }) {
  const inputRef = useRef(null);
  // Each item: { id, name, image_url?, status: uploading|reading|ready|saved|error, parsed?, error? }
  const [queue, setQueue] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const { plan } = useSubscription();

  async function processFile(file) {
    const id = ++uid;
    setQueue((q) => [...q, { id, name: file.name, status: "uploading" }]);
    try {
      const upload = await base44.integrations.Core.UploadFile({ file });
      const image_url = upload?.file_url;
      if (!image_url) throw new Error("Upload failed — no file URL returned.");
      setQueue((q) => q.map((it) => (it.id === id ? { ...it, image_url, status: "reading" } : it)));
      const res = await base44.functions.invoke("parseWorkoutScreenshot", { image_url });
      const parsed = res?.data;
      if (!parsed) throw new Error("OCR returned no data.");
      setQueue((q) => q.map((it) => (it.id === id ? { ...it, parsed, status: "ready" } : it)));
    } catch (e) {
      setQueue((q) => q.map((it) => (it.id === id ? { ...it, status: "error", error: e?.message || "Failed" } : it)));
    }
  }

  function handleFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    // OCR each independently in parallel; the queue updates as each resolves.
    list.forEach(processFile);
  }

  const activeItem = queue.find((it) => it.id === activeId) || null;

  function handleModalClose() {
    setActiveId(null);
  }

  function handleModalSaved() {
    if (activeId) setQueue((q) => q.map((it) => (it.id === activeId ? { ...it, status: "saved" } : it)));
    onSaved?.();
    setActiveId(null);
  }

  function dismissItem(id) {
    setQueue((q) => q.filter((it) => it.id !== id));
    if (activeId === id) setActiveId(null);
  }

  return (
    <FeatureGate feature="ocr_import" plan={plan}>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-heading">Quick OCR Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-accent/40 transition-colors p-6 flex flex-col items-center justify-center text-center gap-2 min-h-[150px]"
          >
            <UploadCloud className="w-6 h-6 text-muted-foreground" />
            <p className="text-sm font-medium">Drop workout screenshots</p>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> Select multiple images — each is OCRed and queued for review
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {queue.length > 0 && (
            <div className="space-y-1.5">
              {queue.map((it) => (
                <div key={it.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs">
                  <ImageIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1" title={it.name}>{it.name}</span>
                  {it.status === "uploading" && <span className="text-muted-foreground">Uploading…</span>}
                  {it.status === "reading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                  {it.status === "ready" && (
                    <button onClick={() => setActiveId(it.id)} className="text-primary inline-flex items-center gap-0.5 hover:underline">
                      Review <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                  {it.status === "saved" && (
                    <span className="inline-flex items-center gap-1 text-accent-emerald">
                      <CheckCircle2 className="w-3.5 h-3.5" /> saved
                    </span>
                  )}
                  {it.status === "error" && (
                    <span className="inline-flex items-center gap-1 text-destructive" title={it.error}>
                      <AlertTriangle className="w-3 h-3" /> error
                    </span>
                  )}
                  {it.status !== "uploading" && it.status !== "reading" && (
                    <button onClick={() => dismissItem(it.id)} className="text-muted-foreground hover:text-foreground ml-1" aria-label="Dismiss">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {activeItem && (
        <OcrVerificationModal
          key={activeItem.id}
          open
          image_url={activeItem.image_url}
          parsed={activeItem.parsed}
          athleteId={athleteId}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
        />
      )}
    </FeatureGate>
  );
}
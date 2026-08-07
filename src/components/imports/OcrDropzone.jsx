import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UploadCloud, Image as ImageIcon } from "lucide-react";
import OcrVerificationModal from "@/components/imports/OcrVerificationModal";

export default function OcrDropzone({ athleteId, onSaved }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null); // { image_url, parsed }

  async function handleFile(file) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      // 1. Upload the screenshot to the platform file store.
      const upload = await base44.integrations.Core.UploadFile({ file });
      const image_url = upload?.file_url;
      if (!image_url) throw new Error("Upload failed — no file URL returned.");

      // 2. Run the vision OCR pass backend-side.
      const res = await base44.functions.invoke("parseWorkoutScreenshot", { image_url });
      const parsed = res?.data;
      if (!parsed) throw new Error("OCR returned no data.");
      setPreview({ image_url, parsed });
    } catch (e) {
      setError(e?.message || "Failed to parse screenshot.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-heading">Quick OCR Import</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-accent/40 transition-colors p-6 flex flex-col items-center justify-center text-center gap-2 min-h-[150px]"
          >
            {busy ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Reading screenshot…</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-6 h-6 text-muted-foreground" />
                <p className="text-sm font-medium">Drop a workout screenshot</p>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> Vision OCR extracts the metrics for you to verify
                </p>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {preview && (
        <OcrVerificationModal
          open
          image_url={preview.image_url}
          parsed={preview.parsed}
          athleteId={athleteId}
          onClose={() => setPreview(null)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
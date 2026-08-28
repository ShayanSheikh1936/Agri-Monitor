import { useRef, useState } from "react";
import { ImagePlus, Loader2, ScanSearch, TriangleAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { analyzeAndSaveCropImage } from "../../services/timelineGenerator";

// =============================================================================
// Crop Image Analysis — reuse of the existing base64 storage pattern and the
// existing AI backend. Flow: validate file → downscale → image record +
// context + AI → validated structured analysis → persisted → displayed.
// =============================================================================

const MAX_FILE_BYTES = 10 * 1024 * 1024; // same 10 MB cap as the chatbot
const MAX_DIMENSION = 768; // keeps base64 well under the Firestore doc cap

const URGENCY_STYLES = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

// Downscale to JPEG so the stored base64 fits Firestore's 1 MiB doc limit.
function fileToDownscaledBase64(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(
          1,
          MAX_DIMENSION / Math.max(img.width, img.height)
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        reject(new Error("The image could not be processed."));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unsupported or corrupted image file."));
    };
    img.src = url;
  });
}

function Section({ label, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-black/45">
        {label}
      </p>
      <ul className="mt-0.5 grid gap-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-[12px] leading-4 text-black/70">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CropImageAnalysis({ crop, uid, cropId, onAnalyzed }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null); // local object URL only
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    setError(null);
    setResult(null);

    if (!selected) return;

    // ---- Validation: file type / size / unsupported image ----
    if (!selected.type || !selected.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG or WebP).");
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError("Image size must be less than 10 MB.");
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function handleAnalyze() {
    if (!file || busy) return;
    if (!uid || !cropId) {
      setError("You must be signed in with a crop selected.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const base64 = await fileToDownscaledBase64(file);
      const outcome = await analyzeAndSaveCropImage(uid, cropId, {
        imageBase64: base64,
        userNotes: notes.trim() || null,
      });
      if (!outcome.ok) {
        throw new Error(outcome.error?.message ?? "Image analysis failed.");
      }
      setResult(outcome.analysis);
      onAnalyzed?.(); // refresh the recommendations card
    } catch (err) {
      setError(err.message ?? "Image analysis failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setNotes("");
    setError(null);
    setResult(null);
  }

  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <ImagePlus size={16} className="text-[var(--text1)]" />
          Crop Image Analysis
          {result && (
            <Badge
              variant="secondary"
              className={`ml-auto ${URGENCY_STYLES[result.urgency] ?? ""}`}
            >
              urgency: {result.urgency ?? "unknown"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Preview / empty state */}
        {preview ? (
          <img
            src={preview}
            alt="Selected crop"
            className="w-full max-h-44 rounded-xl border border-[var(--text1)]/30 object-cover"
          />
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="grid place-items-center gap-1 rounded-xl border border-dashed border-[var(--text1)]/50 bg-[#D7E8C0]/30 px-3 py-6 text-center cursor-pointer hover:bg-[#D7E8C0]/50 transition-colors"
          >
            <ScanSearch size={22} className="text-[var(--text1)]" />
            <span className="text-[13px] font-semibold text-black/60">
              Upload a crop photo
            </span>
            <span className="text-[11px] text-black/45">
              JPG / PNG / WebP · max 10 MB
            </span>
          </button>
        )}

        {preview && !result && (
          <>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                Change
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset} disabled={busy}>
                Remove
              </Button>
            </div>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Optional: describe what you see (e.g. yellow leaves since fertilizing)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none rounded-xl border border-black/15 bg-white px-3 py-2 text-[13px] text-black outline-none focus:border-[var(--text1)]"
            />
            <Button size="sm" onClick={handleAnalyze} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <ScanSearch size={14} /> Analyze with AI
                </>
              )}
            </Button>
          </>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-600">
            {error}
          </p>
        )}

        {/* Structured analysis result */}
        {result && (
          <div className="grid gap-2 rounded-xl bg-[#D7E8C0]/40 px-3 py-2">
            <div className="grid gap-1">
              <p className="text-[12px] text-black/70">
                <span className="font-semibold text-black">Identified: </span>
                {result.identifiedCrop ?? "cannot determine confidently"}
                {typeof result.confidence === "number" &&
                  ` (~${Math.round(result.confidence * 100)}% confidence)`}
              </p>
              {result.possibleIssue && (
                <p className="text-[12px] text-black/70">
                  <span className="font-semibold text-black">Possible issue: </span>
                  {result.possibleIssue}
                </p>
              )}
            </div>
            <Section label="Observations" items={result.observations} />
            <Section label="Possible causes" items={result.possibleCauses} />
            <Section label="Recommended actions" items={result.recommendedActions} />
            <Section label="Prevention" items={result.prevention} />

            {result.needsExpertReview && (
              <p className="flex items-start gap-1.5 rounded-lg bg-amber-100/70 px-2 py-1.5 text-[11px] leading-4 text-amber-800">
                <TriangleAlert size={13} className="mt-0.5 shrink-0" />
                Evidence is limited — please confirm with a local agricultural
                expert before acting on this analysis.
              </p>
            )}

            <p className="text-[11px] text-black/45">
              AI interpretation of a single photo — likely indicators only,
              not a confirmed diagnosis.
            </p>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Analyze another photo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

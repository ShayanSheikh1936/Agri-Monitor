import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { Send, Paperclip, Mic, Square, X, Loader2 } from "lucide-react";
import { MESSAGE_TYPES } from "@/services/agriDoctorService";
import useVoiceRecorder from "./useVoiceRecorder";
import { cn } from "@/lib/utils";

// Shared composer for the consultation thread — text, compressed image and
// voice note. `onSend({ type, text?, mediaData?, mediaMime?, durationMs? })`
// must return a Promise. Reused verbatim by the farmer page and the doctor
// console; both use the same brand-green accent as the rest of the app.

const MAX_IMAGE_BASE64 = 900_000; // keep well under Firestore's 1MB/doc cap

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

export default function ChatComposer({
  onSend,
  disabled = false,
  placeholder = "Describe your crop issue…",
  disabledPlaceholder = "Consultation closed",
}) {
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState(null); // { dataUrl, name }
  const [imageBusy, setImageBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const recorder = useVoiceRecorder();

  const sendAccent = "bg-[#679936] hover:bg-[#4a7028] text-white";
  const iconBtn =
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] text-black/60 transition-colors hover:bg-black/5 hover:text-black cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  const busy = sending || imageBusy || recorder.processing;
  const canSend = !disabled && !busy && !recorder.recording && (text.trim().length > 0 || !!pendingImage);

  const handlePickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setImageBusy(true);
    setError("");
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 900,
        useWebWorker: true,
      });
      const dataUrl = await fileToDataUrl(compressed);
      if (typeof dataUrl === "string" && dataUrl.length > MAX_IMAGE_BASE64) {
        setError("That image is still too large after compression. Try a smaller one.");
        return;
      }
      setPendingImage({ dataUrl, name: file.name });
    } catch {
      setError("Could not process that image.");
    } finally {
      setImageBusy(false);
    }
  };

  const startVoice = () => {
    setError("");
    recorder.startRecording((clip) => {
      if (!clip) return; // cancelled or failed — recorder.error explains it
      if (disabled) return;
      setSending(true);
      Promise.resolve(
        onSend({
          type: MESSAGE_TYPES.VOICE,
          mediaData: clip.dataUrl,
          mediaMime: clip.mime,
          durationMs: clip.durationMs,
        })
      )
        .catch(() => setError("Could not send the voice note."))
        .finally(() => setSending(false));
    });
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError("");
    const body = text.trim();
    try {
      if (body) {
        await onSend({ type: MESSAGE_TYPES.TEXT, text: body });
        setText("");
      }
      if (pendingImage) {
        await onSend({
          type: MESSAGE_TYPES.IMAGE,
          mediaData: pendingImage.dataUrl,
          mediaMime: "image/jpeg",
        });
        setPendingImage(null);
      }
    } catch {
      setError("Message failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const shownError = error || recorder.error;

  return (
    <div className="grid gap-2">
      {/* Recording bar */}
      {recorder.recording && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
          <span className="text-[13px] font-semibold text-red-700">
            Recording… {Math.floor(recorder.elapsedMs / 1000)}s / {recorder.maxDurationMs / 1000}s
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={recorder.cancelRecording}
              className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-black/60 hover:bg-black/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={recorder.stopRecording}
              className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
            >
              <Square size={12} /> Stop &amp; send
            </button>
          </div>
        </div>
      )}

      {/* Pending image preview */}
      {pendingImage && (
        <div className="flex w-fit items-center gap-2 rounded-xl bg-black/5 px-2 py-2">
          <img src={pendingImage.dataUrl} alt="Attachment preview" className="h-12 w-12 rounded-lg object-cover" />
          <span className="max-w-[150px] truncate text-[12px] text-black/60">{pendingImage.name}</span>
          <button
            type="button"
            onClick={() => setPendingImage(null)}
            aria-label="Remove attachment"
            className="text-black/40 hover:text-black transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {shownError && (
        <p role="alert" className="text-[12px] font-semibold text-red-600">
          {shownError}
        </p>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePickImage} />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || busy || recorder.recording}
          aria-label="Attach image"
          title="Attach image"
          className={iconBtn}
        >
          {imageBusy ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
        </button>

        <button
          type="button"
          onClick={recorder.recording ? recorder.stopRecording : startVoice}
          disabled={disabled || busy || !recorder.supported}
          aria-label={recorder.recording ? "Stop recording" : "Record voice note"}
          title={recorder.supported ? "Voice note" : "Voice recording unsupported"}
          className={cn(iconBtn, recorder.recording && "border-red-300 bg-red-50 text-red-600")}
        >
          {recorder.recording ? <Square size={16} /> : <Mic size={18} />}
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled || busy || recorder.recording}
          placeholder={disabled ? disabledPlaceholder : placeholder}
          maxLength={1000}
          className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-card px-3 text-[14px] text-black outline-none transition-colors placeholder:text-black/35 focus:border-[#679936] focus:ring-2 focus:ring-[#679936]/20 disabled:opacity-50"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
            sendAccent
          )}
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}

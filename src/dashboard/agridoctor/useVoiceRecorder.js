import { useCallback, useEffect, useRef, useState } from "react";

// In-browser voice-note recorder (MediaRecorder -> base64 data URL).
//
// Why the caps exist: Firestore documents are limited to 1MB, and a data URL
// inflates binary by ~33%. A 32kbps mono opus/webm clip is ~4KB/s, so a 60s
// note is ~240KB raw / ~320KB base64 — comfortably inside the limit. The
// MAX_BASE64_CHARS guard is the hard backstop so an oversized clip can never
// be written (which would fail the whole message send).

const MAX_DURATION_MS = 60_000;
const MAX_BASE64_CHARS = 900_000;
const BITRATE = 32_000;

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported?.(m)) ?? "";
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(blob);
  });
}

export default function useVoiceRecorder({ maxDurationMs = MAX_DURATION_MS } = {}) {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const onStopRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Unmount mid-recording: release the mic so the browser indicator clears.
  useEffect(
    () => () => {
      clearTimer();
      try {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      } catch {
        /* ignore */
      }
      stopTracks();
    },
    [clearTimer, stopTracks]
  );

  const finish = useCallback(
    async (blob) => {
      clearTimer();
      stopTracks();
      setRecording(false);
      setElapsedMs(0);

      const cb = onStopRef.current;
      onStopRef.current = null;
      if (!cb) return; // cancelled — discard the clip

      const durationMs = Math.min(Date.now() - startedAtRef.current, maxDurationMs);
      if (!blob || blob.size === 0) {
        cb(null);
        return;
      }

      setProcessing(true);
      try {
        const dataUrl = await blobToDataUrl(blob);
        if (typeof dataUrl === "string" && dataUrl.length > MAX_BASE64_CHARS) {
          setError("Voice note is too large — please record a shorter clip.");
          cb(null);
        } else {
          setError("");
          cb({ dataUrl, mime: blob.type || "audio/webm", durationMs });
        }
      } catch {
        setError("Could not process the recording.");
        cb(null);
      } finally {
        setProcessing(false);
      }
    },
    [clearTimer, stopTracks, maxDurationMs]
  );

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      try {
        recorder.stop(); // fires onstop -> finish
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Starts recording. `onStop(clip|null)` is called once when it ends (manual
  // stop, the duration cap, or a cancel). Returns true when recording began.
  const startRecording = useCallback(
    async (onStop) => {
      setError("");
      if (!supported) {
        setError("Voice recording is not supported in this browser.");
        return false;
      }
      if (recording) return false;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mimeType = pickMimeType();
        const options = { audioBitsPerSecond: BITRATE };
        if (mimeType) options.mimeType = mimeType;

        const recorder = new MediaRecorder(stream, options);
        recorderRef.current = recorder;
        chunksRef.current = [];
        onStopRef.current = typeof onStop === "function" ? onStop : null;

        recorder.ondataavailable = (e) => {
          if (e.data?.size) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const type = recorder.mimeType || mimeType || "audio/webm";
          finish(new Blob(chunksRef.current, { type }));
        };

        startedAtRef.current = Date.now();
        recorder.start();
        setRecording(true);
        setElapsedMs(0);

        clearTimer();
        timerRef.current = setInterval(() => {
          const el = Date.now() - startedAtRef.current;
          setElapsedMs(el);
          if (el >= maxDurationMs) stopRecording(); // auto-stop at the cap
        }, 200);

        return true;
      } catch (e) {
        setError(
          e?.name === "NotAllowedError"
            ? "Microphone access was denied. Enable it to send voice notes."
            : "Could not start recording."
        );
        stopTracks();
        setRecording(false);
        return false;
      }
    },
    [supported, recording, finish, clearTimer, stopTracks, maxDurationMs, stopRecording]
  );

  const cancelRecording = useCallback(() => {
    onStopRef.current = null; // discard
    chunksRef.current = [];
    stopRecording();
  }, [stopRecording]);

  return {
    recording,
    elapsedMs,
    processing,
    error,
    supported,
    maxDurationMs,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError: () => setError(""),
  };
}

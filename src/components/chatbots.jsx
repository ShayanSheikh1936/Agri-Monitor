import {
  ChevronRight,
  Globe,
  LanguagesIcon,
  Maximize,
  Minimize,
  Plus,
  Search,
  Send,
  Sprout,
  ImagePlus,
  X,
} from "lucide-react";

import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useMemo, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { cropKey, formatPlantAge } from "../lib/cropUtils";
import {
  buildChatCropContextPrompt,
  buildLocalCropContext,
} from "../services/aiContextBuilder";
import styles from "./chatbots.module.css";

// Max send attempts — transient network drops ("Failed to fetch") are retried
// instead of failing the whole conversation on the first glitch.
const MAX_ATTEMPTS = 3;

// Compress before upload — raw photos (often 5–10 MB, ~13 MB as base64)
// exceed serverless body limits and drop mid-upload. A 1280px JPEG keeps
// plenty of detail for crop-disease vision analysis. Same library already
// used by personalinfo.jsx.
async function compressImage(file) {
  try {
    return await imageCompression(file, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      initialQuality: 0.8,
    });
  } catch {
    return file; // compression failed — fall back to the original file
  }
}

// fetch() with a hard timeout so a hung request can never freeze the chat.
function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

// Human-readable chat error instead of raw browser messages.
function friendlyErrorMessage(err) {
  if (err?.name === "AbortError") {
    return "The AI server took too long to respond (request timed out). Please try again — smaller images work best.";
  }
  if (err instanceof TypeError) {
    return "Could not reach the AI server (network error). Please check your connection and try again.";
  }
  // The backend proxy echoes its own upstream failures verbatim, so the raw
  // body text is usually meaningless to the user ("Provider returned error").
  // Translate the HTTP status into something actionable instead.
  switch (err?.status) {
    case 429:
      return "The AI service is busy or its quota is used up (rate limit). Please try again in a few minutes.";
    case 401:
    case 403:
      return "The AI service rejected its own credentials. This needs a backend fix.";
    case 402:
      return "The AI service has run out of paid credits. This needs a backend fix.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "The AI service is temporarily unavailable. Please try again shortly.";
    default:
      break;
  }
  return err?.message || "Unable to connect to the server.";
}

export default function Chatbot({ userinfo, crops }) {
  const [show, setshow] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [langValue, setlangValue] = useState("English");
  const [showfeatures, setshowfeatures] = useState(false);
  const [Langshow, setLangshow] = useState(false);
  
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: `Assalamualaikum! Me aapka Agri Assistant hun. Fasal, khaad ya bimari ke bare me poochen 😊`,
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Image states
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Crop-profile selection — null means "general agriculture", where no crop
  // context is added and the request stays exactly as it was before.
  const [selectedCropKey, setSelectedCropKey] = useState(null);
  const [showCropMenu, setShowCropMenu] = useState(false);
  const [cropSearch, setCropSearch] = useState("");

  const chatContainerRef = useRef(null);
  const imageInputRef = useRef(null);
  const featuresRef = useRef(null);
  const cropMenuRef = useRef(null);

  const lanuages = [
    {
      code: "en",
      name: "English",
    },
    {
      code: "hi",
      name: "Urdu",
    },
    {
      code: "mr",
      name: "Chinese",
    },
    {
      code: "bn",
      name: "bengali",
    },
    {
      code: "ml",
      name: "japnese",
    },
    {
      code: "te",
      name: "Turkeyish",
    },
    {
      code: "kn",
      name: "Arabic",
    },
    {
      code: "pa",
      name: "Mongolia",
    },
    {
      code: "gu",
      name: "korean",
    },
    {
      code: "or",
      name: "Hindi",
    },
  ];

  // ------------------------------------
  // Crop profile selection
  // ------------------------------------
  // Memoised so the derived options below keep stable dependencies even when
  // the parent re-renders with a fresh `crops` array literal.
  const cropList = useMemo(() => (Array.isArray(crops) ? crops : []), [crops]);

  // Resolved from the stored KEY, never the array index, so the selection
  // survives a crop being deleted or reordered. A key whose crop is gone
  // resolves to null → silently back to general mode: no stale chip and no
  // chance of answering about the wrong crop.
  const selectedCrop = selectedCropKey
    ? cropList.find((c, i) => cropKey(c, i) === selectedCropKey) ?? null
    : null;

  const cropOptions = useMemo(() => {
    const term = cropSearch.trim().toLowerCase();
    return cropList
      .map((crop, index) => ({ crop, index, key: cropKey(crop, index) }))
      .filter(({ crop }) =>
        term ? (crop.CropName || "").toLowerCase().includes(term) : true
      );
  }, [cropList, cropSearch]);

  // Built synchronously from the crop entry the dashboard already fetched —
  // no Firestore read, so picking a crop is instant and can never fail while
  // the farmer is typing (the reply must not depend on extra lookups).
  const cropContext = useMemo(
    () => (selectedCrop ? buildLocalCropContext(selectedCrop) : null),
    [selectedCrop]
  );

  // Opens the picker from the "+" menu (only one popover visible at a time).
  const toggleCropMenu = () => {
    setshowfeatures(false);
    setCropSearch("");
    setShowCropMenu((open) => !open);
  };

  // key === null selects "General agriculture" (no crop context attached).
  const selectCrop = (key) => {
    setSelectedCropKey(key);
    setShowCropMenu(false);
    setCropSearch("");
  };

  // Clicking outside closes the picker. The "+" wrapper is excluded so its own
  // toggle handler stays in charge of that button.
  useEffect(() => {
    if (!showCropMenu) return undefined;
    const onPointerDown = (event) => {
      const insideMenu = cropMenuRef.current?.contains(event.target);
      const insideToggle = featuresRef.current?.contains(event.target);
      if (!insideMenu && !insideToggle) setShowCropMenu(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showCropMenu]);

  // ------------------------------------
  // Auto scroll
  // ------------------------------------
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, show, loading]);

  // ------------------------------------
  // Cleanup image preview URL
  // ------------------------------------
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // ------------------------------------
  // Convert image to Base64
  // ------------------------------------
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result);
      };

      reader.onerror = () => {
        reject(new Error("Unable to read image."));
      };

      reader.readAsDataURL(file);
    });
  };

  // ------------------------------------
  // Select image
  // ------------------------------------
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image.");
      return;
    }

    // 10 MB maximum
    if (file.size > 10 * 1024 * 1024) {
      alert("Image size must be less than 10MB.");
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setSelectedImage(file);
    setImagePreview(previewUrl);

    setshowfeatures(false);
    setShowCropMenu(false);

    // Same image dobara select karne ke liye
    e.target.value = "";
  };

  // ------------------------------------
  // Remove selected image
  // ------------------------------------
  const removeSelectedImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview(null);
  };

  // ------------------------------------
  // Send message
  // ------------------------------------
  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || loading) {
      return;
    }

    const prompt = input.trim();

    const currentImage = selectedImage;
    const currentImagePreview = imagePreview;

    const userText =
      prompt ||
      "Please analyze this image and identify any crop disease, pest, nutrient deficiency, or other agricultural issue.";

    // The bubble below shows what the farmer typed; the REQUEST carries the
    // selected crop's profile embedded in the prompt. The backend contract is
    // fixed ({prompt, lang, image, location}), so crop context can only travel
    // inside `prompt`. With no crop selected the builder returns userText
    // unchanged, so the body stays byte-identical to plain general chat.
    const finalPrompt = buildChatCropContextPrompt(cropContext, userText, {
      hasImage: Boolean(currentImage),
    });

    // Snapshot of the crop this question was asked about, stored ON the
    // message so the bubble stays correctly labelled even if the farmer
    // switches crops (or removes the chip) before the reply arrives.
    const cropLabel = selectedCrop
      ? {
          name: selectedCrop.CropName || "Selected crop",
          age: formatPlantAge(selectedCrop),
        }
      : null;

    // ------------------------------------
    // Show user message immediately
    // ------------------------------------
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: userText,
        image: currentImagePreview || null,
        crop: cropLabel,
      },
    ]);

    // ------------------------------------
    // Clear UI
    // ------------------------------------
    setInput("");

    setSelectedImage(null);
    setImagePreview(null);

    setLoading(true);

    // Image analysis takes much longer on the server than plain text —
    // give it a bigger timeout window.
    const timeoutMs = currentImage ? 90_000 : 45_000;

    try {
      // ------------------------------------
      // Compress image, then convert to Base64
      // ------------------------------------
      let imageBase64 = null;

      if (currentImage) {
        const compressed = await compressImage(currentImage);
        imageBase64 = await fileToBase64(compressed);
      }

      // ------------------------------------
      // API URL
      // ------------------------------------
      const apiUrl = import.meta.env.VITE_API_URL;

      if (!apiUrl) {
        throw new Error(
          "VITE_API_URL is missing. Check your .env.local file."
        );
      }

      // Build location safely — never send "undefined undefined"
      const locationParts = [
        userinfo?.personaluser?.City,
        userinfo?.personaluser?.Country,
      ].filter(Boolean);

      // ------------------------------------
      // Send JSON to Netlify Function (timeout + retry on network glitches)
      // ------------------------------------
      const requestBody = JSON.stringify({
        prompt: finalPrompt,
        lang: langValue,
        image: imageBase64,
        location: locationParts.join(" ") || null,
      });

      let lastError = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const res = await fetchWithTimeout(
            apiUrl,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: requestBody,
            },
            timeoutMs
          );

          // ------------------------------------
          // Read response safely
          // ------------------------------------
          const responseText = await res.text();

          let data;

          try {
            data = JSON.parse(responseText);
          } catch {
            throw new Error(
              "Server returned invalid JSON: " +
                responseText.substring(0, 300)
            );
          }

          // ------------------------------------
          // API error — no point retrying these
          // ------------------------------------
          if (!res.ok) {
            // Carry the HTTP status so friendlyErrorMessage can distinguish a
            // provider rate limit from a gateway outage or a real API message.
            const apiError = new Error(
              data.error || `AI service returned HTTP ${res.status}.`
            );
            apiError.status = res.status;
            throw apiError;
          }

          // ------------------------------------
          // AI response
          // ------------------------------------
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              text: data.reply || "No response received from AI.",
            },
          ]);
          lastError = null;
          break;
        } catch (err) {
          lastError = err;

          // Only network-level failures (TypeError: Failed to fetch) and
          // timeouts are worth retrying — server rejections are not.
          const transient =
            err?.name === "AbortError" || err instanceof TypeError;

          if (!transient || attempt === MAX_ATTEMPTS) break;

          await new Promise((r) => setTimeout(r, 700 * attempt));
        }
      }

      if (lastError) throw lastError;
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: friendlyErrorMessage(err),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      
      {!show && (
        <div className="fixed bottom-2 right-2 flex flex-col z-1000">
          <div className="flex w-full justify-end">
            <button
              onClick={() => setshow(true)}
              className="p-1 border-2 border-[var(--text1)] cursor-pointer bg-[var(--bg)] w-15 h-15 rounded-full grid place-items-center"
            >
              <img
                className="w-14"
                src="/logo1.svg"
                alt=""
              />
            </button>
          </div>
        </div>
      )}

    
      <div
        className={`fixed bottom-5 right-0 ${maximized ? "w-full h-full p-2 sm:p-4" : "w-fit"}`}
        style={{
          transition: "1s ease-in-out",
          maxWidth: maximized ? "100%" : "450px",
          margin: maximized ? "0" : "10px auto",
          borderRadius: "10px",
          padding: maximized ? "0" : "10px",
          transform: `translateX(${show ? "0" : "100%"})`,
          zIndex: show ? "10000" : "0",
        }}
      >
        {/* Header */}
        <div className="bg-[var(--text1)] rounded-[5px] flex justify-between items-center px-2 py-2">
          <div className="flex justify-center items-center gap-2">
            <div className="bg-[var(--bg)] rounded-full p-1.5 flex gap-1">
              <Sprout
                color={"var(--text1)"}
                size={28}
              />
            </div>

            <div className="text-2xl bebas-neue-regular">
              Agri Assistant
            </div>
          </div>

          <div className="flex gap-1">
            <button
              title={maximized ? "Restore" : "Maximize"}
              onClick={() => setMaximized(!maximized)}
              className="cursor-pointer bg-[var(--bg)] rounded-full p-1.5"
            >
              {maximized ? <Minimize color={"var(--text1)"} /> : <Maximize color={"var(--text1)"} />}
            </button>

            <button
              title="close"
              onClick={() => setshow(false)}
              className="cursor-pointer bg-[var(--bg)] rounded-full p-1.5"
            >
              <ChevronRight color={"var(--text1)"} />
            </button>
          </div>
        </div>

        
        <div
          ref={chatContainerRef}
          className="border-l-2 border-r-2 border-[var(--text1)] scrollbar-thumb-amber-50 rounded-t-[5px]"
          style={{
            height: maximized ? "calc(100dvh - 190px)" : "350px",
            overflowY: "auto",
            padding: "10px",
            background: "var(--bg)",
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent:
                  msg.role === "user"
                    ? "end"
                    : "start",
                margin: "10px 0",
                gap: "5px",
                flexDirection:
                  msg.role === "user"
                    ? "row-reverse"
                    : "",
              }}
            >
              {/* Avatar */}
              <span className="w-9 h-9 rounded-full grid place-items-center">
                <img
                  src={
                    msg.role === "user"
                      ? "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                      : "/logo1.svg"
                  }
                  alt=""
                />
              </span>

              {/* Message Bubble */}
              <span
                style={{
                  background:
                    msg.role === "user"
                      ? "#007bff"
                      : "#e9ecef",

                  color:
                    msg.role === "user"
                      ? "white"
                      : "black",

                  padding: "8px 12px",
                  borderRadius: "15px",
                  maxWidth: "70%",
                  display: "flex",
                  gap: "5px",
                  fontSize: "16px",
                  textWrap: "wrap",
                  overflowX: "hidden",
                }}
              >
                <div className="flex flex-col gap-2">
                  {/* Which crop profile this message was asked about */}
                  {msg.crop && (
                    <span
                      className={`${styles.msgCrop} ${
                        msg.role === "user" ? styles.msgCropUser : ""
                      }`}
                    >
                      <Sprout size={11} className="shrink-0" />
                      <span className="truncate max-w-[150px]">
                        {msg.crop.name}
                        {msg.crop.age ? ` · ${msg.crop.age}` : ""}
                      </span>
                    </span>
                  )}

                  {/* Uploaded image */}
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Uploaded"
                      className="w-[60px] h-[60px] rounded-lg object-cover border border-white/40"
                    />
                  )}

                  {/* Message text */}
                  {msg.text && (
                    <div className={styles.markdown}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </span>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full grid place-items-center">
                <img src="/logo1.svg" alt="" />
              </div>

              <div className="flex gap-2">
                <span className="w-2 h-2 bg-[var(--text1)] rounded-full" />
                <span className="w-2 h-2 bg-[var(--text1)] rounded-full" />
                <span className="w-2 h-2 bg-[var(--text1)] rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-[var(--bg)] border-l-2 border-r-2 border-b-2 border-[var(--text1)] rounded-b-[5px] px-1 flex flex-col">
          {/* Selected crop profile chip */}
          {selectedCrop && (
            <div className="px-2 pt-2 pb-1 flex items-center gap-2 flex-wrap">
              <span className={styles.cropChip}>
                <Sprout size={13} color="var(--text1)" className="shrink-0" />
                <span className="truncate max-w-[120px]">
                  {selectedCrop.CropName || "Selected crop"}
                </span>
                {formatPlantAge(selectedCrop) && (
                  <span className="text-[11px] font-normal text-black/55 whitespace-nowrap">
                    {formatPlantAge(selectedCrop)}
                  </span>
                )}
                <button
                  type="button"
                  title="Remove crop profile"
                  onClick={() => selectCrop(null)}
                  className={styles.cropChipRemove}
                >
                  <X size={11} />
                </button>
              </span>

              <span className="text-[11px] text-black/55">
                Answers will use this crop profile
              </span>
            </div>
          )}

          {/* Selected image preview */}
          {imagePreview && (
            <div className="px-2 pt-2 pb-1 flex items-center gap-2">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Selected"
                  className="w-[60px] h-[60px] object-cover rounded-lg border-2 border-[var(--text1)]"
                />

                <button
                  type="button"
                  onClick={removeSelectedImage}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center cursor-pointer"
                >
                  ×
                </button>
              </div>

              <span className="text-sm text-black">
                Image attached
              </span>
            </div>
          )}

          <div className="pb-2 px-1 flex w-full">
            {/* Hidden image input */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: "none" }}
            />

            {/* Features */}
            <div
              ref={featuresRef}
              className="mr-1 rounded-full bg-[var(--text1)] grid place-items-center h-10 w-10 relative inline-block"
            >
              <button
                onClick={() => {
                  setShowCropMenu(false);
                  setshowfeatures(!showfeatures);
                }}
                className="grid place-items-center h-10 w-10 cursor-pointer"
              >
                <Plus size={28} color="white" />
              </button>

              <div
                className={`${styles.features} scrollbar-thumb-[var(--text1)] scrollbar-thin`}
                style={{
                  visibility: showfeatures
                    ? "visible"
                    : "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={toggleCropMenu}
                  className="cursor-pointer px-3 py-1 capitalize text-nowrap flex gap-1"
                >
                  <Sprout color="var(--text1)" />
                  Select Crop
                </button>

                <button
                  type="button"
                  onClick={() =>
                    imageInputRef.current?.click()
                  }
                  className="cursor-pointer px-3 py-1 capitalize text-nowrap flex gap-1"
                >
                  <ImagePlus color="var(--text1)" />
                  Upload Image
                </button>
              </div>

              {/* Crop profile picker */}
              {showCropMenu && (
                <div
                  ref={cropMenuRef}
                  className={styles.cropMenu}
                >
                  <div className={styles.cropMenuHead}>
                    <p className="text-[13px] font-bold text-black leading-4">
                      Select crop profile
                    </p>
                    <p className="mt-0.5 text-[11px] text-black/60 leading-4">
                      AI answers will use this crop's recorded data
                    </p>

                    <div className={styles.cropSearch}>
                      <Search
                        size={13}
                        color="rgba(0,0,0,0.4)"
                        className="shrink-0"
                      />
                      <input
                        type="text"
                        value={cropSearch}
                        onChange={(e) => setCropSearch(e.target.value)}
                        placeholder="Search crops…"
                        className={styles.cropSearchInput}
                      />
                    </div>
                  </div>

                  <div
                    className={`${styles.cropList} scrollbar-thin scrollbar-thumb-[var(--text1)]`}
                  >
                    {/* General mode — always offered, even with zero crops */}
                    <button
                      type="button"
                      onClick={() => selectCrop(null)}
                      className={`${styles.cropItem} ${selectedCrop ? "" : styles.cropItemActive}`}
                    >
                      <span className={styles.cropAvatar}>
                        <Globe size={15} color="var(--text1)" />
                      </span>
                      <span className="flex flex-col leading-tight min-w-0 flex-1">
                        <span className="text-[13px] font-semibold text-black truncate">
                          General agriculture
                        </span>
                        <span className="text-[11px] text-black/50">
                          No crop profile attached
                        </span>
                      </span>
                    </button>

                    {cropOptions.map(({ crop, index, key }) => {
                      const active = key === selectedCropKey;
                      const ageLabel = formatPlantAge(crop);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => selectCrop(key)}
                          className={`${styles.cropItem} ${active ? styles.cropItemActive : ""}`}
                        >
                          <span className={styles.cropAvatar}>
                            {crop.cropImage ? (
                              <img
                                src={crop.cropImage}
                                alt={crop.CropName || "Crop"}
                              />
                            ) : (
                              <span className="text-[12px] font-bold text-[var(--text1)]">
                                {(crop.CropName || "C").charAt(0).toUpperCase()}
                              </span>
                            )}
                          </span>

                          <span className="flex flex-col leading-tight min-w-0 flex-1">
                            <span className="text-[13px] font-semibold text-black truncate">
                              {crop.CropName || `Crop ${index + 1}`}
                            </span>
                            <span className="text-[11px] text-black/50 truncate">
                              {ageLabel ?? "Age unknown"}
                            </span>
                          </span>

                          {active && (
                            <Sprout
                              size={14}
                              color="var(--text1)"
                              className="shrink-0"
                            />
                          )}
                        </button>
                      );
                    })}

                    {cropOptions.length === 0 && (
                      <p className={styles.cropEmpty}>
                        No crop matches “{cropSearch.trim()}”
                      </p>
                    )}
                  </div>

                  {/* Reuses the existing add-crop page — no new flow */}
                  <Link
                    to="/dashboard/addnewcrop"
                    onClick={() => setShowCropMenu(false)}
                    className={styles.cropMenuFoot}
                  >
                    <Plus size={14} /> Add new crop
                  </Link>
                </div>
              )}
            </div>

            {/* Text input */}
            <input
              type="text"
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Write a Message"
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "50px",
                border: "none",
                color: "black",
                background: "white",
                outline: "none",
              }}
            />

            {/* Language */}
            <div className="ml-1 rounded-full bg-[var(--text1)] grid place-items-center h-10 w-10 relative inline-block">
              <button
                onClick={() =>
                  setLangshow(!Langshow)
                }
                className="grid place-items-center h-10 w-10 cursor-pointer"
              >
                <LanguagesIcon color="white" />
              </button>

              <div
                className={`${styles.lang} scrollbar-thumb-[var(--text1)] scrollbar-thin`}
                style={{
                  visibility: Langshow
                    ? "visible"
                    : "hidden",
                }}
              >
                {lanuages.map((value) => {
                  return (
                    <input
                      key={value.code}
                      type="button"
                      onClick={() =>
                        setlangValue(value.name)
                      }
                      className={`cursor-pointer ${value.name === langValue
                          ? "bg-[var(--text1)]"
                          : ""
                        } px-3 py-1 capitalize`}
                      value={value.name}
                    />
                  );
                })}
              </div>
            </div>

            {/* Send */}
            <button
              onClick={sendMessage}
              disabled={
                loading ||
                (!input.trim() && !selectedImage)
              }
              className="h-10 w-10 rounded-full bg-[var(--text1)] flex items-center justify-center disabled:opacity-50"
              style={{
                marginLeft: "5px",
              }}
            >
              <Send size={22} />
            </button>
          </div>

          <div className="text-center text-[13px] text-black">
            Agri Monitor AI can make mistakes
          </div>
        </div>
      </div>
    </>
  );
}

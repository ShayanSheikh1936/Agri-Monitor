import {
  ChevronRight,
  LanguagesIcon,
  Maximize,
  Minimize,
  Plus,
  Send,
  Sprout,
  ImagePlus,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useRef, useEffect } from "react";
import imageCompression from "browser-image-compression";
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
  return err?.message || "Unable to connect to the server.";
}

export default function Chatbot({ userinfo }) {
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

  const chatContainerRef = useRef(null);
  const imageInputRef = useRef(null);

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

    // ------------------------------------
    // Show user message immediately
    // ------------------------------------
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: userText,
        image: currentImagePreview || null,
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
        prompt: userText,
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
            throw new Error(data.error || "Something went wrong.");
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
            <div className="mr-1 rounded-full bg-[var(--text1)] grid place-items-center h-10 w-10 relative inline-block">
              <button
                onClick={() =>
                  setshowfeatures(!showfeatures)
                }
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
                  onClick={() =>
                    imageInputRef.current?.click()
                  }
                  className="cursor-pointer px-3 py-1 capitalize text-nowrap flex gap-1"
                >
                  <ImagePlus color="var(--text1)" />
                  Upload Image
                </button>
              </div>
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

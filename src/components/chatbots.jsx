import {
  ChevronRight,
  LanguagesIcon,
  Maximize,
  Plus,
  Send,
  Sprout,
  ImagePlus,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./chatbots.module.css";

export default function Chatbot({ userinfo }) {
  const [show, setshow] = useState(false);
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

    try {
      // ------------------------------------
      // Convert image to Base64
      // ------------------------------------
      let imageBase64 = null;

      if (currentImage) {
        imageBase64 = await fileToBase64(currentImage);
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

      // console.log("API URL:", apiUrl);

      // ------------------------------------
      // Send JSON to Netlify Function
      // ------------------------------------
      const res = await fetch(apiUrl, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          prompt: userText,
          lang: langValue,
          image: imageBase64,
          location: userinfo?.personaluser?.City+" "+userinfo?.personaluser?.Country 
        }),
      });

      // ------------------------------------
      // Read response safely
      // ------------------------------------
      const responseText = await res.text();

      // console.log("API status:", res.status);
      // console.log("API response:", responseText);

      let data;

      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        throw new Error(
          "Server returned invalid JSON: " +
          responseText.substring(0, 300)
        );
      }

      // ------------------------------------
      // API error
      // ------------------------------------
      if (!res.ok) {
        throw new Error(
          data.error || "Something went wrong."
        );
      }

      // ------------------------------------
      // AI response
      // ------------------------------------
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text:
            data.reply ||
            "No response received from AI.",
        },
      ]);
    } catch (err) {
      // console.error("Chat error:", err);

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text:
            err.message ||
            "Unable to connect to the server.",
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
        className="fixed bottom-5 right-0 w-fit"
        style={{
          transition: "1s ease-in-out",
          maxWidth: "450px",
          margin: "10px auto",
          borderRadius: "10px",
          padding: "10px",
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
            <Link
              title="Maximize"
              to="/"
              className="cursor-pointer bg-[var(--bg)] rounded-full p-1.5"
            >
              <Maximize color={"var(--text1)"} />
            </Link>

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
            height: "350px",
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
            <button
              onClick={() =>
                setshowfeatures(!showfeatures)
              }
              className="mr-1 rounded-full bg-[var(--text1)] grid place-items-center h-10 w-10 relative inline-block cursor-pointer"
            >
              <Plus size={28} color="white" />

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
            </button>

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
            <button
              onClick={() =>
                setLangshow(!Langshow)
              }
              className="ml-1 rounded-full bg-[var(--text1)] grid place-items-center h-10 w-10 relative inline-block cursor-pointer"
            >
              <LanguagesIcon color="white" />

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
            </button>

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

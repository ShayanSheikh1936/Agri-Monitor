import { ChevronLeft, ChevronRight, Languages, LanguagesIcon, Maximize, Send, Sprout } from 'lucide-react';
import { useState, useRef, useEffect, use } from 'react';
import {Link} from "react-router-dom"
import styles from "./chatbots.module.css"
export default function Chatbot({userinfo}) {
  const [show, setshow] = useState(false);
  const [langValue, setlangValue] = useState("English");
  

  const [Langshow, setLangshow] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: `Assalamualaikum! Me aapka Agri Assistant hun. Fasal, khaad ya bimari ke bare me poochen 😊` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const lang = useRef(null);

  function lang_func() {
    setLangshow(!Langshow)
  }
  // Auto scroll ke liye ref definition
  const chatContainerRef = useRef(null);

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
    }

  ]
  // Messages update hone par auto bottom scroll logic
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, show, loading]);

  const sendMessage = async () => {
  if (!input.trim() || loading) return;

  const prompt = input.trim();

  setMessages((prev) => [...prev, { role: "user", text: prompt }]);
  setInput("");
  setLoading(true);

  try {
    const res = await fetch(import.meta.env.VITE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        lang: langValue,
      }),
    });

    const data = await res.json();

    // console.log("Status:", res.status);
    // console.log("Response:", data);

    if (!res.ok) {
      throw new Error(data.error || "Something went wrong.");
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        text: data.reply || "No response received from AI.",
      },
    ]);
  } catch (err) {
    console.error(err);

    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        text: err.message || "Unable to connect to the server.",
      },
    ]);
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      <div className='fixed bottom-2 right-2 flex flex-col z-1000 ' >
        <div className='flex w-full justify-end '>
          <button onClick={() => setshow(true)} className='p-1 border-2 border-[var(--text1)] cursor-pointer bg-[var(--bg)] w-15 h-15 rounded-full grid place-items-center'><img className='w-14' src="/logo1.svg" alt="" /></button>
        </div>
      </div>
      <div className='fixed bottom-15 right-0 w-fit' style={{ transition: "1s ease-in-out", maxWidth: '450px', margin: '10px auto', borderRadius: '10px', padding: '10px', transform: `translateX(${show ? '0' : '100%'})`, zIndex: `${show ? "10000" : "0"}` }}>
        <div className='bg-[var(--text1)]  rounded-[5px] flex justify-between items-center px-2 py-2'>
          <div className='flex justify-center items-center gap-2'>
            <div className='bg-[var(--bg)] rounded-full p-1.5 flex gap-1'><Sprout color={"var(--text1)"} size={28} /></div>
            <div className='text-2xl bebas-neue-regular'>Agri Assistant</div>
          </div>
          <div className='flex gap-1'>
            <Link title='Maximize' to="/" className='cursor-pointer bg-[var(--bg)] rounded-full p-1.5'><Maximize color={"var(--text1)"} /> </Link>
            <button title='close' onClick={() => setshow(false)} className='cursor-pointer bg-[var(--bg)] rounded-full p-1.5'><ChevronRight color={"var(--text1)"} /></button>
          </div>
        </div>

        <div ref={chatContainerRef} className='border-l-2 border-r-2 border-[var(--text1)] scrollbar-thumb-amber-50 rounded-t-[5px]' style={{ height: '350px', overflowY: 'auto', padding: '10px', background: "var(--bg)" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.role === 'user' ? 'end' : 'start',
              margin: '10px 0',
              gap: "5px",
              flexDirection: msg.role === 'user' ? 'row-reverse' : ''
            }}>
              <span className='w-9 h-9 rounded-full  grid place-items-center'><img src={msg.role === "user" ? "https://cdn-icons-png.flaticon.com/512/149/149071.png" : "logo1.svg"} alt="" /></span>
              <span style={{
                background: msg.role === 'user' ? '#007bff' : '#e9ecef',
                color: msg.role === 'user' ? 'white' : 'black',
                padding: '8px 12px',
                borderRadius: '15px',
                maxWidth: '70%',
                display: "flex",
                gap: "5px",
                fontSize: "16px"
              }}>
                <span>{msg.text}</span>
              </span>
            </div>
          ))}
          {loading && <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-full grid place-items-center'><img src="logo1.svg" alt="" /></div>
            <div className='flex gap-2'><span className="w-2 h-2 bg-[var(--text1)] rounded-full "></span><span className="w-2 h-2 bg-[var(--text1)] rounded-full "></span><span className="w-2 h-2 bg-[var(--text1)] rounded-full "></span></div>
          </div>}
        </div>

        <div className='bg-[var(--bg)] border-l-2 border-r-2 border-b-2 border-[var(--text1)] rounded-b-[5px]  px-1 flex flex-col' >
          <div className='pb-2 px-1 flex'>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Fasal ke bare me poochen..."
              style={{ flex: 1, padding: '10px', borderRadius: '50px', color: "black", background: "white", outline: "none" }}
            />
            <button onClick={() => setLangshow(!Langshow)} className=' ml-1 rounded-full bg-[var(--text1)] grid place-items-center h-10 w-10 relative inline-block cursor-pointer'><LanguagesIcon color={"white"} /> <div className={`${styles.lang} scrollbar-thumb-[var(--text1)] scrollbar-thin`} style={{ visibility: `${Langshow ? "visible" : " hidden"}` }}>
              {
                lanuages.map((value) => {
                  return <input key={value.code} type="button" onClick={() => setlangValue(value.name)} className={`cursor-pointer ${value.name === langValue ? "bg-[var(--text1)]" : ""} px-3 py-1 capitalize`} value={value.name} />
                })
              }
            </div></button>
            <button
              onClick={sendMessage}
              disabled={loading}
              className='h-10 w-10 rounded-full bg-[var(--text1)] flex items-center justify-center'
              style={{ marginLeft: '5px', }}
            >
              <Send size={22} />
            </button>
          </div>
          <div className='text-center text-[13px] text-black '>Agri Monitor AI can make mistakes</div>
        </div>
      </div>
    </>
  );
}
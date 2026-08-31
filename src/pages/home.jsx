import Navbar, { Navbar2 } from "../components/navbar";
import styles from "./home.module.css"
import video1 from "../assets/video1.mp4"
import background3 from "../assets/background3.png"
import background1 from "../assets/background1.png"
import { DetailsBox } from "../components/section2box";
import { CalendarDays, Droplet, Send, Sprout } from "lucide-react";
import { useEffect, useState } from "react";
import Chatbot from "../components/chatbots";
import BlogSec from "../components/blogsec";
import Footer from "../components/footer";
import { ref, set } from "firebase/database";
import { db } from "../features/auth/firebase";
import { Fragment } from "react";
// import Chatbot from "../components/chaimport Beimport BlogSec from "../components/blogsec";
export default function Home() {
    function verifyDatabase() {
  const testRef = ref(db, 'connection_test');
  
  set(testRef, {
    status: "online",
    verifiedAt: Date.now(),
    message: "Agri-Monitor database is working!",
    name:"shayan sheikh"
  })
  .then(() => {
    console.log("Success! Data stored successfully.");
  })
  .catch((error) => {
    console.error("Database error occurred: ", error);
  });
}



    const [show, setshow] = useState(false)

    function handlenavbar() {
        if (window.scrollY < 1200) {
            setshow(false)
        }
        else {
            setshow(true)
        }
    }
    useEffect(() => {
        window.addEventListener("scroll", handlenavbar)
    }, [])


    const data = [
        {
            id: 1,
            title: "Smart Irrigation Tracking",
            icon: <Droplet className="w-10 h-10 text-white" />,
            list: [
                {
                    listHeading: "Automated Watering Schedules:",
                    listText: " Get precise daily water volume recommendations tailored to your crop’s current growth stage and local weather conditions."
                },
                {
                    listHeading: "Prevents Over/Under-Watering:",
                    listText: " Protect your roots and conserve water resources effortlessly."
                },
            ]
        },
        {
            id: 2,
            title: "Precision Nutrient & Plans",
            icon: <Sprout className="w-10 h-10 text-white" />,
            list: [
                {
                    listHeading: "Optimal Timing:",
                    listText: " Know the exact calendar dates to apply Nitrogen, Phosphorus, Potassium, and micronutrients."
                },
                {
                    listHeading: "Right Dosage:",
                    listText: " Receive exact chemical and fertilizer quantities per acre/hectare to avoid soil degradation and maximize yield."
                },
            ]
        },
        {
            id: 3,
            title: "Harvest Countdown & Timeline",
            icon: <CalendarDays className="w-10 h-10 text-white" />,
            list: [
                {
                    listHeading: "Real-Time Stage Monitoring:",
                    listText: " Track progress through germination, vegetative, flowering, and maturity phases."
                },
                {
                    listHeading: "Estimated Harvest Date:",
                    listText: " Plan labor, storage, and market sales ahead of time with accurate AI maturity forecasts."
                },
            ]
        },

    ]
    const data2 = [
        {
            id: 1,
            title: "AI Plant Scan",
            para: "Snap a photo to instantly detect diseases, pests, and nutrient deficiencies.",
        },
        {
            id: 2,
            title: "Smart Irrigation",
            para: "Get daily exact water volume recommendations based on weather and soil.",
        },
        {
            id: 3,
            title: "Growth Timeline",
            para: "Track crop stages from germination to harvest with dynamic completion dates.",
        },
        {
            id: 4,
            title: "Weather Alerts",
            para: "Receive rain and humidity warnings before applying sprays or fertilizer.",
        },
        {
            id: 5,
            title: "Early Threat Prevent",
            para: "Get community and regional alerts for incoming pest outbreaks.",
        },
        {
            id: 6,
            title: "Cost & ROI Tracking",
            para: "Monitor input costs versus estimated crop market value in real time.",
        }
    ]
    return (
        <>
            {show && <Navbar2 />}
            {/* <Navbar /> */}
            <header className="h-screen w-full">
                <video autoPlay muted className="object-cover w-full h-full opacity-50" >
                    <source src={video1} type="video/mp4" />
                </video>
                <div className=" absolute top-1/5 flex transform -translate-x-1/2 left-1/2 w-full items-center justify-between">
                    <div className="ml-4 md:w-1/2 flex flex-col gap-9 md:gap-5">
                        <p className="text-2xl text-[var(--text-h)] mt-2 font-sans text-wrap ">Pakistan #1 Agricultural Monitoring Platform</p>
                        <h1 className="lg:text-9xl lg:w-fit font-bold text-[var(--text-h)] bebas-neue-regular md:text-8xl w-100 text-7xl  ">AI Powered Agricultural Monitoring</h1>
                    </div>
                    <div className="lg:w-fit lg:place-items-center lg:w-1/2 md:w-72 md:grid lg:grid  max-w-md mr-2 hidden">
                        {/* <h1 className="text-7xl font-bold text-white bebas-neue-regular">Welcome to Agrimonitor</h1>
                        <p className="text-lg text-white mt-2">Your one-stop solution for all your agricultural needs</p> */}
                        <img src="logo1.svg" alt="" />
                    </div>
                </div>
            </header>
            <section className="w-full bg-[#F2DEC4] flex flex-col gap-10 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${background3})`, backgroundSize: "1500px 1000px" }}>
                <div className="flex flex-col gap-3">
                    <div className="bg-[#679936] w-fit text-[var(--text-h)] p-5 pr-12 tracking-wider mt-4 text-3xl lg:text-5xl md:text-5xl bebas-neue-regular rounded-r-full">Optimize Resource Management</div>
                    <p className="lg:w-1/2 md:w-3/4 w-fit  text-black pl-5 font-sans text-1xl">Take the guesswork out of farming. By simply selecting your crop and entering your planting date, our smart engine calculates exactly what your field needs—day by day, start to harvest.</p>
                </div>
                <div className="flex gap-3 flex-nowrap overflow-x-auto scrollbar-none pt-14 pb-10 ml-1 mr-1">
                    {
                        data.map((value) => {

                            return <Fragment key={value.id}><DetailsBox icons={value.icon} headings={value.title} lists={value.list} /></Fragment>
                        })
                    }
                </div>
            </section>
            <section className="w-full bg-cover bg-center bg-no-repeat flex flex-col gap-5 items-center px-5" style={{ background: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${background1}) center center/cover fixed` }}>
                <div className="flex flex-col gap-3 pt-10 items-center">
                    <div className="text-6xl bebas-neue-regular">THE FEATURES OF AI AGRICULTURE</div>
                    <div className="text-center w-1/2 font-sans tracking-wider">The features of AI agriculture is here. With Agrimonitor, you can take control of your agricultural operations and maximize your yield. Experience the future of agriculture today.</div>
                </div>
                <div className="w-full flex justify-between pb-3 ">
                    <div className="flex flex-col gap-5">
                        {
                            data2.filter((value) => value.id < 4).map((e) => {
                                return (<div key={e.id} className="w-60 bg-[#F2DEC4] rounded-2xl flex flex-col gap-2 p-1">
                                    <h2 className="text-center text-black text-3xl bebas-neue-regular border-b-1">{e.title}</h2>
                                    <p className="text-center font-sans text-black">{e.para}</p>
                                </div>
                                )
                            })
                        }
                    </div>
                    <div className="flex justify-center items-center"><img src="/logo1.png" alt="" width={"400px"} /></div>
                    <div className="flex flex-col gap-5">
                        {
                            data2.filter((value) => value.id > 3).map((e) => {
                                return (<div key={e.id} className="w-60 bg-[#F2DEC4] rounded-2xl flex flex-col gap-2 p-1">
                                    <h2 className="text-center text-black text-3xl bebas-neue-regular border-b-1 ">{e.title}</h2>
                                    <p className="text-center font-sans text-black">{e.para}</p>
                                </div>
                                )
                            })
                        }
                    </div>
                </div>
            </section>
            <BlogSec/> 
        </>
    )
}
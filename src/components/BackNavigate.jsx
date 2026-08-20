import { ChevronLeft } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import styles from "./backnavigate.module.css"
export default function Backnavigate({href="/"}){

    const [tooltip , settooltip] = useState(false)
    return(
        <><div className={`w-screen flex items-center `} ><Link to={href} onMouseEnter={()=>settooltip(true)} onMouseLeave={()=> settooltip(false)} className={`float-left rounded-full bg-[var(--text1)] w-13 h-13 grid place-items-center m-3  `}><ChevronLeft size="35"/> </Link> {tooltip && <p className={`text-white tracking-tighter font-semimedium font-sans bg-[var(--text1)] px-2 py-2 relative GotoHome ${styles.GotoHome}`}>Go to Home page</p>} </div></>
    )
}
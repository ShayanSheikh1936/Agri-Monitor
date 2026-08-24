import { useEffect, useRef, useState } from "react";
import logo from "../assets/logo.svg";
import styles from "./navbar.module.css"
import Submenu from "./submenu";
import background1 from "../assets/background1.png"
import video1 from "../assets/video1.mp4"
import { ChevronDown } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
export default function Navbar() {
    const showMenu = useRef(null);
    const [show, setShow] = useState(false);
    
    useEffect(() => {
        showMenu.current.addEventListener("mouseover", () => {
            setShow(true)
            document.querySelector(".arrow-down").style.transform = "rotate(180deg)"
        })
        showMenu.current.addEventListener("mouseout", () => {
            setShow(false)
            document.querySelector(".arrow-down").style.transform = "rotate(0deg)"
        })
    })
    return (
        <>
            <nav className="absolute top-0 w-full pl-4 flex justify-between items-center z-100" >
                <div className="logo flex items-center justify-center bg-[#F2DEC4] rounded-b-full px-1"><img src="logo1.svg" alt="agrimonitor" width={105} height={105} /></div>
                <div><ul className={`flex gap-8 ${styles.navlists} items-center text-[var(--bg)]`} >
                    <li className={`${styles.navList}  py-7 before:bg-[var(--bg)]`} ><NavLink className={({isActive})=> isActive ? `${styles.Activenav} py-7 before:bg-[var(--bg)]`:""} to="/">Home</NavLink></li>
                    <li ref={showMenu} className={`${styles.navList} navList py-7 before:bg-[var(--bg)] relative flex gap-1 items-center`}><p>Services</p>  <p className="arrow-down"><ChevronDown /></p>{show && <Submenu />}</li>
                    <li className={`${styles.navList} py-7 before:bg-[var(--bg)]`}><NavLink className={({isActive})=> isActive ? `${styles.Activenav} py-7 before:bg-[var(--bg)]`:""} to="/features">Features</NavLink></li>
                    <li className={`${styles.navList}  py-7  before:bg-[var(--bg)]`}><NavLink className={({isActive})=> isActive ? `${styles.Activenav} py-7 before:bg-[var(--bg)]`:""} to="/blogs">Blogs </NavLink></li>
                    <li className={`${styles.navList}  py-7 before:bg-[var(--bg)]`}><NavLink className={({isActive})=> isActive ? `${styles.Activenav} py-7 before:bg-[var(--bg)]`:""} to="/contact">Contact Us</NavLink></li>
                </ul></div>
                <div><ul className="flex gap-4 min-w-max bg-[#F2DEC4] pl-5 pt-5 pb-5 pr-2 rounded-l-full items-center">
                    <Link to="/login" className={`${styles.login} login grid place-items-center`}><p>Login</p></Link>
                    <Link to="/signup" className={`${styles.signUp} signUp grid place-items-center`}><p>Sign Up</p></Link>
                </ul></div>
            </nav>
            
        </>
    )
}

export function Navbar2() {
    const showMenu = useRef(null);
    const [show, setShow] = useState(false);
    useEffect(() => {
        showMenu.current.addEventListener("mouseover", () => {
            setShow(true)
            ChevronDown.style.transform = "rotate(180deg)"
        })
        showMenu.current.addEventListener("mouseout", () => {
            setShow(false)
            ChevronDown.style.transform = "rotate(0deg)"
        })
    })
    return (
        <>
            <nav className="backdrop-blur-[5px] fixed top-0 w-full pl-4 flex justify-between items-center z-100" >
                <div className="logo flex items-center justify-center bg-[#F2DEC4] rounded-b-full px-1"><img src="logo1.svg" alt="agrimonitor" width={105} height={105} /></div>
                <div><ul className={`flex gap-8 ${styles.navlists} `} >
                    <li className={`${styles.navList}  py-7  before:bg-white`} ><NavLink className={({isActive}) => isActive ? `${styles.Activenav} py-7 before:bg-white`: ""} to="/">Home</NavLink></li>
                    <li ref={showMenu} className={`${styles.navList} before:bg-white navList py-7 relative flex gap-1 items-center`}><p>Services</p>  <p className="arrow-down"><ChevronDown /></p>{show && <Submenu />}</li>
                    <li className={`${styles.navList}  py-7  before:bg-white`}><NavLink className={({isActive}) => isActive ? `${styles.Activenav} py-7 before:bg-white`: ""} to="/features">Features</NavLink></li>
                    <li className={`${styles.navList}  py-7 flex gap-1 items-center before:bg-white`}><NavLink className={({isActive}) => isActive ? `${styles.Activenav} py-7 before:bg-white`: ""} to="/blogs">Blogs </NavLink><ChevronDown /></li>
                    <li className={`${styles.navList}  py-7  before:bg-white`}><NavLink className={({isActive}) => isActive ? `${styles.Activenav} py-7 before:bg-white`: ""} to="/contact">Contact Us</NavLink></li>
                </ul></div>
                <div><ul className="flex gap-4 bg-[#F2DEC4] pl-5 pt-5 pb-5 pr-2 rounded-l-full">
                    <li className={`${styles.login} login grid place-items-center`}><NavLink to="/login">Login</NavLink></li>
                    <li className={`${styles.signUp} signUp grid place-items-center`}><NavLink to="/signup">Sign Up</NavLink></li>
                </ul></div>
            </nav>
            
        </>
    )
}
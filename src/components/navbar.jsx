import { useEffect, useRef, useState } from "react";
import logo from "../assets/logo.svg"
import styles from "./navbar.module.css"
import Submenu from "./submenu";
import { ChevronDown, Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../features/auth/authContext";

// Shared hover handlers for the Services submenu (attached once on mount)
function useServicesHover(ref) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const open = () => {
            setShow(true);
            const arrow = el.querySelector(".arrow-down");
            if (arrow) arrow.style.transform = "rotate(180deg)";
        };
        const close = () => {
            setShow(false);
            const arrow = el.querySelector(".arrow-down");
            if (arrow) arrow.style.transform = "rotate(0deg)";
        };

        el.addEventListener("mouseover", open);
        el.addEventListener("mouseout", close);

        return () => {
            el.removeEventListener("mouseover", open);
            el.removeEventListener("mouseout", close);
        };
    }, [ref]);

    return show;
}

export default function Navbar() {
    const showMenu = useRef(null);
    const show = useServicesHover(showMenu);
    const [mobileOpen, setMobileOpen] = useState(false);
    // Device session check: logged-in users see "Go to Dashboard" instead of "Sign Up"
    const { currentUser } = useAuth();

    return (
        <>
            <nav className="absolute top-0 w-full pl-4 flex justify-between items-center z-100" >
                <div className="logo flex items-center justify-center bg-[#F2DEC4] rounded-b-full px-1"><img src="logo1.svg" alt="agrimonitor" width={105} height={105} /></div>
                <div className="hidden md:block "><ul className={`flex gap-8 ${styles.navlists} items-center text-[var(--bg)]`} >
                    <li className={`${styles.navList}  py-7 before:bg-[var(--bg)]`} ><NavLink className={({isActive})=> isActive ? `${styles.Activenav} py-7 before:bg-[var(--bg)]`:""} to="/">Home</NavLink></li>
                    <li ref={showMenu} className={`${styles.navList} navList py-7 before:bg-[var(--bg)] relative flex gap-1 items-center`}><p>Services</p>  <p className="arrow-down"><ChevronDown /></p>{show && <Submenu />}</li>
                    <li className={`${styles.navList} py-7 before:bg-[var(--bg)]`}><NavLink className={({isActive})=> isActive ? `${styles.Activenav} py-7 before:bg-[var(--bg)]`:""} to="/features">Features</NavLink></li>
                    <li className={`${styles.navList}  py-7  before:bg-[var(--bg)]`}><NavLink className={({isActive})=> isActive ? `${styles.Activenav} py-7 before:bg-[var(--bg)]`:""} to="/blogs">Blogs </NavLink></li>
                    <li className={`${styles.navList}  py-7 before:bg-[var(--bg)]`}><NavLink className={({isActive})=> isActive ? `${styles.Activenav} py-7 before:bg-[var(--bg)]`:""} to="/contact">Contact Us</NavLink></li>
                </ul></div>
                <div className="hidden md:block"><ul className="md:gap-3 md:pl-4 flex gap-4 min-w-max bg-[#F2DEC4] pl-5 pt-5 pb-5 pr-2 rounded-l-full items-center">
                    <Link to="/login" className={`${styles.login} login grid place-items-center`}><p>Login</p></Link>
                    <Link to={currentUser ? "/dashboard" : "/signup"} className={`${styles.signUp}  signUp grid place-items-center`}><p>{currentUser ? "Go to Dashboard" : "Sign Up"}</p></Link>
                </ul></div>
                {/* Mobile hamburger toggle */}
                <button
                    aria-label="Toggle navigation menu"
                    onClick={() => setMobileOpen((open) => !open)}
                    className="md:hidden mr-4 p-2 rounded-xl bg-[#F2DEC4] text-black cursor-pointer grid place-items-center"
                >
                    {mobileOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
                {/* Mobile dropdown menu */}
                {mobileOpen && (
                    <div className="absolute top-full left-0 w-full bg-[#F2DEC4] border-b-2 border-black shadow-lg md:hidden">
                        <ul className="flex flex-col p-4 gap-1 text-black">
                            <li className="px-3 py-2"><NavLink onClick={() => setMobileOpen(false)} className="block" to="/">Home</NavLink></li>
                            <li className="px-3 py-2"><NavLink onClick={() => setMobileOpen(false)} className="block" to="/services">Services</NavLink></li>
                            <li className="px-3 py-2"><NavLink onClick={() => setMobileOpen(false)} className="block" to="/features">Features</NavLink></li>
                            <li className="px-3 py-2"><NavLink onClick={() => setMobileOpen(false)} className="block" to="/blogs">Blogs</NavLink></li>
                            <li className="px-3 py-2"><NavLink onClick={() => setMobileOpen(false)} className="block" to="/contact">Contact Us</NavLink></li>
                            <li className="flex gap-3 px-3 pt-2">
                                <Link onClick={() => setMobileOpen(false)} to="/login" className="flex-1 text-center bg-[var(--text1)] text-white px-4 py-2 rounded-full">Login</Link>
                                <Link onClick={() => setMobileOpen(false)} to={currentUser ? "/dashboard" : "/signup"} className="flex-1 text-center bg-green-700 text-white px-4 py-2 rounded-full">{currentUser ? "Go to Dashboard" : "Sign Up"}</Link>
                            </li>
                        </ul>
                    </div>
                )}
            </nav>
            
        </>
    )
}

export function Navbar2() {
    const showMenu = useRef(null);
    const show = useServicesHover(showMenu);
    // Device session check: logged-in users see "Go to Dashboard" instead of "Sign Up"
    const { currentUser } = useAuth();

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
                    <li className={`${styles.signUp} signUp grid place-items-center`}><NavLink to={currentUser ? "/dashboard" : "/signup"}>{currentUser ? "Go to Dashboard" : "Sign Up"}</NavLink></li>
                </ul></div>
            </nav>
            
        </>
    )
}
import { useState } from "react";
import styles from "./navbar.module.css"
import { NavLink } from "react-router-dom";
const SUBMENU = [
    {
        id:1,
        title:"Crop Health",
        url:"/",
    },
    {
        id:2,
        title:"Smart Irrigation",
        url:"/",
    },
    {
        id:3,
        title:"Nutrients",
        url:"/",
    },
    {
        id:4,
        title:"Fertilizers",
        url:"/",
    },
    {
        id:5,
        title:"Pesticides",
        url:"/",
    },
    {
        id:6,
        title:"Soil Testing",
        url:"/",
    }
]
export default function Submenu({getDatas}){
    return(
        <>
        <div className="subMenu absolute bg-[#F2DEC4] top-15 left-[-200px]  border-2 border-black rounded-[10px] overflow-hidden cursor-auto">
            <ul className={`flex gap-3 justify-center items-center `}>
                {SUBMENU.map((item)=>{
                    return(
                        <li className={`px-2 py-5 ${item.id === 1 ? "bg-green-700 text-[var(--bg)] before:bg-[var(--bg)]" : "text-[var(--text1)] before:bg-green-700"} ${styles.navList} `} key={item.id}>
                            <NavLink className={({isActive})=> isActive ? `${styles.Activenav} py-7`:""} className=" text-nowrap" to={item.url}>{item.title}</NavLink>
                        </li>
                    )
                })}
            </ul>
        </div>
        </>
    )
}
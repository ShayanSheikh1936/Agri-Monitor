import { Send } from "lucide-react";
import styles from "./footer.module.css"
export default function Footer() {
    return (
        <>
            <section className="w-full bg-[#4D7429] flex pb-3 border-b-2 border-b-black justify-between">
                <div className="w-fit flex justify-center items-center px-3 flex-col gap-5">
                    <img src="logo1.svg" alt="" className="w-60 bg-[var(--bg)] rounded-b-full" />
                    <p className="text-center w-90">Lorem, ipsum dolor sit amet consectetur adipisicing elit. Doloremque, exercitationem obcaecati sapiente corporis esse vero quo cupiditate atque debitis quos!</p>
                </div>
                <div className="container flex flex-col gap-10 ">
                    <div className={`relative flex justify-end uppercase font-sans  gap-2 items-center container  text-black ${styles.newslatter}`}><span>
                        <form action="" className={`px-2 pb-2 rounded-bl-2xl flex gap-2 w-fit bg-[var(--bg)] items-center text-black ${styles.newslatter}`}>
                            <label htmlFor="">Join Our Newslatter</label>
                            <input type="text" className="bg-white px-3 py-3 rounded-4xl text-black " placeholder="Enter Your Email" name="newslatter" onChange={null} />
                            <button className="bg-[var(--text1)] rounded-full p-3 grid place-items-center" onClick={() => console.log("shyan")
                            }><Send color="white" /></button>
                        </form>
                    </span>
                    </div>
                    <div className="flex justify-around gap-3  ">
                        <div>
                            <ul className={`leading-loose ${styles.footerNav}`}>
                                <header className="font-semibold text-2xl pb-2 underline">Pages</header>
                                <li >Home</li>
                                <li>Services</li>
                                <li>Features</li>
                                <li>Blogs</li>
                                <li>Contact Us</li>
                            </ul>
                        </div>
                        <div>
                            <ul className={`leading-loose ${styles.footerNav}`}>
                                <header className="font-semibold text-2xl pb-2 underline">Services</header>
                                <li>Soil Testing</li>
                                <li>Fertilizer</li>
                                <li>Crop Planning</li>
                                <li>Pesticides</li>
                                <li>Irrigation</li>
                            </ul>
                        </div>
                        <div>
                            <ul className={`leading-loose ${styles.footerNav}`}>
                                <header className="font-semibold text-2xl pb-2 underline">Contact</header>
                                <li>facebook</li>
                                <li>twitter</li>
                                <li>instagram</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
            <section className="text-center w-full flex justify-center h-15 bg-[var(--bg)] border-b-2 border-b-black items-center text-black">Agri Monitor &copy; {" "} All Rights Reserved {" "} Developed by Shayan Sheikh {" "}</section></>
    )
}
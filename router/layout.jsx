import { Outlet } from "react-router-dom";
import Navbar from "../src/components/navbar";
import Footer from "../src/components/footer";
import Chatbot from "../src/components/chatbots";

export default function Layout(){
    
    return(
        <>
        <Navbar/>
        <Outlet/>
        <Footer />
        </>
    )
}
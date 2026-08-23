import { Outlet } from "react-router-dom";
import Navbar from "../src/components/navbar";
import Footer from "../src/components/footer";

export default function Layout(){
    
    return(
        <>
        <Navbar/>
        <Outlet/>
        <Footer />
        </>
    )
}
import { ChevronLeft } from "lucide-react";
import styles from "./signin.module.css"
import { Link } from "react-router-dom"
import { Activity, useState } from "react";
import growcrop from "../assets/growcrop.jpg"
import { ReactHookForm } from "../components/inputbox";
import Backnavigate from "../components/BackNavigate";
export default function FormPage({page="Sign Up", children}){
    
    
    
    return(
        <>
        <div className="bg-[var(--bg)] w-full h-screen  flex flex-col gap-3 items-center overflow-x-hidden ">
            <Backnavigate href="/"/>
            <div className="ml-2 mr-2 max-w-4xl w-[100%]  mb-10 shadow-outer shadow-[#9e9281] shadow-2xl flex rounded-2xl" >
                <div className="w-1/2 rounded-l-2xl bg-center bg-cover bg-no-repeat hidden  md:block" style={{ backgroundImage: `url(${growcrop})` }}></div>
                <div className={` w-1/1 flex flex-col px-3 py-3 gap-7 rounded-r-2xl rounded-l-2xl md:rounded-0 ${styles.signUpCont}`}>
                <h1 className="text-black font-bold text-3xl font-[Bahnschrift]  font-stretch-condensed">{page}</h1>
                {children}
                </div>
            </div>
        </div>
        </>
    )
}


// import React from 'react';
// import styled from 'styled-components';

// const Input = () => {
//   return (
//     <StyledWrapper>
//       <div className="input-container">
//         <input placeholder="Enter text" className="input-field" type="text" />
//         <label htmlFor="input-field" className="input-label">Enter text</label>
//         <span className="input-highlight" />
//       </div>
//     </StyledWrapper>
//   );
// }

// const StyledWrapper = styled.div`
//   /* Input container */
//   .input-container {
//     position: relative;
//     margin: 20px;
//   }

//   /* Input field */
//   .input-field {
//     display: block;
//     width: 100%;
//     padding: 10px;
//     font-size: 16px;
//     border: none;
//     border-bottom: 2px solid #ccc;
//     outline: none;
//     background-color: transparent;
//   }

//   /* Input label */
//   .input-label {
//     position: absolute;
//     top: 0;
//     left: 0;
//     font-size: 16px;
//     color: rgba(204, 204, 204, 0);
//     pointer-events: none;
//     transition: all 0.3s ease;
//   }

//   /* Input highlight */
//   .input-highlight {
//     position: absolute;
//     bottom: 0;
//     left: 0;
//     height: 2px;
//     width: 0;
//     background-color: #007bff;
//     transition: all 0.3s ease;
//   }

//   /* Input field:focus styles */
//   .input-field:focus + .input-label {
//     top: -20px;
//     font-size: 12px;
//     color: #007bff;
//   }

//   .input-field:focus + .input-label + .input-highlight {
//     width: 100%;
//   }`;

// export Input;

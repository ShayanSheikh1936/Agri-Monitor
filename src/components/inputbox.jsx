import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import googlelogo from "../assets/googlelogo.jpg";
import styles from "./reactform.module.css";
import { doc, getDoc, setDoc } from "firebase/firestore";


// External Services Import
import { executeGoogleSignIn, executeFormSignUp, executeFormLogin } from "./formServices";
import { log } from "firebase/firestore/pipelines";
import { auth, fdb, Googleprovider } from "../features/auth/firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";


export function ReactHookForm() {
    const [authError, setAuthError] = useState("");
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm();

    const password = watch("passwords");


    const handleGoogleSignIn = async () => {
        setLoading(true);
        setAuthError("");

        const { user, error } = await executeGoogleSignIn();
        setLoading(false);

        if (error) {
            alert(`Error in google sign in: ${error}`);
            setAuthError(error)
        } else if (user) {
            // console.log("Registered User Data:", user);
            navigate("/personalinfo");
        }
    };

    // Form Submit Event
    const handleForm = async (data) => {
        setLoading(true);
        setAuthError("");
        const { user, docData, error } = await executeFormSignUp(data);
        setLoading(false);
        if (error) {
            setAuthError(error);
        } else if (user) {
            // console.log("Registered User Data:", docData);
            navigate("/personalinfo");
        }
    };

    return (
        <>
            <form
                className="flex b-10 flex-col gap-4 justify-center items-center"
                onSubmit={handleSubmit(handleForm)}
            >
                {/* Auth Error Banner */}
                {authError && (
                    <p className="fixed text-red-600 bg-red-100 p-2 rounded text-center w-fit px-5 top-0 transform translate-x-[-50%]">
                        {authError}
                    </p>
                )}

                {/* First & Last Name */}
                <span className="flex gap-2 w-full">
                    <span className="w-1/2 relative">
                        <input
                            className={`peer block bg-transparent ${errors.firstname ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`}
                            type="text"
                            {...register("firstname", { required: "Enter First Name" })}
                            placeholder="Firstname"
                        />
                        <label
                            htmlFor="input-field"
                            className={`text-[#cccccc00] inputLabel top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] ${errors.firstname ? "peer-focus:text-red-600" : "peer-focus:text-green-700"}`}
                        >
                            {errors.firstname ? errors.firstname.message : "First Name"}
                        </label>
                    </span>

                    <span className="w-1/2 relative">
                        <input
                            className={`peer block bg-transparent  ${errors.lastname ? "outline-1 outline-red-700" : "outline-1 outline-green-700"
                                } w-full px-3 py-2 rounded-[10px] text-black input-field`}
                            type="text"
                            {...register("lastname", { required: "Enter Last Name" })}
                            placeholder="Lastname"
                        />
                        <label
                            htmlFor="input-field"
                            className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.lastname ? "peer-focus:text-red-600" : "peer-focus:text-green-700"
                                }`}
                        >
                            {errors.lastname ? errors.lastname.message : "Last Name"}
                        </label>
                    </span>
                </span>

                {/* Email */}
                <span className="w-full relative">
                    <input
                        className={`peer block bg-transparent ${errors.EmailAddress ? "outline-1 outline-red-700" : "outline-1 outline-green-700"
                            } w-full px-3 py-2 rounded-[10px] text-black input-field`}
                        type="text"
                        {...register("EmailAddress", {
                            required: "Enter Your Email Address",
                            pattern: {
                                value: /^\S+@\S+\.\S+$/,
                                message: "Email is not valid",
                            },
                        })}
                        placeholder="Enter Your Email Address"
                    />
                    <label
                        htmlFor="input-field"
                        className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.EmailAddress ? "peer-focus:text-red-600" : "peer-focus:text-green-700"
                            }`}
                    >
                        {errors.EmailAddress ? errors.EmailAddress.message : "Email Address"}
                    </label>
                </span>

                {/* Password */}
                <span className="relative w-full">
                    <input 
                        className={`peer block bg-transparent ${errors.passwords ? "outline-1 outline-red-700" : "outline-1 outline-green-700"
                            } w-full px-3 py-2 rounded-[10px] text-black input-field`}
                        type="text"
                        {...register("passwords", {
                            required: "Enter Password",
                            pattern: {
                                value: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
                                message: "Password must contain letters, numbers & special character",
                            },
                        })}
                        placeholder="Enter Your Password"
                    />
                    <label
                        htmlFor="input-field"
                        className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.passwords ? "peer-focus:text-red-600" : "peer-focus:text-green-700"
                            }`}
                    >
                        {errors.passwords ? errors.passwords.message : "Password"}
                    </label>
                </span>

                {/* Confirm Password */}
                <span className="relative w-full">
                    <input
                        className={`peer bg-transparent input-field ${errors.checkpassword ? "outline-1 outline-red-700" : "outline-1 outline-green-700"
                            } w-full px-3 py-2 rounded-[10px] text-black`}
                        type="password"
                        
                        {...register("checkpassword", {
                            required: "Confirm your password",
                            validate: (value) => value === password || "Passwords do not match",
                        })}
                        placeholder="Confirm Your Password"
                    />
                    <label
                        htmlFor="input-field"
                        className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.checkpassword ? "peer-focus:text-red-600" : "peer-focus:text-green-700"
                            }`}
                    >
                        {errors.checkpassword ? errors.checkpassword.message : "Confirm Password"}
                    </label>
                </span>

                {/* Social Auth */}
                <span className="flex flex-col gap-2 justify-center items-center w-fit">
                    <p className="text-black">OR</p>
                    <div className="flex gap-2 justify-center items-center">
                        <input
                            onClick={handleGoogleSignIn}
                            type="button"
                            disabled={loading}
                            className="cursor-pointer bg-cover bg-center rounded-full w-10 h-10"
                            style={{ backgroundImage: `url(${googlelogo})` }}
                        />
                    </div>
                </span>

                {/* Terms */}
                <span className="flex items-center gap-2 pl-1 w-full">
                    <input
                        className="size-5 bg-white accent-green-700"
                        type="checkbox"
                        {...register("terms&condition", { required: true })}
                        id="terms&condition"
                    />
                    <label htmlFor="terms&condition" className="text-green-700 text-[14px] leading-tight">
                        Check Terms & Condition for additional resources.
                    </label>
                </span>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-700 text-white w-fit px-5 py-2 flex justify-center items-center rounded cursor-pointer disabled:opacity-50"
                >
                    {loading ? "Processing..." : "Submit"}
                </button>

                <p className="text-green-700">
                    If you have an account, so{" "}
                    <Link className="font-semibold text-green-900 underline" to="/login">
                        Login
                    </Link>
                </p>
            </form>
        </>
    );
}

export function ReactHookFormlogin({ styles, name, required, placeholder, type, pattern, pvalue, pmeessage,  }) {
    const [Error, setError] = useState("")
    const { register, handleSubmit, watch, formState: { errors } } = useForm()
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [authError, setAuthError] = useState("")
    let password = watch("passwords")
    const handleGoogleSignIn = async () => {
        setLoading(true);

        const { user, error } = await executeGoogleSignIn();
        setLoading(false);

        if (error) {
            alert(`Error in google sign in: ${error}`);
            setAuthError(error)
        } else if (user) {
            // console.log("Registered User Data:", user);
            navigate("/personalinfo");
        }
    };

        const handleFormLogin = async (data) => {
        setLoading(true);
        setAuthError("");
        const { user, error, docData } = await executeFormLogin(data);
        setLoading(false);
        if (error) {
            // alert(`Error in google sign in: ${error}`);
            setAuthError(error)
            
        } else if (user) {
            console.log("Registered User Data:", docData);
            navigate("/personalinfo");
        }
    };
    
    return (
        <>
            <form action="" className="flex flex-col gap-4 justify-center items-center" onSubmit={handleSubmit(handleFormLogin)}>
                {/* <span className="flex gap-2 w-full">
                    <span className="w-1/2 relative">
                        <input className={`peer block bg-transparent ${errors.firstname ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`} type="text" {...register("firstname", { required: "Enter First Name" })} placeholder="Firstname" />
                        <label htmlFor="input-field" className={`text-[#cccccc00] inputLabel ${errors.firstname ? "peer-focus:text-red-600" : "peer-focus:text-green-700"}`}>{errors.firstname ? errors.firstname.message : "First Name"} </label>
                    </span>
                    <span className="w-1/2 relative">
                        <input className={`peer block bg-transparent ${errors.lastname ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`} type="text" {...register("lastname", { required: "Enter Last Name" })} placeholder="Lastname" />
                        <label htmlFor="input-field" className={`text-[#cccccc00] inputLabel ${errors.lastname ? "peer-focus:text-red-600" : "peer-focus:text-green-700"}`}>{errors.lastname ? errors.lastname.message : "Last Name"}</label>
                    </span>
                </span> */}
                {authError && (
                    <p className="fixed text-red-600 bg-red-100 p-2 rounded text-center w-fit px-5 top-0 transform translate-x-[-50%]">
                        {authError}
                    </p>
                )}
                <span className="w-full relative">
                    <input className={`peer block bg-transparent ${errors.EmailAddress ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`} type="text" {...register("EmailAddress", { required: "Enter Your Email Address", pattern: { value: /^\S+@\S+\.\S+$/, message: "Email is not valid"} })} maxLength={60}  placeholder="Enter Your Email Address" />
                    <label htmlFor="input-field" className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.EmailAddress ? "peer-focus:text-red-600" : "peer-focus:text-green-700"}`}>{errors.EmailAddress ? errors.EmailAddress.message : "Email Address"} </label>
                </span>
                {/* {errors.EmailAddress && <p className="text-red-600">{errors.EmailAddress.message}</p>} */}
                <span className="relative w-full">
                    <input className={`peer block bg-transparent ${errors.passwords ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`} type="password" {...register("passwords", { required: "Enter Password", pattern: { value: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/, message: "password must contain ABC" } })} placeholder="Enter Your Password" />
                    <label htmlFor="input-field" className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.passwords ? "peer-focus:text-red-600" : "peer-focus:text-green-700"}`}>{errors.passwords ? errors.passwords.message : "Password"} </label>
                </span>
                {/* <span className="relative w-full">
                    <input className={`peer bg-transparent input-field ${errors.checkpassword ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black`} type="password" {...register("checkpassword", { required: true, validate: (value) => value === password || "Passwords do not match" })} placeholder="Confirm Your Password" />
                    <label htmlFor="input-field" className={`text-[#cccccc00] inputLabel ${errors.checkpassword ? "peer-focus:text-red-600" : "peer-focus:text-green-700"}`}>{errors.checkpassword ? errors.checkpassword.message : "Confirm Password"}</label>
                </span> */}
                <span className="flex flex-col gap-2 justify-center items-center w-fit">
                    <p className="text-black">OR</p>
                    <div className="flex gap-2 justify-center items-center">
                        <input onClick={handleGoogleSignIn} type="button" className="cursor-pointer bg-cover bg-center rounded-full w-10 h-10" style={{ backgroundImage: `url(${googlelogo})` }} />
                        {/* <input onClick={() => console.log("shayan")} type="button"/> */}
                    </div>
                </span>
                {/* <span className="flex items-center gap-2 pl-1 w-full"><input className="size-5 bg-white accent-green-700 " type="checkbox" {...register("terms&condition", { required: true })} id="terms&condition" /><label htmlFor="terms&condition" className="text-green-700   text-[14px] leading-tight">Check Terms & Condition for additional resourses.</label></span> */}
                <input className="bg-green-700 w-fit px-5 py-2 flex justify-center items-center rounded cursor-pointer" type="submit" />
                <p className="text-green-700 ">if you dont't have an account so <Link className="font-semibold text-green-900 underline" to="/signup">Sign Up</Link> </p>
            </form>
        </>
    )
}
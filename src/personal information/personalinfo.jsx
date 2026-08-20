import React, { useEffect, useState } from "react"
import styles from "./personalinfo.module.css"
import background1 from "../assets/background1.png"
import Backnavigate from "../components/BackNavigate"
import { useForm } from "react-hook-form"
import { Edit } from "lucide-react"
import { useAuth } from "../features/auth/authContext"
import { fdb } from "../features/auth/firebase"
import { setDoc, doc, getDoc } from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import imageCompression from "browser-image-compression";
export default function PersonalInfo() {
    const navigate = useNavigate()
    const { register, handleSubmit, formState: { errors }, setValue } = useForm();
    const { currentUser } = useAuth();
    // const [fullname, setFullname] = useState("");
    // const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageload, setImageload] = useState(false);
    async function personalData(data) {
        setLoading(true);
        if (currentUser) {
            const docRef = doc(fdb, "users", currentUser.uid)
            const setDocs = await setDoc(docRef, {
                personaluser: {
                    Profession: data.profession || "",
                    PhoneNum: data.phonenum || "",
                    CNICPassportNumber: data.cnicpassportnumber || "",
                    Country: data.country || "",
                    City: data.city || "",
                    CurrentAddress: data.currentaddress || "",
                    PostalCode: data.postalcode || "",
                    StreetName: data.streetname || "",
                    Gender: data.gender || "",
                },
            }, { merge: true })
        }
        navigate("/dashboard")
        setLoading(false)

    }

    useEffect(() => {
        async function fetchUserData() {
            if (currentUser?.uid) {
                try {
                    const docRef = doc(fdb, "users", currentUser.uid);

                    // Variable ka naam 'snapshot' ya 'docSnap' rakhein, 'getDoc' nahi!
                    const snapshot = await getDoc(docRef);

                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        // console.log(data.fullname);
                        setValue("EmailAddress", data.EmailAddress);
                        setValue("FullName", data.fullname);
                    }
                } catch (error) {
                    console.error("Error fetching doc:", error);
                }
            }
        }

        // 👈 Function ko execute karna zaroori hai!
        fetchUserData();
    }, [currentUser]);
    

    // image
    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };


    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImageload(true);

        // Compression Settings (Max 100KB & 300px width/height)
        const options = {
            maxSizeMB: 0.1, // 100KB limit
            maxWidthOrHeight: 300,
            useWebWorker: true,
        };

        try {
            // 1. Image compress karein
            const compressedFile = await imageCompression(file, options);

            // 2. Base64 string banayein
            const base64String = await convertToBase64(compressedFile);

            // 3. UI preview update karein
            setImagePreview(base64String);

            // 4. Firestore mein save karein
            if (currentUser?.uid) {
                const userRef = doc(fdb, "users", currentUser.uid);
                await setDoc(userRef, { displayphoto: base64String }, { merge: true });
                alert("Profile picture updated successfully!");
            }
        } catch (error) {
            console.error("Error processing image:", error);
            alert("Failed to process image.");
        } finally {
            setImageload(false);
        }
    };
    return (
        <>
            <div className="bg-[var(--bg)] w-full overflow-x-hidden   flex items-center  pb-4 flex-col gap-3">
                <Backnavigate href="/" />
                <h1 className="bebas-neue-regular text-4xl text-black font-semibold">Personal Information</h1>
                <div className="max-w-4xl w-screen h-[1px] bg-black mb-2"></div>
                <form className={`inline-block w-30 h-30 rounded-full relative mb-4  ${styles.imgEdit}`}>
                    <label className={`${styles.editBtn}`}>
                        <Edit />
                        Edit
                        <input type="file" accept="image/*"
                            onChange={handleImageChange}
                            disabled={imageload}
                            className="hidden" />
                    </label>
                    <img className="block inset-0 w-30 h-30 rounded-full" src={imagePreview ? imagePreview : "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt="" />
                </form>

                <form onSubmit={handleSubmit(personalData)} className=" grid grid-cols-3 max-w-[1200px] w-full  gap-5 place-items-center ">
                    <span className="w-full relative">
                        <input readOnly={true} className={`peer block bg-transparent w-full px-3 py-2 rounded-[10px] text-black input-field ${errors.FullName ? "outline-1 outline-red-700" : "outline-1 outline-green-700"}`} type="text" {...register("FullName", { required: "Enter Your Full Name" })} maxLength={60} placeholder="Enter Your Full Name" />
                        <label htmlFor="input-field" className={`  text-[#cccccc00] inputLabel  top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px]  peer-focus:bg-[var(--bg)] ${errors.FullName ? "peer-focus:text-red-600" : "peer-focus:text-green-700"}`}>{errors.FullName ? errors.FullName.message : "Full Name"}</label>
                    </span>
                    <span className="w-full relative">
                        <input readOnly={true} className={`peer block bg-transparent ${errors.EmailAddress ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`} type="text" {...register("EmailAddress", { required: "Enter Your Email Address", pattern: { value: /^\S+@\S+\.\S+$/, message: "Email is not valid" } })} maxLength={60} placeholder="Enter Your Email Address" />
                        <label htmlFor="input-field" className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] inputLabel  peer-focus:bg-[var(--bg)] ${errors.EmailAddress ? "peer-focus:text-red-600" : "peer-focus:text-green-700"}`}>{errors.EmailAddress ? errors.EmailAddress.message : "Email Address"}</label>
                    </span>
                    <span className="w-full relative">
                        <select className={`peer block bg-transparent ${errors.gender ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`}   {...register("gender", { required: "Enter Your Gender" })} placeholder="Enter Your Gender" >
                            <option defaultValue="" selected hidden></option>
                            <option value="male" required>Male</option>
                            <option value="female" required>Female</option>
                            <option value="perfer not to say" required>Perfer not to say</option>
                        </select>
                        <label htmlFor="input-field" className={`text-[#cccccc00] -top-[15px] px-1.5 text-[15px] inputLabel  ${errors.gender ? "text-red-600" : "text-green-700"} bg-[var(--bg)]`}>{errors.gender ? errors.gender.message : "Gender"}</label>
                    </span>
                    <span className="w-full relative">
                        <select defaultValue="" className={`peer block bg-transparent ${errors.profession ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`}   {...register("profession", { required: "Select Your profession" })} placeholder="Select Your Profession" >
                            <option defaultValue="" selected hidden></option>
                            <option value="farmer" required>Farmer</option>
                            <option value="gardener" required>Gardener</option>
                            <option value="horticulturist" required>Horticulturist</option>
                            <option value="arborist" required>Arborist</option>
                            <option value="landscaper" required>Landscaper</option>
                            <option value="florist" required>Florist</option>
                            <option value="nursery worker" required>Nursery worker</option>
                        </select>
                        <label htmlFor="input-field" className={`text-[#cccccc00] -top-[15px] px-1.5 text-[15px] inputLabel  ${errors.profession ? "text-red-600" : "text-green-700"} bg-[var(--bg)]`}>{errors.profession ? errors.profession.message : "Profession"}</label>
                    </span>
                    <span className="w-full relative">
                        <input className={`peer block bg-transparent ${errors.phonenum ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`} type="number" {...register("phonenum", { required: "Enter Your Phone Number" })} maxLength={30} placeholder="Enter Your Phone Number" />
                        <label htmlFor="input-field" className={`text-[#cccccc00]  inputLabel top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] ${errors.phonenum ? "peer-focus:text-red-600" : "peer-focus:text-green-700"} peer-focus:bg-[var(--bg)]`}>{errors.phonenum ? errors.phonenum.message : "Phone Number"}</label>
                    </span>
                    <span className="w-full relative">
                        <input className={`peer block bg-transparent ${errors.cnicpassportnumber ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`} type="number" {...register("cnicpassportnumber", { required: "Enter Your CNIC/Passport Number" })} maxLength={30} placeholder="Enter Your CNIC/Passport Number" />
                        <label htmlFor="input-field" className={`text-[#cccccc00]  inputLabel top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] ${errors.cnicpassportnumber ? "peer-focus:text-red-600" : "peer-focus:text-green-700"} peer-focus:bg-[var(--bg)]`}>{errors.cnicpassportnumber ? errors.cnicpassportnumber.message : "CNIC/Passport Number"}</label>
                    </span>
                    <span className="w-full relative">
                        <input className={`peer block bg-transparent ${errors.country ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`} type="text" {...register("country", { required: "Enter Your Country" })} maxLength={30} placeholder="Enter Your Country Name" />
                        <label htmlFor="input-field" className={`text-[#cccccc00] inputLabel top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] ${errors.country ? "peer-focus:text-red-600" : "peer-focus:text-green-700"} peer-focus:bg-[var(--bg)]`}>{errors.country ? errors.country.message : "Country"}</label>
                    </span>
                    <span className="w-full relative">
                        <input className={`peer block bg-transparent ${errors.city ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`} type="text" {...register("city", { required: "Enter Your City Name" })} maxLength={60} placeholder="Enter Your City Name" />
                        <label htmlFor="input-field" className={`text-[#cccccc00] inputLabel top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] ${errors.city ? "peer-focus:text-red-600" : "peer-focus:text-green-700"} peer-focus:bg-[var(--bg)]`}>{errors.city ? errors.city.message : "City"}</label>
                    </span>
                    <span className="w-full relative">
                        <input className={`peer block bg-transparent ${errors.postalcode ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`} type="number" {...register("postalcode", { required: "Enter Your Postal Code" })} maxLength={60} placeholder="Enter Your Postal Code" />
                        <label htmlFor="input-field" className={`text-[#cccccc00] inputLabel top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] ${errors.postalcode ? "peer-focus:text-red-600" : "peer-focus:text-green-700"} peer-focus:bg-[var(--bg)]`}>{errors.postalcode ? errors.postalcode.message : "Postal Code"}</label>
                    </span>
                    <span className="w-full relative">
                        <input className={`peer block bg-transparent ${errors.streetname ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`} type="text" {...register("streetname", { required: "Enter Your Street Name" })} maxLength={20} placeholder="Enter Your Street Name" />
                        <label htmlFor="input-field" className={`text-[#cccccc00] inputLabel top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] ${errors.streetname ? "peer-focus:text-red-600" : "peer-focus:text-green-700"} peer-focus:bg-[var(--bg)]`}>{errors.streetname ? errors.streetname.message : "Street Name"}</label>
                    </span>
                    <span className="w-full relative">
                        <input className={`peer block bg-transparent ${errors.currentaddress ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`} type="text" {...register("currentaddress", { required: "Enter Your Current Address" })} maxLength={30} placeholder="Enter Your Current Address" />
                        <label htmlFor="input-field" className={`text-[#cccccc00] inputLabel top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] ${errors.currentaddress ? "peer-focus:text-red-600" : "peer-focus:text-green-700"} peer-focus:bg-[var(--bg)]`}>{errors.currentaddress ? errors.currentaddress.message : "Current Address"}</label>
                    </span>
                    <span className="w-full relative">
                        <input className={`peer block bg-transparent ${errors.zipcode ? "outline-1 outline-red-700" : "outline-1 outline-green-700"} w-full px-3 py-2 rounded-[10px] text-black input-field`} type="number" {...register("zipcode", { required: "Enter Your ZIP Code" })} maxLength={8} placeholder="Enter Your ZIP Code" />
                        <label htmlFor="input-field" className={`text-[#cccccc00] inputLabel top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] ${errors.zipcode ? "peer-focus:text-red-600" : "peer-focus:text-green-700"} peer-focus:bg-[var(--bg)]`}>{errors.zipcode ? errors.zipcode.message : "ZIP Code"}</label>
                    </span>
                    <input type="submit" value={loading ? "Loading..." : "Submit"} className="col-span-3 bg-[var(--text1)] cursor-pointer mt-5 block text-white px-4 py-2 rounded-[10px] font-semibold" />
                </form>



            </div>

        </>
    )
}
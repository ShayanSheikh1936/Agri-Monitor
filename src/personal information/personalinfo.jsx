import { useEffect, useState } from "react"
import styles from "./personalinfo.module.css"
import Backnavigate from "../components/BackNavigate"
import { useForm } from "react-hook-form"
import { Edit } from "lucide-react"
import { useAuth } from "../features/auth/authContext"
import { fdb } from "../features/auth/firebase"
import { setDoc, doc, getDoc } from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import imageCompression from "browser-image-compression";
import ToggleSwitch from "../components/toogleswitch"
import { set } from "firebase/database"
export default function PersonalInfo() {
    const navigate = useNavigate()
    const { register, handleSubmit, formState: { errors }, setValue } = useForm();
    const { currentUser } = useAuth();
    // const [fullname, setFullname] = useState("");
    // const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageload, setImageload] = useState(false);
    const [isOn, setIsOn] = useState(false);
    

  const handleToggle = () => {
      setIsOn(!isOn);
  }
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
                    notification:isOn
                },
            }, { merge: true })

            const docsnap = await getDoc(docRef)
            if (docsnap.exists()) {
                const docData = docsnap.data();
                try {
                    const response = await fetch('https://lagoon-punk-capitol.ngrok-free.dev/webhook/test-webhook', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            uid: currentUser.uid,
                            name: docData.fullname,
                            email: docData.EmailAddress,
                            phone: docData.personaluser.PhoneNum,
                            city: docData.personaluser.City,
                            country: docData.personaluser.Country,
                            address: docData.personaluser.CurrentAddress,
                            gender: docData.personaluser.Gender,
                            profession: docData.personaluser.Profession,
                            cnic: docData.personaluser.CNICPassportNumber,
                            notification:isOn,
                            template: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Agri Monitor</title>
</head>

<body style="margin:0;padding:0;background-color:#F2DEC4;font-family:Arial,Helvetica,sans-serif;color:#26352A;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F2DEC4;padding:30px 15px;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" border="0"
style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;">

<!-- HEADER -->
<tr>
<td style="background-color:#D7E8C0;padding:30px 35px;text-align:center;">

<img src="https://res.cloudinary.com/nad0od7n/image/upload/v1787253390/logo2_lk1hw8.png" width="180" alt="Agri Monitor" style="display:inline-block;"/>

<div style="font-size:30px;font-weight:800;color:#669934;">
 Agri Monitor
</div>

<div style="font-size:13px;color:#526B55;margin-top:6px;">
AI-Powered Agriculture Intelligence
</div>

</td>
</tr>

<!-- HERO -->
<tr>
<td style="padding:42px 40px 25px;text-align:center;">

<div style="font-size:13px;font-weight:bold;color:#5C7C54;text-transform:uppercase;letter-spacing:1.5px;">
WELCOME TO THE FUTURE OF FARMING
</div>

<h1 style="margin:12px 0 0;font-size:34px;line-height:1.2;color:#26352A; text-transform:capitalize;">
Welcome, ${docData.fullname}! 🌾
</h1>

<p style="font-size:16px;line-height:1.7;color:#657067;margin:20px 0 0;">
Welcome to <strong style="color:#315B38;">Agri Monitor</strong> —
your AI-powered agriculture platform designed to help you monitor crops,
understand crop health, stay updated with weather conditions, and make
smarter farming decisions.
</p>

</td>
</tr>

<!-- CTA -->
<tr>
<td align="center" style="padding:10px 40px 35px;">

<a href="http://localhost:5173/"
style="display:inline-block;background-color:#315B38;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:15px 32px;border-radius:10px;">
Open Your Dashboard
</a>

</td>
</tr>

<!-- FEATURES -->
<tr>
<td style="background-color:#F7F9F4;padding:35px 30px;">

<h2 style="text-align:center;margin:0 0 25px;color:#26352A;font-size:23px;">
Everything You Need in One Place
</h2>

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="margin-bottom:14px;background:#ffffff;border-radius:12px;">
<tr>
<td width="55" style="padding:18px 10px 18px 18px;">
<div style="font-size:27px;">🤖</div>
</td>
<td style="padding:16px 18px 16px 5px;">
<strong style="font-size:16px;color:#315B38;">
Personal AI Agriculture Chatbot
</strong>
<p style="font-size:13px;line-height:1.5;color:#707A72;margin:6px 0 0;">
Get intelligent AI-powered assistance for your agriculture questions.
</p>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="margin-bottom:14px;background:#ffffff;border-radius:12px;">
<tr>
<td width="55" style="padding:18px 10px 18px 18px;">
<div style="font-size:27px;">🌱</div>
</td>
<td style="padding:16px 18px 16px 5px;">
<strong style="font-size:16px;color:#315B38;">
Crop Health Monitoring
</strong>
<p style="font-size:13px;line-height:1.5;color:#707A72;margin:6px 0 0;">
Add your crop details and monitor crop progress and health.
</p>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="margin-bottom:14px;background:#ffffff;border-radius:12px;">
<tr>
<td width="55" style="padding:18px 10px 18px 18px;">
<div style="font-size:27px;">🔬</div>
</td>
<td style="padding:16px 18px 16px 5px;">
<strong style="font-size:16px;color:#315B38;">
AI Crop Disease Detection
</strong>
<p style="font-size:13px;line-height:1.5;color:#707A72;margin:6px 0 0;">
Analyze crop conditions and identify potential crop diseases.
</p>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="margin-bottom:14px;background:#ffffff;border-radius:12px;">
<tr>
<td width="55" style="padding:18px 10px 18px 18px;">
<div style="font-size:27px;">🌦️</div>
</td>
<td style="padding:16px 18px 16px 5px;">
<strong style="font-size:16px;color:#315B38;">
Weather Updates & Alerts
</strong>
<p style="font-size:13px;line-height:1.5;color:#707A72;margin:6px 0 0;">
Stay updated with weather forecasts and important weather alerts.
</p>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="margin-bottom:14px;background:#ffffff;border-radius:12px;">
<tr>
<td width="55" style="padding:18px 10px 18px 18px;">
<div style="font-size:27px;">📈</div>
</td>
<td style="padding:16px 18px 16px 5px;">
<strong style="font-size:16px;color:#315B38;">
Crop Progress Tracking
</strong>
<p style="font-size:13px;line-height:1.5;color:#707A72;margin:6px 0 0;">
Track your crop development and progress from your dashboard.
</p>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="background:#ffffff;border-radius:12px;">
<tr>
<td width="55" style="padding:18px 10px 18px 18px;">
<div style="font-size:27px;">💹</div>
</td>
<td style="padding:16px 18px 16px 5px;">
<strong style="font-size:16px;color:#315B38;">
Crop Suggestions & Market Rates
</strong>
<p style="font-size:13px;line-height:1.5;color:#707A72;margin:6px 0 0;">
Explore crop suggestions, commodity information and crop market rates.
</p>
</td>
</tr>
</table>

</td>
</tr>

<!-- DASHBOARD -->
<tr>
<td style="background-color:#D7E8C0;padding:35px;text-align:center;">

<div style="font-size:13px;font-weight:bold;color:#557055;text-transform:uppercase;letter-spacing:1px;">
YOUR AGRICULTURE COMMAND CENTER
</div>

<h2 style="font-size:25px;margin:10px 0 12px;color:#26352A;">
Smarter Insights. Better Decisions. 🌾
</h2>

<p style="font-size:14px;line-height:1.6;color:#526052;margin:0 auto 22px;">
Access your crops, AI tools, weather insights, alerts,
forecasts and market information from one dashboard.
</p>

<a href="YOUR_DASHBOARD_URL"
style="display:inline-block;background-color:#26352A;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 28px;border-radius:9px;">
Go to Agri Monitor
</a>

</td>
</tr>

<!-- CLOSING -->
<tr>
<td style="padding:32px 40px;text-align:center;background:#ffffff;">

<p style="font-size:15px;line-height:1.6;color:#657067;margin:0;">
We're excited to have you with us.
</p>

<p style="font-size:15px;line-height:1.6;color:#657067;margin:8px 0 0;">
Let's grow smarter, together.
</p>

<div style="margin-top:20px;font-size:18px;font-weight:bold;color:#315B38;">
— Team Agri Monitor 🌱
</div>

</td>
</tr>

<!-- FOOTER -->
<tr>
<td align="center" style="background-color:#D7E8C0; padding:25px 30px;text-align:center;">

<img src="https://res.cloudinary.com/nad0od7n/image/upload/v1787253390/logo2_lk1hw8.png" width="180" alt="Agri Monitor" style="display:inline-block;"/>

<div style="font-size:19px;font-weight:800;color:#669934;">
Agri Monitor
</div>

<p style="font-size:12px;line-height:1.5;color:#607060;margin:8px 0 15px;">
AI-powered agriculture intelligence for smarter farming.
</p>

<p style="font-size:11px;color:#718071;margin:0;">
© 2026 Agri Monitor. All rights reserved.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`
                        })

                    });
                    if (response.ok) {
                        console.log('Data successfully sent!');
                    } else {
                        console.log('Error sending data.');
                    }
                }
                catch (error) {
                    console.log(error)
                }
            }
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
            <div className="bg-[var(--bg)] w-full overflow-x-hidden flex items-center  pb-4 flex-col gap-3">
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
                        <label htmlFor="input-field" className={`text-[#cccccc00] inputLabel  top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px]  peer-focus:bg-[var(--bg)] ${errors.FullName ? "peer-focus:text-red-600" : "peer-focus:text-green-700"}`}>{errors.FullName ? errors.FullName.message : "Full Name"}</label>
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
                    <div className="col-span-3 flex items-center w-full gap-2 text-green-700 mt-2 text-[15px] "><button
                        disabled={loading}
                        className={`w-[45px] h-[22px] ${isOn ? "bg-[#22c55e]" : "bg-[#d1d5db]"} rounded-full cursor-pointer relative transition  duration-300 ease-in-out p-0 outline-none border-none`}
                        onClick={handleToggle}
                        aria-checked={isOn}
                        role="notification"
                        type="button"
                    >
                        <span className={`absolute top-[3px] ${isOn ? "left-[26px]" : "left-[3px]"} w-[15px] h-[15px] bg-white rounded-full transition-[left] duration-300 ease-in-out shadow-[0_2px_4px_rgba(0,0,0,0.2)] pointer-events-none}`} />
                    </button><p>Turn on notifications and get daily weather updates and alerts in your inbox.</p></div>
                    <input type="submit" value={loading ? "Loading..." : "Submit"} className="col-span-3 bg-[var(--text1)] cursor-pointer mt-5 block text-white px-4 py-2 rounded-[10px] font-semibold" />
                </form>
            </div>

        </>
    )
}
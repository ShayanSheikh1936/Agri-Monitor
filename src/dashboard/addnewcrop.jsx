import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { doc, setDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { fdb } from "../features/auth/firebase";
import { useAuth } from "../features/auth/authContext";
import Backnavigate from "../components/BackNavigate";

export default function DynamicCropForm() {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [gpsCoords, setGpsCoords] = useState(null);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [calculatedAge, setCalculatedAge] = useState(null);
    const [cropImage, setCropImage] = useState(null);
    const fileInputRef = useRef(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
        reset,
    } = useForm({
        defaultValues: {
            HealthStatus: "Healthy",
        },
    });

    // Dynamic Watchers
    const watchSowingDate = watch("SowingDate");
    const watchHealthStatus = watch("HealthStatus");
    const watchCropName = watch("CropName");
    const watchCategory = watch("CropCategory");

    // Dynamic Feature 1: Auto-calculate Plant Age from Sowing Date
    useEffect(() => {
        if (watchSowingDate) {
            const sowing = new Date(watchSowingDate);
            const today = new Date();
            const diffTime = Math.abs(today - sowing);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setCalculatedAge(diffDays);
        } else {
            setCalculatedAge(null);
        }
    }, [watchSowingDate]);

    // Dynamic Feature 2: GPS Auto Location Fetch
    const handleGetLocation = () => {
        setGpsLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    };
                    setGpsCoords(coords);
                    setGpsLoading(false);
                },
                (error) => {
                    alert("Location access denied or unavailable.");
                    setGpsLoading(false);
                }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
            setGpsLoading(false);
        }
    };

    // Image Compression & Base64 Conversion
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let { width, height } = img;
                const maxSize = 300;
                if (width > height) {
                    if (width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
                } else {
                    if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                const base64 = canvas.toDataURL("image/jpeg", 0.5);
                setCropImage(base64);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // Form Submit Handler
    const onSubmit = async (data) => {
        setLoading(true);
        setSuccessMsg("");
        try {
            const cropEntry = {
                ...data,
                plantAgeDays: calculatedAge || 0,
                gpsLocation: gpsCoords || null,
                cropImage: cropImage || null,
                createdAt: new Date().toISOString(),
            };

            await setDoc(doc(fdb, "crops", currentUser.uid), {
                crops: arrayUnion(cropEntry),
                updatedAt: serverTimestamp(),
            }, { merge: true });

            setSuccessMsg("🎉 Crop successfully registered with smart tracking!");
            reset({ HealthStatus: "Healthy" });
            setGpsCoords(null);
            setCalculatedAge(null);
            setCropImage(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (error) {
            console.error("Error saving crop:", error);
            alert("Failed to save crop data.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full p-2 md:pb-8 bg-[var(--bg)] overflow-x-hidden">
            <Backnavigate href="/dashboard" />
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[var(--bg)] to-[var(--text1)] rounded-3xl p-6 text-white mb-8 shadow-xl relative overflow-hidden flex gap-2 items-center">
                <div>
                    <img className="w-25 h-25" src="/logo1.svg" alt="" />
                </div>
                <div className="relative z-10">
                    <span className="bg-[var(--text1)] text-xs  px-3 py-1 rounded-full uppercase tracking-wider">
                        Smart Agri Monitor
                    </span>
                    <h1 className="bebas-neue-regular text-4xl font-semibold font-extrabold mt-2 text-[var(--text1)]">Add New Crop Profile</h1>
                    <p className="text-sm mt-1 text-[var(--text1)]">
                        Fill in the details below to register your crop for smart monitoring.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form */}
                <div className="lg:col-span-2 bg-[#D7E8C0] backdrop-blur-md p-6 md:p-8 rounded-3xl border border-emerald-100 shadow-lg">
                    {successMsg && (
                        <div className="mb-6 p-4 bg-emerald-600 text-white text-center text-sm font-semibold rounded-2xl shadow-md">
                            {successMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                        {/* GPS Location Auto-Detector Bar */}
                        <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                            <div>
                                <p className="text-xs font-bold text-emerald-900 uppercase">GPS Weather Coordinates</p>
                                <p className="text-xs text-gray-600">
                                    {gpsCoords
                                        ? `GPS Captured Successfully`
                                        : "Auto-detect GPS coordinates from your device."}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleGetLocation}
                                disabled={gpsLoading}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                            >
                                {gpsLoading ? "Detecting..." : gpsCoords ? "✓ Captured" : "Auto-Fetch GPS"}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* 1. Crop Name */}
                            <span className="w-full relative">
                                <input
                                    className={`peer block bg-transparent ${errors.CropName ? "outline-1 outline-red-700" : "outline-1 outline-green-700"
                                        } w-full px-3 py-2 rounded-[10px] text-black input-field`}
                                    type="text"
                                    maxLength={60}
                                    placeholder="Enter Crop Name"
                                    {...register("CropName", { required: "Enter Crop Name" })}
                                />
                                <label
                                    htmlFor="input-field"
                                    className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.CropName ? "peer-focus:text-red-600" : "peer-focus:text-green-700"
                                        }`}
                                >
                                    {errors.CropName ? errors.CropName.message : "Crop / Tree Name"}
                                </label>
                            </span>

                            {/* 2. Crop Category */}
                            <span className="w-full relative">
                                <select
                                    className={`peer block bg-transparent ${errors.CropCategory ? "outline-1 outline-red-700" : "outline-1 outline-green-700"
                                        } w-full px-3 py-2 rounded-[10px] text-black input-field`}
                                    {...register("CropCategory", { required: "Select Category" })}
                                >
                                    <option value="">Select Category</option>
                                    <option value="Vegetable">Vegetable (Sabziyan)</option>
                                    <option value="Fruit">Fruit Tree (Phal)</option>
                                    <option value="Grain">Grain / Crop (Gandum, Chawal)</option>
                                    <option value="Indoor">Indoor / Ornamental Plant</option>
                                    <option value="Herbs">Herbs / Spices</option>
                                </select>
                                <label
                                    htmlFor="input-field"
                                    className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.CropCategory ? "peer-focus:text-red-600" : "peer-focus:text-green-700"
                                        }`}
                                >
                                    {errors.CropCategory ? errors.CropCategory.message : "Crop Category"}
                                </label>
                            </span>

                            {/* 3. Sowing Date */}
                            <span className="w-full relative">
                                <input
                                    className={`peer block bg-transparent ${errors.SowingDate ? "outline-1 outline-red-700" : "outline-1 outline-green-700"
                                        } w-full px-3 py-2 rounded-[10px] text-black input-field`}
                                    type="date"
                                    {...register("SowingDate", { required: "Select Planting Date" })}
                                />
                                <label
                                    htmlFor="input-field"
                                    className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.SowingDate ? "peer-focus:text-red-600" : "peer-focus:text-green-700"
                                        }`}
                                >
                                    {errors.SowingDate ? errors.SowingDate.message : "Planting / Sowing Date"}
                                </label>
                                {calculatedAge !== null && (
                                    <span className="text-[10px] text-emerald-700 font-bold ml-2 mt-1 block">
                                        🌱 Plant Age: {calculatedAge} Days Old
                                    </span>
                                )}
                            </span>

                            {/* 4. Area / Quantity + Unit Selector */}
                            <span className="w-full relative flex gap-2">
                                <span className="flex-1 relative">
                                    <input
                                        className={`peer block bg-transparent ${errors.AreaSize ? "outline-1 outline-red-700" : "outline-1 outline-green-700"
                                            } w-full px-3 py-2 rounded-[10px] text-black input-field`}
                                        type="text"
                                        maxLength={40}
                                        placeholder="Enter Area / Quantity"
                                        {...register("AreaSize", { required: "Enter Quantity / Area" })}
                                    />
                                    <label
                                        htmlFor="input-field"
                                        className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.AreaSize ? "peer-focus:text-red-600" : "peer-focus:text-green-700"
                                            }`}
                                    >
                                        {errors.AreaSize ? errors.AreaSize.message : "Area Size / Pot Count"}
                                    </label>
                                </span>
                                <span className="w-36 relative">
                                    <select
                                        className={`peer block bg-transparent ${errors.AreaUnit ? "outline-1 outline-red-700" : "outline-1 outline-green-700"
                                            } w-full px-3 py-2 rounded-[10px] text-black input-field`}
                                        {...register("AreaUnit", { required: "Select unit" })}
                                    >
                                        <option value="">Unit</option>
                                        <option value="Acres">Acres</option>
                                        <option value="Hectares">Hectares</option>
                                        <option value="Square Feet">Square Feet</option>
                                        <option value="Square Meters">Square Meters</option>
                                        <option value="Kanal">Kanal</option>
                                        <option value="Marla">Marla</option>
                                    </select>
                                    <label
                                        htmlFor="input-field"
                                        className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.AreaUnit ? "peer-focus:text-red-600" : "peer-focus:text-green-700"
                                            }`}
                                    >
                                        {errors.AreaUnit ? errors.AreaUnit.message : "Unit"}
                                    </label>
                                </span>
                            </span>

                            {/* 4b. Field Count */}
                            <span className="w-full relative">
                                <input
                                    className={`peer block bg-transparent ${errors.FieldCount ? "outline-1 outline-red-700" : "outline-1 outline-green-700"
                                        } w-full px-3 py-2 rounded-[10px] text-black input-field`}
                                    type="number"
                                    min={1}
                                    placeholder="Enter Field Count"
                                    {...register("FieldCount", { required: "Enter Field Count", max: { value: 9999, message: "Max 9999" } })}
                                />
                                <label
                                    htmlFor="input-field"
                                    className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.FieldCount ? "peer-focus:text-red-600" : "peer-focus:text-green-700"
                                        }`}
                                >
                                    {errors.FieldCount ? errors.FieldCount.message : "Field Count"}
                                </label>
                            </span>

                            {/* 5. Soil Type */}
                            <span className="w-full relative">
                                <select
                                    className={`peer block bg-transparent ${errors.SoilType ? "outline-1 outline-red-700" : "outline-1 outline-green-700"
                                        } w-full px-3 py-2 rounded-[10px] text-black input-field`}
                                    {...register("SoilType")}
                                >
                                    <option value="Loamy">Loamy (Mera Mitti)</option>
                                    <option value="Clay">Clay (Chikni Mitti)</option>
                                    <option value="Sandy">Sandy (Retili Mitti)</option>
                                    <option value="PottingMix">Potting Mix (Commercial)</option>
                                </select>
                                <label
                                    htmlFor="input-field"
                                    className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.SoilType ? "peer-focus:text-red-600" : "peer-focus:text-green-700"
                                        }`}
                                >
                                    {errors.SoilType ? errors.SoilType.message : "Soil Type"}
                                </label>
                            </span>

                            {/* 6. Irrigation System */}
                            <span className="w-full relative">
                                <select
                                    className={`peer block bg-transparent ${errors.IrrigationType ? "outline-1 outline-red-700" : "outline-1 outline-green-700"
                                        } w-full px-3 py-2 rounded-[10px] text-black input-field`}
                                    {...register("IrrigationType")}
                                >
                                    <option value="Drip">Drip Irrigation</option>
                                    <option value="Flood">Flood Water System</option>
                                    <option value="Sprinkler">Sprinkler System</option>
                                    <option value="Manual">Manual Pipe / Watering Can</option>
                                </select>
                                <label
                                    htmlFor="input-field"
                                    className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.IrrigationType ? "peer-focus:text-red-600" : "peer-focus:text-green-700"
                                        }`}
                                >
                                    {errors.IrrigationType ? errors.IrrigationType.message : "Irrigation System"}
                                </label>
                            </span>

                        </div>

                        {/* Health Status & Dynamic Affected Field */}
                        <div className="p-4 bg-[#D7E8C0] rounded-2xl border-2 border-green-700 space-y-4">
                            <span className="w-full relative">
                                <select
                                    className={`peer block bg-transparent ${errors.HealthStatus ? "outline-1 outline-red-700" : "outline-1 outline-green-700"
                                        } w-full px-3 py-2 rounded-[10px] text-black input-field`}
                                    {...register("HealthStatus")}
                                >
                                    <option value="Healthy">💚 Healthy (Normal Growth)</option>
                                    <option value="YellowLeaves">🟡 Yellow Leaves (Peele Patte)</option>
                                    <option value="PestAttack">🐛 Pest Attack (Keede Ka Hamla)</option>
                                    <option value="Dry">🥀 Dry / Wilting (Murjha Raha Hai)</option>
                                </select>
                                <label
                                    htmlFor="input-field"
                                    className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.HealthStatus ? "peer-focus:text-red-600" : "peer-focus:text-green-700"
                                        }`}
                                >
                                    {errors.HealthStatus ? errors.HealthStatus.message : "Current Health Condition"}
                                </label>
                            </span>

                            {/* Dynamic Field: Shows only when Health is NOT Healthy */}
                            {watchHealthStatus && watchHealthStatus !== "Healthy" && (
                                <div className="pt-2">
                                    <span className="w-full relative">
                                        <input
                                            className={`peer block bg-transparent ${errors.AffectedPart ? "outline-1 outline-red-700" : "outline-1 outline-green-700"
                                                } w-full px-3 py-2 rounded-[10px] text-black input-field`}
                                            type="text"
                                            maxLength={60}
                                            placeholder="Enter Affected Part"
                                            {...register("AffectedPart", { required: "Please specify affected part" })}
                                        />
                                        <label
                                            htmlFor="input-field"
                                            className={`text-[#cccccc00] top-0 text-[0px] peer-focus:-top-[15px] peer-focus:text-[15px] peer-focus:bg-[#D7E8C0] inputLabel ${errors.AffectedPart ? "peer-focus:text-red-600" : "peer-focus:text-green-700"
                                                }`}
                                        >
                                            {errors.AffectedPart ? errors.AffectedPart.message : "Affected Part (e.g. Upper Leaves)"}
                                        </label>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Crop Image Upload */}
                        <div className="p-4 bg-[#D7E8C0] rounded-2xl border-2 border-green-700 space-y-3">
                            <p className="text-xs font-bold text-emerald-900 uppercase">Crop Image (Optional)</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleImageChange}
                                className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-700 file:text-white hover:file:bg-emerald-800 file:cursor-pointer cursor-pointer outline-1 outline-green-700 rounded-[10px]"
                            />
                            {cropImage && (
                                <div className="flex items-center gap-3">
                                    <img
                                        src={cropImage}
                                        alt="Crop preview"
                                        className="w-20 h-20 object-cover rounded-xl border-2 border-emerald-600 shadow-sm"
                                    />
                                    <div>
                                        <p className="text-xs text-emerald-800 font-semibold">Image ready</p>
                                        <p className="text-[10px] text-gray-600">{(cropImage.length / 1024).toFixed(1)} KB (compressed)</p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCropImage(null);
                                                if (fileInputRef.current) fileInputRef.current.value = "";
                                            }}
                                            className="text-[10px] text-red-600 hover:text-red-800 font-semibold mt-1 cursor-pointer"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-emerald-200 cursor-pointer disabled:opacity-50"
                        >
                            {loading ? "Saving..." : "Save & Enable Smart Tracking"}
                        </button>

                    </form>
                </div>

                {/* Right Column: Dynamic Live Preview Card */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6 bg-gradient-to-b from-emerald-900 to-emerald-950 text-white p-6 rounded-3xl shadow-xl border border-emerald-800">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">Live Preview</span>
                            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                {cropImage && (
                                    <img
                                        src={cropImage}
                                        alt="Crop preview"
                                        className="w-full h-40 object-cover rounded-xl border border-emerald-700 mb-3"
                                    />
                                )}
                                <h3 className="text-4xl font-bold text-white bebas-neue-regular">
                                    {watchCropName || "Crop Name"}
                                </h3>
                                <p className="text-xs text-emerald-300">
                                    Category: {watchCategory || "Not selected"}
                                </p>
                            </div>

                            <div className="bg-emerald-800/50 p-3 rounded-xl border border-emerald-700/50 text-xs space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-emerald-300">Age:</span>
                                    <span className="font-semibold">{calculatedAge ? `${calculatedAge} Days` : "N/A"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-emerald-300">GPS Setup:</span>
                                    <span className="font-semibold">{gpsCoords ? "✅ Location detected" : "⭕ Location Not Detected"}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-emerald-300">Health:</span>
                                    <span className="font-semibold text-emerald-400">
                                        {watchHealthStatus === "YellowLeaves" && "🟡 "}
                                        {watchHealthStatus === "PestAttack" && "🐛 "}
                                        {watchHealthStatus === "Dry" && "🥀 "}
                                        {(!watchHealthStatus || watchHealthStatus === "Healthy") && "💚 "}
                                        {watchHealthStatus || "Healthy"}
                                    </span>
                                </div>
                            </div>

                            <div className="p-3 bg-emerald-900/80 rounded-xl text-[11px] text-emerald-200 border border-emerald-800">
                                💡 <strong>Tip:</strong> Accurate data helps us give you better crop insights and alerts.
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
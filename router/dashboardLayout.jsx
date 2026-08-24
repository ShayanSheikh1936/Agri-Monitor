import { MenuIcon, Plus } from "lucide-react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, fdb } from "../src/features/auth/firebase";
import { useAuth } from "../src/features/auth/authContext";
import Footer from "../src/components/footer";
import Chatbot from "../src/components/chatbots";
import ToggleSwitch from "../src/components/toogleswitch";

export default function DashboardLayout() {
  const Navigate = useNavigate();
  const { currentUser } = useAuth();
  const [userCropData, setUserCropData] = useState(null);
  const [userData, setUserData] = useState();
  const [showmenu, setshowmenu] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        // Firestore se additional details lein
        const docRef = doc(fdb, "users", currentUser.uid);
        const cropRef = doc(fdb, "crops", currentUser.uid);
        const docSnap = await getDoc(docRef);
        const cropSnap = await getDoc(cropRef);
        console.log(cropSnap.data());

        if (cropSnap.exists()) {
          setUserCropData(cropSnap.data());
        }

        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      }
    };

    fetchUserData();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("Logged out successfully!");
      Navigate("/login");
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  return (
    <>
      <div className="bg-[var(--bg)] w-full h-screen">
        <aside className="flex border-r-1 border-[var(--text1)] ">
          <div className="bg-[#D7E8C0] flex-2 h-screen flex flex-col gap-3 pl-1 pr-2 overflow-x-hidden  ">
            <Link to="/dashboard" className="flex items-center gap-2 border-b-1 border-[var(--text1)] pb-1 ">
              <img src="logo1.svg" alt="" width={70} />
              <h1 className="text-4xl text-[var(--text1)]  [-webkit-text-stroke:0.4px_black] font-bold bebas-neue-regular">AGRI MONITOR</h1>
            </Link>
            <div className="flex gap-2 items-center">
            <Link to="/dashboard/addnewcrop" className="px-2 py-3 bg-[var(--text1)]  w-fit rounded-2xl flex gap-2 items-center transition-colors hover:bg-[#4a7028]">
              <Plus size={30} />
              <p>Add New</p>
            </Link>
            {/* Here is user crop data */}
            <div className="max-w-[180px] w-[100%] h-full flex items-center gap-2 overflow-x-auto scrollbar-none rounded-2xl">
              {userCropData?.crops?.length > 0 ? (
                userCropData.crops.map((crop, index) => (
                  <button
                    key={index}
                    className="shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-[var(--text1)] hover:border-[#4a7028] transition-colors cursor-pointer bg-[var(--text1)]/20"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({ name: crop.CropName || `Crop ${index + 1}`, x: rect.left + rect.width / 2, y: rect.bottom + 6 });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {crop.cropImage ? (
                      <img src={crop.cropImage} alt={crop.CropName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-xs font-bold text-[var(--text1)]">
                        {(crop.CropName || "C").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-xs text-gray-500 pl-2">No crops added yet</p>
              )}
            </div>
            {tooltip && createPortal(
              <span
                className="uppercase absolute px-2 py-1 text-[10px] font-semibold text-white bg-[var(--text1)] rounded-md whitespace-nowrap pointer-events-none z-[9999]"
                style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
              >
                {tooltip.name}
              </span>,
              document.body
            )}
            </div>
            <div className="h-100 rounded-2xl overflow-y-auto bg-[rgba(0,0,0,0.1)] p-2 scrollbar-thin scrollbar-track-[#D7E8C0] scrollbar-thumb-[#679936]">
              <ul className="grid gap-2">
                <p className="text-black font-semibold pl-2">Crop Management:</p>
                <NavLink to="/dashboard/cropprogress" className={({ isActive }) => isActive ? "bg-green-700 cursor-pointer text-white text-[18px] px-2  py-3 rounded-2xl" : "bg-[rgba(0,0,0,0.1)] cursor-pointer text-black text-[18px] px-2  py-3 rounded-2xl"} >
                  <p>Daily Crop Progress</p>
                </NavLink>
                <NavLink to={"/dashboard/cropsuggestion"} className={({ isActive }) => isActive ? "bg-green-700 cursor-pointer  text-white text-[18px] px-2  py-3 rounded-2xl" : "bg-[rgba(0,0,0,0.1)] cursor-pointer text-black text-[18px] px-2  py-3 rounded-2xl"} >
                  <p>Crop Suggestion</p>
                </NavLink>
                <p className="text-black font-semibold pl-2">Features</p>
                <NavLink to={"/dashboard/weatherforecast"} className={({ isActive }) => isActive ? "bg-green-700 cursor-pointer  text-white text-[18px] px-2  py-3 rounded-2xl" : "bg-[rgba(0,0,0,0.1)] cursor-pointer text-black text-[18px] px-2  py-3 rounded-2xl"} >
                  <p>Weather Forecast</p>
                </NavLink>
                <NavLink to={"/dashboard/weatheralerts"} className={({ isActive }) => isActive ? "bg-green-700 cursor-pointer  text-white text-[18px] px-2  py-3 rounded-2xl" : "bg-[rgba(0,0,0,0.1)] cursor-pointer text-black text-[18px] px-2  py-3 rounded-2xl"} >
                  <p>Weather Alerts</p>
                </NavLink>
                <NavLink to={"/dashboard/weatherwarnings"} className={({ isActive }) => isActive ? "bg-green-700 cursor-pointer  text-white text-[18px] px-2  py-3 rounded-2xl" : "bg-[rgba(0,0,0,0.1)] cursor-pointer text-black text-[18px] px-2  py-3 rounded-2xl"} >
                  <p>Weather Warnings</p>
                </NavLink>
                <p className="text-black font-semibold pl-2">Marketplace</p>
                <NavLink to={"/dashboard/marketplace"} className={({ isActive }) => isActive ? "bg-green-700 cursor-pointer  text-white text-[18px] px-2  py-3 rounded-2xl" : "bg-[rgba(0,0,0,0.1)] cursor-pointer text-black text-[18px] px-2  py-3 rounded-2xl"} >
                  <p>Current Market Rates</p>
                </NavLink>
                <p className="text-black font-semibold pl-2">Disaster Management</p>
                <NavLink to={"/dashboard/disasteralerts"} className={({ isActive }) => isActive ? "bg-red-500/90 cursor-pointer  text-white text-[18px] px-2  py-3 rounded-2xl" : "bg-red-500/90 cursor-pointer text-white text-[18px] px-2  py-3 rounded-2xl"} >
                  <p>Disaster Alerts</p>
                </NavLink>
              </ul>
            </div>
            <div className="mb-1 flex gap-2 items-center border-t-1 border-[var(--text1)] pt-2 justify-between">
              <div className="flex gap-2 items-center">
                <img data-src="https://cdn-icons-png.flaticon.com/512/149/149071.png" loading="lazy" src={userData?.displayphoto ? userData.displayphoto : "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt="profile image" className="w-10 h-10 rounded-full" />
                <span className="flex flex-col leading-4 ">
                  <p className="text-black capitalize">{userData?.fullname}</p>
                  <p className="text-[10px] text-black lowercase">{userData?.EmailAddress}</p>
                </span>
              </div>
              <div className="relative text-[var(--text1)]">
                <button className="cursor-pointer" onClick={() => setshowmenu(!showmenu)}>
                  <MenuIcon />
                </button>

                {showmenu && (
                  <div className="absolute p-2 bg-[var(--bg)] bottom-7 right-0 rounded-2xl">
                    <ul className="text-black text-[15px] flex flex-col items-start gap-1 text-nowrap">
                      <button onClick={handleLogout} className="text-red-600 cursor-pointer">Logout</button>
                    </ul>
                  </div>
                )}
              </div>

            </div>
          </div>
          <Outlet context={{ userData, userCropData }} />
        </aside>
        <Chatbot userinfo={userData} />
      </div>
    </>
  )
}
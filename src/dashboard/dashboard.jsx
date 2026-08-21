import { Plus } from "lucide-react";
import { use } from "react";
import { useOutletContext } from "react-router-dom";
import { Link } from "react-router-dom";
const Dashboard = () => {
  const { userData, userCropData } = useOutletContext();


  return (
    <>
      {
        !userCropData ? (
          <div className=" flex-6 flex justify-center items-center w-full h-screen overflow-y-auto flex-col gap-1">
            <Link to="/dashboard/addnewcrop" className="capitalize  bg-[#679936] rounded-2xl px-3 py-2  text-[var(--text-h)] transition-colors hover:bg-[#4a7028] flex items-center gap-2" ><Plus /> add crop</Link>
            <p className="text-[rgb(0,0,0,0.5)] capitalize text-[15px]">Nothing to add Crops yet</p>
          </div>
        ) : <div className="flex-6 flex p-2  w-full h-screen overflow-y-auto">
          <h1>HI Welcome to Agri Dashboard {userData?.fullname}</h1>
          <img src={userData?.displayphoto} alt=""  className="w-10 h-10" />
        </div>
      }
    </>
  );
};

export default Dashboard;
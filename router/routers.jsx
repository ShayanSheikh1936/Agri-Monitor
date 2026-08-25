import ProtectedRoute from "../src/features/protectedroutes";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./layout";
import Home from "../src/pages/home";
import Signup from "../src/pages/signup";
import Login from "../src/pages/login";
import Dashboard from "../src/dashboard/dashboard";
import PersonalInfo from "../src/personal information/personalinfo";
import ContactUs from "../src/pages/contactus";
import DashboardLayout from "./dashboardLayout";
import DashboardProtectedLayout from "../src/features/dashboardprotectedlayout"
import AddCropForm from "../src/dashboard/addnewcrop";
import Blogs from "../src/pages/blogs";
import Features from "../src/pages/features";
import Services from "../src/pages/services";
import ServiceDetail from "../src/pages/serviceDetail";
export default function Routers() {
    const setup = createBrowserRouter([
        {
            path: "/",
            // element: <Layout />,
            children: [
                {
                    index: true,
                    element: [<Home />, <Layout />]
                }, {
                    path: "/login",
                    element: <Login />
                }
                , {
                    path: "/signup",
                    element: <Signup />
                }, {
                    path: "/features",
                    element: [<Features />, <Layout />]
                },
                {
                    path: "/contact",
                    element: [<ContactUs />, <Layout/>]
                },
                {
                    path: "/blogs",
                    element:[<Blogs />, <Layout/>]
                },
                {
                    path: "/services/:serviceId",
                    element: <ServiceDetail />
                },
                {
                    path: "/personalinfo",
                    element: (<ProtectedRoute><PersonalInfo /></ProtectedRoute>)
                },
                {
                    path: "/dashboard/addnewcrop",
                    element: <AddCropForm />

                },
                {
                    path: "/dashboard",
                    element: (
                        <DashboardProtectedLayout>
                            <DashboardLayout />
                        </DashboardProtectedLayout>
                    ),
                    children: [
                        {
                            index: true,
                            element: <Dashboard />,
                        },
                        {
                            path: "/dashboard/cropprogress",
                            element: <h1 className="text-2xl flex-6">crop progress</h1>,
                        },
                        {
                            path: "/dashboard/cropsuggestion",
                            element: <h1>irrigation</h1>,
                        },
                        {
                            path: "/dashboard/weatherforecast",
                            element: <h1>nutrients</h1>,
                        },
                        {
                            path: "/dashboard/weatheralerts",
                            element: <h1>fertilizers</h1>,
                        },
                        {
                            path: "/dashboard/weatherwarnings",
                            element: <h1>pesticides</h1>,
                        },{
                            path: "/dashboard/marketplace",
                            element: <h1>pesticides</h1>,
                        },{
                            path: "/dashboard/disasteralerts",
                            element: <h1>pesticides</h1>,
                        }
                    ]
                }
            ]
        }
    ])

    return <RouterProvider router={setup} />
}
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
import NotFound from "../src/pages/notfound";
import { lazy, Suspense } from "react";

// Lazy-loaded so the Crop Timeline page is code-split out of the initial bundle
const CropTimelinePage = lazy(() => import("../src/dashboard/croptimeline"));
const CropProgressPage = lazy(() => import("../src/dashboard/cropprogress"));
const CropSuggestionPage = lazy(() => import("../src/dashboard/cropsuggestion"));
const WeatherForecastPage = lazy(() => import("../src/dashboard/weatherforecast"));
const WeatherAlertsPage = lazy(() => import("../src/dashboard/weatheralerts"));

// Shared lazy-route fallback spinner (matches the dashboard theme).
const PageFallback = (
    <div className="flex-6 grid place-items-center h-screen">
        <span className="w-10 h-10 rounded-full border-4 border-[var(--text1)] border-t-transparent animate-spin"></span>
    </div>
);

export default function Routers() {
    const setup = createBrowserRouter([
        {
            path: "/",
            // element: <Layout />,
            children: [
                {
                    // Public pages that share the Navbar + Footer chrome
                    element: <Layout />,
                    children: [
                        {
                            index: true,
                            element: <Home />
                        },
                        {
                            path: "/features",
                            element: <Features />
                        },
                        {
                            path: "/contact",
                            element: <ContactUs />
                        },
                        {
                            path: "/blogs",
                            element: <Blogs />
                        },
                        {
                            path: "/services",
                            element: <Services />
                        },
                    ]
                },
                {
                    // Service detail renders WITHOUT the Navbar/Footer chrome
                    path: "/services/:serviceId",
                    element: <ServiceDetail />
                },
                {
                    path: "/login",
                    element: <Login />
                }
                , {
                    path: "/signup",
                    element: <Signup />
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
                            element: (
                                <Suspense fallback={PageFallback}>
                                    <CropProgressPage />
                                </Suspense>
                            ),
                        },
                        {
                            path: "/dashboard/cropsuggestion",
                            element: (
                                <Suspense fallback={PageFallback}>
                                    <CropSuggestionPage />
                                </Suspense>
                            ),
                        },
                        {
                            path: "/dashboard/weatherforecast",
                            element: (
                                <Suspense fallback={PageFallback}>
                                    <WeatherForecastPage />
                                </Suspense>
                            ),
                        },
                        {
                            path: "/dashboard/weatheralerts",
                            element: (
                                <Suspense fallback={PageFallback}>
                                    <WeatherAlertsPage />
                                </Suspense>
                            ),
                        },
                        {
                            path: "/dashboard/weatherwarnings",
                            element: <h1 className="text-2xl flex-6">weather warnings</h1>,
                        },{
                            path: "/dashboard/marketplace",
                            element: <h1 className="text-2xl flex-6">marketplace</h1>,
                        },{
                            path: "/dashboard/disasteralerts",
                            element: <h1 className="text-2xl flex-6">disaster alerts</h1>,
                        },{
                            path: "/dashboard/croptimeline",
                            element: (
                                <Suspense fallback={PageFallback}>
                                    <CropTimelinePage />
                                </Suspense>
                            ),
                        }
                    ]
                },
                {
                    // Catch-all 404 route
                    path: "*",
                    element: <NotFound />
                }
            ]
        }
    ])

    return <RouterProvider router={setup} />
}
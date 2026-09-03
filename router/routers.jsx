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
import { Suspense } from "react";
import { lazyWithRetry } from "./lazyWithRetry";
import RouteErrorBoundary from "./RouteErrorBoundary";

// Lazy-loaded so each dashboard page is code-split out of the initial bundle.
// lazyWithRetry self-heals the "Failed to fetch dynamically imported module"
// error that hits visitors holding a stale bundle after a new deploy.
const CropTimelinePage = lazyWithRetry(() => import("../src/dashboard/croptimeline"));
const CropProgressPage = lazyWithRetry(() => import("../src/dashboard/cropprogress"));
const CropSuggestionPage = lazyWithRetry(() => import("../src/dashboard/cropsuggestion"));
const WeatherForecastPage = lazyWithRetry(() => import("../src/dashboard/weatherforecast"));
const WeatherAlertsPage = lazyWithRetry(() => import("../src/dashboard/weatheralerts"));
const DisasterAlertsPage = lazyWithRetry(() => import("../src/dashboard/disasteralerts"));
const MarketplacePage = lazyWithRetry(() => import("../src/dashboard/marketplace"));

// Shared lazy-route fallback spinner (matches the dashboard theme).
const PageFallback = (
    <div className="flex-6 grid place-items-center h-screen">
        <span className="w-10 h-10 rounded-full border-4 border-[var(--text1)] border-t-transparent animate-spin"></span>
    </div>
);

// Attached to the lazy leaf routes so the error renders inside the dashboard
// layout (sidebar stays mounted) instead of replacing the whole screen.
const PageError = <RouteErrorBoundary />;

export default function Routers() {
    const setup = createBrowserRouter([
        {
            path: "/",
            // Catch-all boundary for the eagerly imported routes.
            errorElement: <RouteErrorBoundary />,
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
                            errorElement: PageError,
                            element: (
                                <Suspense fallback={PageFallback}>
                                    <CropProgressPage />
                                </Suspense>
                            ),
                        },
                        {
                            path: "/dashboard/cropsuggestion",
                            errorElement: PageError,
                            element: (
                                <Suspense fallback={PageFallback}>
                                    <CropSuggestionPage />
                                </Suspense>
                            ),
                        },
                        {
                            path: "/dashboard/weatherforecast",
                            errorElement: PageError,
                            element: (
                                <Suspense fallback={PageFallback}>
                                    <WeatherForecastPage />
                                </Suspense>
                            ),
                        },
                        {
                            path: "/dashboard/weatheralerts",
                            errorElement: PageError,
                            element: (
                                <Suspense fallback={PageFallback}>
                                    <WeatherAlertsPage />
                                </Suspense>
                            ),
                        },
                        {
                            path: "/dashboard/marketplace",
                            errorElement: PageError,
                            element: (
                                <Suspense fallback={PageFallback}>
                                    <MarketplacePage />
                                </Suspense>
                            ),
                        },{
                            path: "/dashboard/disasteralerts",
                            errorElement: PageError,
                            element: (
                                <Suspense fallback={PageFallback}>
                                    <DisasterAlertsPage />
                                </Suspense>
                            ),
                        },{
                            path: "/dashboard/croptimeline",
                            errorElement: PageError,
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
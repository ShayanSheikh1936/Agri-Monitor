import { Link } from "react-router-dom";
import { Sprout } from "lucide-react";

export default function NotFound() {
    return (
        <section className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-6 px-4 text-center">
            <Sprout size={64} color="var(--text1)" />
            <h1 className="text-6xl bebas-neue-regular text-[var(--text1)]">404</h1>
            <p className="text-black text-lg max-w-md">
                Oops! The page you are looking for does not exist or has been moved.
            </p>
            <Link
                to="/"
                className="bg-green-700 text-white px-6 py-3 rounded-full font-semibold hover:bg-[#4a7028] transition-colors"
            >
                Back to Home
            </Link>
        </section>
    );
}

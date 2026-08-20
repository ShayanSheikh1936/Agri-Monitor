import { ArrowRight, CalendarDays, Clock, Sprout } from "lucide-react";
import background3 from "../assets/background3.png";

const posts = [
    {
        id: 1,
        featured: true,
        category: "Crop Health",
        title: "How AI Detects Wheat Rust Before It Spreads",
        excerpt: "Learn how early photo-based diagnosis can save entire fields from devastating rust outbreaks. Our AI scans leaf patterns in seconds.",
        date: "Jul 15, 2026",
        readTime: "6 min",
    },
    {
        id: 2,
        featured: false,
        category: "Smart Irrigation",
        title: "Daily Water Volume: Why Exact Liters Matter",
        excerpt: "Over-watering drains nutrients while under-watering stunts growth. See how weather-aware schedules optimize every drop.",
        date: "Jul 10, 2026",
        readTime: "5 min",
    },
    {
        id: 3,
        featured: false,
        category: "Nutrients",
        title: "NPK Timing Guide for Cotton Fields",
        excerpt: "Apply nitrogen, phosphorus, and potassium at the right growth stage to maximize boll count and fiber quality.",
        date: "Jul 5, 2026",
        readTime: "7 min",
    },
    {
        id: 4,
        featured: false,
        category: "Harvest",
        title: "Planning Labor Around AI Harvest Forecasts",
        excerpt: "Accurate maturity predictions help you schedule workers, storage, and market sales weeks ahead of harvest day.",
        date: "Jun 28, 2026",
        readTime: "4 min",
    },
];

function BlogCard({ post }) {
    return (
        <article className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-[#679936]/40 ">
            <div className="relative h-44 bg-gradient-to-br from-[#679936] to-[#4a7028]">
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <Sprout className="h-24 w-24 text-white" />
                </div>
                <span className="absolute left-4 top-4 rounded-full bg-[#679936] px-3 py-1 text-sm font-sans text-[var(--text-h)]">
                    {post.category}
                </span>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
                <h3 className="text-3xl text-black bebas-neue-regular leading-tight">{post.title}</h3>
                <p className="flex-1 font-sans text-black/80">{post.excerpt}</p>
                <div className="flex items-center gap-4 font-sans text-sm text-black/60">
                    <span className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {post.readTime} read
                    </span>
                </div>
            </div>
        </article>
    );
}

function FeaturedPost({ post }) {
    return (
        <article className="group overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl">
            <div className="flex flex-col lg:flex-row">
                <div className="relative min-h-[220px] flex-1 bg-gradient-to-br from-[#679936]/90 to-[#3d5c22] lg:min-h-[280px]">
                    <div className="absolute inset-0 flex items-center justify-center opacity-15">
                        <Sprout className="h-32 w-32 text-white" />
                    </div>
                    <span className="absolute left-6 top-6 rounded-full bg-[var(--bg)] px-4 py-1.5 text-sm font-semibold font-sans text-[#679936]">
                        Featured
                    </span>
                </div>
                <div className="flex flex-1 flex-col justify-center gap-4 p-8 lg:p-10">
                    <span className="w-fit rounded-full bg-[#679936] px-3 py-1 text-sm font-sans text-[var(--text-h)]">
                        {post.category}
                    </span>
                    <h3 className="text-4xl text-black bebas-neue-regular leading-tight lg:text-5xl">{post.title}</h3>
                    <p className="font-sans text-black/80">{post.excerpt}</p>
                    <div className="flex flex-wrap items-center gap-4 font-sans text-sm text-black/60">
                        <span className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            {post.date}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {post.readTime} read
                        </span>
                    </div>
                    <button className="mt-2 flex w-fit items-center gap-2 rounded-full bg-[#679936] px-6 py-2.5 font-sans text-[var(--text-h)] transition-colors hover:bg-[#4a7028]">
                        Read More
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </article>
    );
}

export default function BlogSec() {
    const featuredPost = posts.find((p) => p.featured);
    const gridPosts = posts.filter((p) => !p.featured);

    return (
        <section
            className="flex w-full flex-col gap-10 bg-[var(--bg)] bg-cover bg-center bg-no-repeat py-10"
            style={{ backgroundImage: `url(${background3})`, backgroundSize: "2000px 1400px" }}
        >
            <div className="container mx-auto flex flex-col gap-10 ">
                <div className="flex flex-col gap-3">
                    <div className="bg-[#679936] w-fit text-[var(--text-h)] p-4 pr-10 tracking-wider text-3xl bebas-neue-regular rounded-r-full md:p-5 md:pr-12 md:text-5xl">
                        Agri Insights & Updates
                    </div>
                    <p className="w-full pl-4 font-sans text-black md:w-1/2">
                        Stay ahead with expert tips on crop health, smart irrigation, and data-driven farming. Practical guides built for Pakistani growers.
                    </p>
                </div>

                {/* {featuredPost && <FeaturedPost post={featuredPost} />} */}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {gridPosts.map((post) => (
                        <BlogCard key={post.id} post={post} />
                    ))}
                </div>

                <div className="flex justify-center pt-4">
                    <button className="bebas-neue-regular rounded-full bg-[#679936] px-8 py-3 text-2xl text-[var(--text-h)] transition-colors hover:bg-[#4a7028]">
                        View All Articles
                    </button>
                </div>
            </div>
        </section>
    );
}

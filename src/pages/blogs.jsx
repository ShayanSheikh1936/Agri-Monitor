import { Calendar, Clock, ArrowRight, Leaf, Droplets, Cpu, Sun, Bug, Thermometer, Package, Sprout, TrendingUp } from "lucide-react";
import Footer from "../components/footer";

const blogPosts = [
  {
    id: 1,
    title: "Smart Irrigation Techniques for Water Conservation",
    category: "Technology",
    excerpt:
      "Discover how sensor-driven drip systems and AI-powered scheduling can cut water usage by up to 40%. Modern irrigation is transforming how farmers manage scarce water resources across arid and semi-arid regions.",
    date: "Jan 18, 2026",
    readTime: "6 min read",
    icon: <Droplets className="w-6 h-6" />,
    gradient: "from-[#2d8a6e] to-[#1a5c49]",
  },
  {
    id: 2,
    title: "Organic Farming: A Path to Sustainable Agriculture",
    category: "Sustainability",
    excerpt:
      "Organic practices restore soil biodiversity, eliminate synthetic chemical runoff, and open premium market channels for farmers. Learn how transitioning to organic methods can boost both ecology and economics on your farm.",
    date: "Feb 5, 2026",
    readTime: "5 min read",
    icon: <Leaf className="w-6 h-6" />,
    gradient: "from-[#4a8c3f] to-[#2e6128]",
  },
  {
    id: 3,
    title: "Understanding Soil Health for Better Crop Yields",
    category: "Soil Science",
    excerpt:
      "Healthy soil is the foundation of every successful harvest. Explore the key indicators of soil vitality—from microbial activity and organic matter content to pH balance—and how to improve them season after season.",
    date: "Feb 22, 2026",
    readTime: "7 min read",
    icon: <Sprout className="w-6 h-6" />,
    gradient: "from-[#8b6b2f] to-[#5e471e]",
  },
  {
    id: 4,
    title: "The Role of AI in Modern Agriculture",
    category: "Technology",
    excerpt:
      "From drone-based crop scouting to predictive yield models, artificial intelligence is reshaping farming at every scale. See real-world case studies where AI delivered measurable gains in productivity and resource efficiency.",
    date: "Mar 11, 2026",
    readTime: "8 min read",
    icon: <Cpu className="w-6 h-6" />,
    gradient: "from-[#3567a8] to-[#1e3f6e]",
  },
  {
    id: 5,
    title: "Seasonal Crop Planning: Maximizing Farm Productivity",
    category: "Planning",
    excerpt:
      "Strategic crop rotation and staggered planting windows help farmers spread risk, optimize labor, and keep fields productive year-round. Build a data-driven seasonal calendar that adapts to your local climate and market demand.",
    date: "Apr 3, 2026",
    readTime: "5 min read",
    icon: <TrendingUp className="w-6 h-6" />,
    gradient: "from-[#679936] to-[#4D7429]",
  },
  {
    id: 6,
    title: "Natural Pest Control Methods for Healthy Crops",
    category: "Crop Care",
    excerpt:
      "Beneficial insects, companion planting, and botanical sprays offer effective pest suppression without the downsides of synthetic chemicals. Build an integrated pest management plan that keeps your crops safe and your ecosystem balanced.",
    date: "May 19, 2026",
    readTime: "6 min read",
    icon: <Bug className="w-6 h-6" />,
    gradient: "from-[#c06030] to-[#8a3e1c]",
  },
  {
    id: 7,
    title: "Climate-Resilient Farming Practices",
    category: "Climate",
    excerpt:
      "Erratic rainfall, heat stress, and shifting growing seasons demand adaptive strategies. From cover cropping to rainwater harvesting, these practices help farms stay productive even under intensifying climate pressure.",
    date: "Jun 8, 2026",
    readTime: "7 min read",
    icon: <Thermometer className="w-6 h-6" />,
    gradient: "from-[#c4882e] to-[#8f5f1a]",
  },
  {
    id: 8,
    title: "Post-Harvest Management: Reducing Food Waste",
    category: "Management",
    excerpt:
      "Nearly a third of all food produced is lost before it reaches the consumer. Proper cooling, grading, packaging, and storage infrastructure can dramatically shrink post-harvest losses and improve farmer incomes.",
    date: "Jul 14, 2026",
    readTime: "4 min read",
    icon: <Package className="w-6 h-6" />,
    gradient: "from-[#5a7d8c] to-[#3a5460]",
  },
];

function BlogCard({ post }) {
  return (
    <article className="bg-white rounded-2xl shadow-md overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col">
      {/* Gradient header */}
      <div className={`bg-gradient-to-br ${post.gradient} px-5 py-8 relative overflow-hidden`}>
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />
        {/* Category badge */}
        <span className="relative inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
          {post.icon}
          {post.category}
        </span>
        {/* Title */}
        <h3 className="relative mt-4 text-white text-2xl leading-tight bebas-neue-regular tracking-wide">
          {post.title}
        </h3>
      </div>

      {/* Body */}
      <div className="px-5 py-5 flex flex-col flex-1">
        <p className="text-black/70 text-sm leading-relaxed flex-1">
          {post.excerpt}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-4 mt-5 pt-4 border-t border-black/10 text-xs text-black/50">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {post.date}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {post.readTime}
          </span>
        </div>

        {/* Read more */}
        <button className="mt-4 flex items-center gap-2 text-[#679936] hover:text-[#4a7028] font-semibold text-sm group transition-colors">
          Read More
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </article>
  );
}

export default function Blogs() {
  return (
    <>
      {/* Hero banner */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a1a] via-[#2d5a2d] to-[#0f2a0f]" />
        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#679936]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#4D7429]/20 rounded-full blur-3xl" />

        <div className="relative px-6 md:px-16 lg:px-24 py-24 md:py-32 flex flex-col items-center text-center gap-5">
          <span className="inline-flex items-center gap-2 bg-[#679936]/30 text-white text-sm font-semibold px-4 py-1.5 rounded-full uppercase tracking-widest">
            <Leaf className="w-4 h-4" />
            Our Blog
          </span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl text-white bebas-neue-regular tracking-wide leading-none">
            Agri Insights &amp; Updates
          </h1>
          <p className="max-w-2xl text-white/70 text-base md:text-lg leading-relaxed">
            Stay informed with the latest research, techniques, and innovations
            shaping the future of agriculture. Practical knowledge for modern
            farmers and agri-professionals.
          </p>
        </div>

        {/* Bottom wave */}
        <div className="relative">
          <svg viewBox="0 0 1440 60" className="w-full block" preserveAspectRatio="none">
            <path d="M0,60 L0,20 Q360,60 720,20 Q1080,-20 1440,20 L1440,60 Z" fill="#F2DEC4" />
          </svg>
        </div>
      </section>

      {/* Blog cards section */}
      <section className="bg-[#F2DEC4] px-6 md:px-12 lg:px-20 py-16">
        {/* Section heading */}
        <div className="flex flex-col gap-3 mb-12">
          <div className="bg-[#679936] w-fit text-white p-4 pr-10 tracking-wider text-2xl md:text-4xl bebas-neue-regular rounded-r-full">
            Latest Articles
          </div>
          <p className="text-black/60 pl-4 font-sans max-w-xl">
            Explore expert-written articles covering technology, sustainability,
            crop management, and everything in between.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="mt-16 bg-gradient-to-r from-[#679936] to-[#4D7429] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-white text-center md:text-left">
            <h2 className="text-3xl md:text-4xl bebas-neue-regular tracking-wide">
              Never Miss an Update
            </h2>
            <p className="text-white/80 mt-2 max-w-md">
              Subscribe to our newsletter and get the latest agriculture insights
              delivered straight to your inbox every week.
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="bg-white/90 text-black px-5 py-3 rounded-full w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button className="bg-white text-[#679936] hover:bg-white/90 rounded-full px-8 py-3 bebas-neue-regular tracking-wider text-lg whitespace-nowrap transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </section>

    </>
  );
}

import Link from "next/link";

const nav = [
  { label: "Categories", href: "#categories" },
  { label: "Deals", href: "/deals" },
  { label: "Journal", href: "/journal" },
  { label: "About", href: "/about" },
];

type Category = {
  name: string;
  blurb: string;
  slug: string;
  image: string;
  size: "large" | "small";
};

const categories: Category[] = [
  {
    name: "Electronics",
    blurb: "Phones, laptops, and everything that needs a charger",
    slug: "electronics",
    image: "https://picsum.photos/seed/atlas-electronics/900/700",
    size: "large",
  },
  {
    name: "Fashion",
    blurb: "Clothing, shoes, and accessories for every day",
    slug: "fashion",
    image: "https://picsum.photos/seed/atlas-fashion/700/560",
    size: "small",
  },
  {
    name: "Home & Living",
    blurb: "Furniture, decor, and things that make a house a home",
    slug: "home-living",
    image: "https://picsum.photos/seed/atlas-home/700/560",
    size: "small",
  },
  {
    name: "Beauty & Care",
    blurb: "Skincare, haircare, and everyday essentials",
    slug: "beauty-care",
    image: "https://picsum.photos/seed/atlas-beauty/700/560",
    size: "small",
  },
  {
    name: "Groceries",
    blurb: "Pantry staples and fresh goods, delivered",
    slug: "groceries",
    image: "https://picsum.photos/seed/atlas-groceries/700/560",
    size: "small",
  },
  {
    name: "Sports & Fitness",
    blurb: "Gear and kit for the days you show up",
    slug: "sports-fitness",
    image: "https://picsum.photos/seed/atlas-sports/700/560",
    size: "small",
  },
];

const trust = [
  { title: "Secure checkout", body: "Every order is encrypted end to end." },
  { title: "Fast delivery", body: "Most orders arrive within 2–4 days." },
  { title: "Easy returns", body: "30 days to change your mind, no questions." },
  { title: "Real support", body: "A person replies, not a queue." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-paper text-navy">
      {/* Header */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-5 md:px-10">
          <a href="/" className="font-display text-2xl tracking-tightest text-navy">
            Atlas
          </a>
          <nav className="hidden gap-8 font-body text-sm text-navy-soft md:flex">
            {nav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="focus-ring transition-colors hover:text-navy"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4 md:gap-5">
            <Link
              href="/login"
              className="focus-ring whitespace-nowrap border border-blue px-4 py-2 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="focus-ring whitespace-nowrap bg-blue px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-line bg-ice">
        <div className="mx-auto max-w-content px-6 py-16 md:px-10 md:py-24">
          <div className="max-w-2xl">
            <p className="mb-5 font-body text-sm font-medium text-blue">
              One store, sorted the way you actually shop.
            </p>
            <h1 className="font-display text-5xl leading-[1.05] tracking-tightest text-navy md:text-6xl">
              Everything you need, sorted by what you're looking for.
            </h1>
            <p className="mt-6 max-w-md font-body text-base leading-relaxed text-navy-soft">
              Pick a category below and we'll take you straight there.
              No digging through unrelated listings to find the one thing
              you came for.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <a
                href="#categories"
                className="focus-ring bg-blue px-7 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
              >
                Browse categories
              </a>
              <Link
                href="/signup"
                className="focus-ring bg-blue px-7 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="mx-auto max-w-content px-6 py-20 md:px-10">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
              Shop by category
            </h2>
            <p className="mt-2 font-body text-sm text-navy-soft">
              Choose where you want to start.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {categories.map((category) => {
            const isLarge = category.size === "large";
            return (
              <Link
                key={category.slug}
                href={`/dashboard?category=${encodeURIComponent(category.name)}`}
                className={`focus-ring group relative block overflow-hidden border border-line bg-navy transition-colors hover:border-blue ${
                  isLarge ? "sm:col-span-2 sm:row-span-2" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={category.image}
                  alt={category.name}
                  className={`w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105 group-hover:opacity-70 ${
                    isLarge ? "h-72 sm:h-full" : "h-56"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="font-display text-xl text-white md:text-2xl">
                    {category.name}
                  </h3>
                  <p className="mt-1.5 max-w-xs font-body text-sm text-white/80">
                    {category.blurb}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 font-body text-sm font-medium text-white">
                    Shop now
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-1">
                      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-blue py-16 text-white">
        <div className="mx-auto grid max-w-content grid-cols-2 gap-10 px-6 md:grid-cols-4 md:px-10">
          {trust.map((item) => (
            <div key={item.title}>
              <h3 className="font-display text-lg">{item.title}</h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-white/75">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter + Footer */}
      <footer className="border-t border-line bg-paper">
        <div className="mx-auto max-w-content px-6 py-16 md:px-10">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <h2 className="font-display text-2xl tracking-tightest text-navy">
                New arrivals, once a week.
              </h2>
              <p className="mt-3 max-w-sm font-body text-sm text-navy-soft">
                New categories, restocks, and the occasional discount code.
                No noise.
              </p>
              <form className="mt-6 flex max-w-sm gap-3">
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="focus-ring w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
                />
                <button
                  type="submit"
                  className="focus-ring whitespace-nowrap bg-navy px-5 py-3 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
                >
                  Subscribe
                </button>
              </form>
            </div>
            <div className="flex flex-col justify-center gap-4 sm:flex-row md:col-span-7 md:justify-end">
              <Link
                href="/contact"
                className="focus-ring bg-blue px-6 py-3 text-center font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
              >
                Contact us
              </Link>
              <Link
                href="/about"
                className="focus-ring border border-blue px-6 py-3 text-center font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
              >
                About us
              </Link>
            </div>
          </div>
          <div className="mt-16 flex flex-col gap-4 border-t border-line pt-8 font-body text-xs text-navy-soft md:flex-row md:items-center md:justify-between">
            <span>© {new Date().getFullYear()} Atlas Shop.</span>
            <div className="flex gap-6">
              <Link href="/privacy" className="focus-ring hover:text-navy">Privacy</Link>
              <Link href="/terms" className="focus-ring hover:text-navy">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

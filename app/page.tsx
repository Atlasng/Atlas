"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const nav = [
  { label: "Categories", href: "#categories" },
  { label: "Deals", href: "/deals" },
  { label: "Journal", href: "/journal" },
  { label: "About", href: "/about" },
];

type Category = {
  name: string;
  blurb: string;
  image: string;
};

const categories: Category[] = [
  { name: "Electronics", blurb: "Phones, laptops, gadgets & more", image: "https://picsum.photos/seed/atlas-electronics/700/560" },
  { name: "Fashion", blurb: "Clothing, shoes, bags & accessories", image: "https://picsum.photos/seed/atlas-fashion/700/560" },
  { name: "Beauty", blurb: "Skincare, hair, makeup & more", image: "https://picsum.photos/seed/atlas-beauty/700/560" },
  { name: "Home & Living", blurb: "Furniture, appliances & home essentials", image: "https://picsum.photos/seed/atlas-home/700/560" },
  { name: "Groceries", blurb: "Food, drinks & everyday essentials", image: "https://picsum.photos/seed/atlas-groceries/700/560" },
  { name: "Sports", blurb: "Fitness, football & sports equipment", image: "https://picsum.photos/seed/atlas-sports/700/560" },
  { name: "Computers", blurb: "Laptops, accessories & computer equipment", image: "https://picsum.photos/seed/atlas-computers/700/560" },
  { name: "Automotive", blurb: "Cars, parts & accessories", image: "https://picsum.photos/seed/atlas-automotive/700/560" },
];

const confidenceItems = [
  { emoji: "✓", title: "Verified Sellers", body: "Sellers are required to complete identity verification before opening a store." },
  { emoji: "🔐", title: "Secure Payments", body: "Your payments are processed securely." },
  { emoji: "🚚", title: "Reliable Delivery", body: "Get your orders delivered to locations across Nigeria." },
  { emoji: "↩️", title: "Buyer Protection", body: "If something goes wrong with your order, you can report the issue and our team can review it." },
];

const sellSteps = [
  { number: "1", title: "Create your account", body: "Set up your seller profile." },
  { number: "2", title: "Verify your identity", body: "Submit your required identification and seller information." },
  { number: "3", title: "Get verified", body: "Our team reviews your information." },
  { number: "4", title: "Start selling", body: "Once approved, you can open your store and list your products." },
];

const whyAtlas = [
  { title: "For Buyers", body: "Discover products from verified sellers and shop with greater confidence." },
  { title: "For Sellers", body: "Reach customers across Nigeria and grow your business online." },
  { title: "For Promoters", body: "Discover products you can promote and earn from qualifying sales." },
  { title: "For Everyone", body: "A marketplace built around trust, transparency and opportunity." },
];

const footerColumns = [
  {
    title: "Shop",
    links: [
      { label: "Categories", href: "#categories" },
      { label: "Today's Deals", href: "/deals" },
      { label: "Trending", href: "/trending" },
      { label: "New Arrivals", href: "/new-arrivals" },
    ],
  },
  {
    title: "Sell",
    links: [
      { label: "Start Selling", href: "/dashboard/open-shop" },
      { label: "Seller Verification", href: "/seller-verification" },
      { label: "Seller Dashboard", href: "/dashboard/shop" },
      { label: "Seller Policies", href: "/seller-policies" },
    ],
  },
  {
    title: "Earn",
    links: [
      { label: "Campaigns", href: "/campaigns" },
      { label: "Promote Products", href: "/promote" },
      { label: "Earnings", href: "/earnings" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Delivery", href: "/delivery" },
      { label: "Returns & Refunds", href: "/returns" },
      { label: "Report a Seller", href: "/report" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "Atlas",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const term = query.trim();
    router.push(term ? `/dashboard?search=${encodeURIComponent(term)}` : "/dashboard");
  }

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
            <p className="mb-5 font-body text-sm font-medium tracking-wide text-blue">
              ATLAS
            </p>
            <h1 className="font-display text-5xl leading-[1.05] tracking-tightest text-navy md:text-6xl">
              Everything you need. One trusted marketplace.
            </h1>
            <p className="mt-6 max-w-md font-body text-base leading-relaxed text-navy-soft">
              Shop from verified sellers across Nigeria. Discover great
              products, secure your payments, and get your orders delivered
              to you.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="focus-ring bg-blue px-7 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
              >
                Shop Now
              </Link>
              <Link
                href="/dashboard/open-shop"
                className="focus-ring border border-blue px-7 py-3.5 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
              >
                Sell on Atlas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-content px-6 py-14 md:px-10">
          <h2 className="font-display text-2xl tracking-tightest text-navy md:text-3xl">
            🔍 What are you looking for?
          </h2>
          <form onSubmit={handleSearch} className="mt-5 flex max-w-2xl gap-3">
            <div className="relative flex-1">
              <svg
                width="16"
                height="16"
                viewBox="0 0 18 18"
                fill="none"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy-soft"
              >
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for products, brands, or sellers…"
                aria-label="Search for products, brands, or sellers"
                className="focus-ring w-full border border-line bg-ice py-3.5 pl-11 pr-4 font-body text-sm text-navy placeholder:text-navy-soft/60"
              />
            </div>
            <button
              type="submit"
              className="focus-ring whitespace-nowrap bg-blue px-6 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="mx-auto max-w-content px-6 py-20 md:px-10">
        <h2 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
          Shop by Category
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={`/dashboard?category=${encodeURIComponent(category.name)}`}
              className="focus-ring group relative block overflow-hidden border border-line bg-navy transition-colors hover:border-blue"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={category.image}
                alt={category.name}
                className="h-40 w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105 group-hover:opacity-70 sm:h-48"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="font-display text-lg text-white">{category.name}</h3>
                <p className="mt-1 font-body text-xs text-white/80">{category.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/dashboard"
            className="focus-ring inline-block border border-blue px-7 py-3.5 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
          >
            View All Categories
          </Link>
        </div>
      </section>

      {/* Today's Deals */}
      <section className="border-y border-line bg-ice">
        <div className="mx-auto max-w-content px-6 py-16 text-center md:px-10">
          <h2 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
            🔥 Today's Deals
          </h2>
          <p className="mt-3 font-body text-lg text-navy">Great products. Better prices.</p>
          <p className="mx-auto mt-2 max-w-md font-body text-sm text-navy-soft">
            Discover products on special offers from sellers across Nigeria.
          </p>
          <Link
            href="/deals"
            className="focus-ring mt-8 inline-block bg-blue px-7 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
          >
            Shop Today's Deals
          </Link>
        </div>
      </section>

      {/* Trending */}
      <section>
        <div className="mx-auto max-w-content px-6 py-16 text-center md:px-10">
          <h2 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
            ⭐ Trending on Atlas
          </h2>
          <p className="mt-3 font-body text-lg text-navy">
            What Nigerians are shopping right now.
          </p>
          <p className="mx-auto mt-2 max-w-md font-body text-sm text-navy-soft">
            Discover popular products from trusted sellers.
          </p>
          <Link
            href="/trending"
            className="focus-ring mt-8 inline-block border border-blue px-7 py-3.5 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
          >
            Explore Trending Products
          </Link>
        </div>
      </section>

      {/* Shop With Confidence */}
      <section className="bg-blue py-20 text-white">
        <div className="mx-auto max-w-content px-6 md:px-10">
          <div className="text-center">
            <h2 className="font-display text-3xl tracking-tightest md:text-4xl">
              🛡️ Shop With Confidence
            </h2>
            <p className="mt-3 font-body text-lg">Your trust matters to us.</p>
            <p className="mx-auto mt-2 max-w-md font-body text-sm text-white/75">
              Every seller must verify their identity before they can sell on
              Atlas.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
            {confidenceItems.map((item) => (
              <div key={item.title}>
                <p className="text-2xl">{item.emoji}</p>
                <h3 className="mt-3 font-display text-lg">{item.title}</h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-white/75">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sell on Atlas */}
      <section className="mx-auto max-w-content px-6 py-20 md:px-10">
        <div className="flex flex-col justify-between gap-8 border border-line bg-navy p-8 md:flex-row md:items-center md:p-12">
          <div className="max-w-xl">
            <p className="font-body text-sm font-medium text-blue-light">
              🏪 Sell on Atlas
            </p>
            <h2 className="mt-2 font-display text-3xl text-white md:text-4xl">
              Take your business to the whole of Nigeria.
            </h2>
            <p className="mt-4 font-body text-sm leading-relaxed text-white/75">
              Whether you're a small business, growing brand, or established
              company, Atlas gives you a place to reach more customers.
              Create your store, list your products, receive orders and grow
              your business.
            </p>
          </div>
          <Link
            href="/dashboard/open-shop"
            className="focus-ring whitespace-nowrap self-start bg-blue px-7 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark md:self-center"
          >
            Start Selling
          </Link>
        </div>

        <div className="mt-12">
          <h3 className="font-body text-sm font-medium uppercase tracking-wide text-navy-soft">
            Before you can sell:
          </h3>
          <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
            {sellSteps.map((step) => (
              <div key={step.number}>
                <span className="font-display text-3xl text-blue">{step.number}</span>
                <h4 className="mt-2 font-display text-lg text-navy">{step.title}</h4>
                <p className="mt-1.5 font-body text-sm text-navy-soft">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verified Sellers detail */}
      <section className="border-y border-line bg-ice">
        <div className="mx-auto grid max-w-content grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2 md:px-10">
          <div>
            <h2 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
              ✓ Verified Sellers
            </h2>
            <p className="mt-3 font-body text-lg text-navy">
              Know who you're buying from.
            </p>
            <p className="mt-2 max-w-md font-body text-sm text-navy-soft">
              Every Atlas seller goes through our verification process before
              they can sell. Look for the Verified Seller badge when
              shopping.
            </p>
          </div>
          <div className="border border-line bg-paper p-6">
            <span className="inline-flex items-center gap-1.5 bg-blue px-3 py-1 font-body text-xs font-medium text-white">
              ✓ Verified Seller
            </span>
            <ul className="mt-4 space-y-2 font-body text-sm text-navy-soft">
              <li>✓ Identity verified</li>
              <li>✓ Seller information reviewed</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Report a seller */}
      <section>
        <div className="mx-auto max-w-content px-6 py-16 text-center md:px-10">
          <h2 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
            🚨 See Something Wrong?
          </h2>
          <p className="mt-3 font-body text-lg text-navy">Help us keep Atlas safe.</p>
          <p className="mx-auto mt-2 max-w-md font-body text-sm text-navy-soft">
            If you believe a seller or product is suspicious, you can report
            it to us. Our team can review the report, investigate the
            situation and take appropriate action when necessary.
          </p>
          <Link
            href="/report"
            className="focus-ring mt-8 inline-block border border-blue px-7 py-3.5 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
          >
            Report a Seller
          </Link>
        </div>
      </section>

      {/* Earn by promoting */}
      <section className="border-y border-line bg-ice">
        <div className="mx-auto max-w-content px-6 py-16 text-center md:px-10">
          <h2 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
            💰 Earn by Promoting Products
          </h2>
          <p className="mt-3 font-body text-lg text-navy">
            Have an audience? Turn it into income.
          </p>
          <p className="mx-auto mt-2 max-w-md font-body text-sm text-navy-soft">
            Discover products and campaigns available for promotion. Share
            products with your audience and earn when your promotion
            generates qualifying sales.
          </p>
          <Link
            href="/campaigns"
            className="focus-ring mt-8 inline-block bg-blue px-7 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
          >
            Explore Campaigns
          </Link>
        </div>
      </section>

      {/* Built for Nigeria */}
      <section className="bg-navy py-20 text-center text-white">
        <div className="mx-auto max-w-content px-6 md:px-10">
          <h2 className="font-display text-3xl tracking-tightest md:text-4xl">
            🇳🇬 Built for Nigeria
          </h2>
          <p className="mt-3 font-body text-lg">
            From Nigerian businesses to Nigerian customers.
          </p>
          <p className="mx-auto mt-2 max-w-md font-body text-sm text-white/75">
            Atlas is built to make buying and selling online easier, safer
            and more accessible across Nigeria.
          </p>
          <p className="mt-6 font-display text-2xl tracking-tightest text-blue-light">
            Buy. Sell. Grow.
          </p>
        </div>
      </section>

      {/* Why Atlas */}
      <section className="mx-auto max-w-content px-6 py-20 md:px-10">
        <div className="text-center">
          <h2 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
            🏆 Why Atlas?
          </h2>
          <p className="mt-3 font-body text-lg text-navy">More than a marketplace.</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          {whyAtlas.map((item) => (
            <div key={item.title}>
              <h3 className="font-display text-lg text-navy">{item.title}</h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-navy-soft">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-blue py-20 text-center text-white">
        <div className="mx-auto max-w-content px-6 md:px-10">
          <h2 className="font-display text-3xl tracking-tightest md:text-4xl">
            🚀 Your Marketplace Starts Here
          </h2>
          <p className="mx-auto mt-3 max-w-md font-body text-sm text-white/85">
            Find what you need. Sell what you have. Grow what you build.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="focus-ring bg-white px-7 py-3.5 font-body text-sm font-medium text-blue transition-colors hover:bg-ice"
            >
              Start Shopping
            </Link>
            <Link
              href="/dashboard/open-shop"
              className="focus-ring border border-white px-7 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-white hover:text-blue"
            >
              Start Selling
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-paper">
        <div className="mx-auto max-w-content px-6 py-16 md:px-10">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:grid-cols-6">
            <div className="col-span-2 sm:col-span-3 md:col-span-1">
              <span className="font-display text-2xl tracking-tightest text-navy">
                Atlas
              </span>
              <p className="mt-3 max-w-[200px] font-body text-sm text-navy-soft">
                The trusted marketplace built for Nigeria.
              </p>
            </div>
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="font-body text-sm font-medium text-navy">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-2.5 font-body text-sm text-navy-soft">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="focus-ring hover:text-navy">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-16 border-t border-line pt-8 font-body text-xs text-navy-soft">
            © {new Date().getFullYear()} Atlas. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}

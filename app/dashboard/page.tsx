"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (!session) {
        router.replace("/login");
        return;
      }
      setUser(session.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace("/login");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ice">
        <p className="font-body text-sm text-navy-soft">Loading...</p>
      </main>
    );
  }

  const name =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    "there";

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-5 md:px-10">
          <Link href="/" className="font-display text-2xl tracking-tightest text-navy">
            Atlas
          </Link>
          <button
            onClick={handleLogout}
            className="focus-ring font-body text-sm font-medium text-navy-soft transition-colors hover:text-navy"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-content px-6 py-16 md:px-10">
        <h1 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
          Welcome back, {name}.
        </h1>
        <p className="mt-3 max-w-md font-body text-sm text-navy-soft">
          This is your dashboard. We'll build out orders, saved items, and
          account settings here next.
        </p>
      </div>
    </main>
  );
}

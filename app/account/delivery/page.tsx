"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";

type MotorPark = { id: string; name: string };

export default function DeliveryAddressPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [state, setState] = useState("");
  const [parks, setParks] = useState<MotorPark[]>([]);
  const [parksLoading, setParksLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedParkId, setSelectedParkId] = useState<string | null>(null);
  const [selectedParkName, setSelectedParkName] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "delivery_state, delivery_motor_park_id, delivery_recipient_phone, motor_parks:delivery_motor_park_id(name)"
        )
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile) {
        setState(profile.delivery_state ?? "");
        setSelectedParkId(profile.delivery_motor_park_id ?? null);
        setSelectedParkName(
          (profile.motor_parks as unknown as { name: string } | null)?.name ?? null
        );
        setPhone(profile.delivery_recipient_phone ?? "");
      }

      setChecking(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state) {
      setParks([]);
      return;
    }
    setParksLoading(true);
    supabase
      .from("motor_parks")
      .select("id, name")
      .eq("state", state)
      .order("name")
      .then(({ data }) => {
        setParks(data ?? []);
        setParksLoading(false);
      });
  }, [state]);

  function chooseState(newState: string) {
    setState(newState);
    setSearch("");
    // Changing state invalidates whatever park was picked for the old one.
    setSelectedParkId(null);
    setSelectedParkName(null);
  }

  const visibleParks = parks.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  async function handleSave() {
    setError("");

    if (!userId) return;
    if (!state) {
      setError("Choose a state first.");
      return;
    }
    if (!selectedParkId) {
      setError("Select a motor park.");
      return;
    }
    if (!phone.trim()) {
      setError("Enter a phone number the delivery rider can reach you on.");
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        delivery_state: state,
        delivery_motor_park_id: selectedParkId,
        delivery_recipient_phone: phone.trim(),
      })
      .eq("id", userId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ice">
        <p className="font-body text-sm text-navy-soft">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-5 md:px-10">
          <Link href="/dashboard" className="font-display text-2xl tracking-tightest text-navy">
            Atlas
          </Link>
          <Link
            href="/cart"
            className="focus-ring font-body text-sm font-medium text-navy-soft transition-colors hover:text-navy"
          >
            ← Back to cart
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-6 py-16 md:px-10">
        <h1 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
          Delivery address
        </h1>
        <p className="mt-2 font-body text-sm text-navy-soft">
          Physical items are delivered to a motor park, not your home
          address. Pick the one closest to you.
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <label htmlFor="state" className="font-body text-sm font-medium text-navy">
              State
            </label>
            <select
              id="state"
              value={state}
              onChange={(e) => chooseState(e.target.value)}
              className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
            >
              <option value="">Select a state</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {state && (
            <div>
              <label htmlFor="parkSearch" className="font-body text-sm font-medium text-navy">
                Motor park in {state}
              </label>
              <input
                id="parkSearch"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name"
                className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
              />

              <div className="mt-3 max-h-72 overflow-y-auto border border-line">
                {parksLoading ? (
                  <p className="p-4 font-body text-sm text-navy-soft">Loading parks...</p>
                ) : visibleParks.length === 0 ? (
                  <p className="p-4 font-body text-sm text-navy-soft">
                    {parks.length === 0
                      ? `No motor parks listed for ${state} yet.`
                      : "No parks match your search."}
                  </p>
                ) : (
                  visibleParks.map((park) => {
                    const active = selectedParkId === park.id;
                    return (
                      <button
                        key={park.id}
                        type="button"
                        onClick={() => {
                          setSelectedParkId(park.id);
                          setSelectedParkName(park.name);
                        }}
                        className={`focus-ring block w-full border-b border-line px-4 py-3 text-left font-body text-sm transition-colors last:border-b-0 ${
                          active ? "bg-blue text-white" : "bg-paper text-navy hover:bg-ice"
                        }`}
                      >
                        {park.name}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {selectedParkName && (
            <div className="border border-blue bg-ice px-4 py-3">
              <p className="font-body text-sm text-navy">
                Selected: <span className="font-medium">{selectedParkName}</span>, {state}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="phone" className="font-body text-sm font-medium text-navy">
              Phone number for pickup
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="080..."
              className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
            />
          </div>

          {error && <p className="font-body text-sm text-red-700">{error}</p>}
          {saved && <p className="font-body text-sm text-blue">✓ Saved.</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="focus-ring w-full bg-blue px-5 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save delivery address"}
          </button>
        </div>
      </div>
    </main>
  );
}

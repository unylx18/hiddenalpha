"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  display_name: string | null;
  timezone: string | null;
  base_currency: string | null;
};

export default function Home() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);

      const { data } = await supabase
        .from("profiles")
        .select("display_name, timezone, base_currency")
        .eq("id", user.id)
        .single();

      setProfile(data);
      setLoading(false);
    }

    loadUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  if (loading) {
    return <main>Loading...</main>;
  }

  if (!email) {
    return (
      <main>
        <h1>hiddenalpha</h1>
        <p>Not logged in</p>
        <a href="/auth">Go to Login</a>
      </main>
    );
  }

  return (
    <main>
      <h1>hiddenalpha</h1>

      <h2>Welcome, {profile?.display_name ?? "Trader"} 👋</h2>

      <p>Email: {email}</p>
      <p>Timezone: {profile?.timezone}</p>
      <p>Base Currency: {profile?.base_currency}</p>

      <button onClick={handleLogout}>Logout</button>
    </main>
  );
}
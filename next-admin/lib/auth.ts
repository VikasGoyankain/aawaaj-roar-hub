import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";

const ADMIN_ROLES = ["President", "Regional Head", "University President"];

export async function requireAdminProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, region, created_at")
    .eq("id", user.id)
    .single<Profile>();

  if (error || !profile || !ADMIN_ROLES.includes(profile.role)) {
    redirect("/login");
  }

  return { supabase, user, profile };
}

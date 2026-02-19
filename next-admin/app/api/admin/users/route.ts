import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

const roleSchema = z.enum(["President", "Regional Head", "University President", "Volunteer"]);

const inviteSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  role: roleSchema,
  region: z.string().min(2),
});

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: roleSchema,
  region: z.string().min(2),
});

const deleteSchema = z.object({
  userId: z.string().uuid(),
});

async function requirePresident() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "President") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { userId: user.id };
}

export async function POST(request: Request) {
  const auth = await requirePresident();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const adminSupabase = createAdminSupabaseClient();
  const { data: inviteData, error } = await adminSupabase.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { role: parsed.data.role, region: parsed.data.region, full_name: parsed.data.full_name },
  });

  if (error || !inviteData.user) {
    return NextResponse.json({ error: error?.message ?? "Could not invite user" }, { status: 400 });
  }

  await adminSupabase.from("profiles").upsert(
    {
      id: inviteData.user.id,
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      role: parsed.data.role,
      region: parsed.data.region,
    },
    { onConflict: "id" },
  );

  await adminSupabase.from("audit_logs").insert({
    admin_id: auth.userId,
    action: "INVITE_USER",
    metadata: {
      invited_user_id: inviteData.user.id,
      role: parsed.data.role,
      region: parsed.data.region,
    },
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const auth = await requirePresident();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = updateRoleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const adminSupabase = createAdminSupabaseClient();
  const { error } = await adminSupabase
    .from("profiles")
    .update({ role: parsed.data.role as Role, region: parsed.data.region })
    .eq("id", parsed.data.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await adminSupabase.from("audit_logs").insert({
    admin_id: auth.userId,
    action: "UPDATE_ROLE",
    metadata: {
      target_user_id: parsed.data.userId,
      role: parsed.data.role,
      region: parsed.data.region,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const auth = await requirePresident();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const adminSupabase = createAdminSupabaseClient();
  const { error } = await adminSupabase.auth.admin.deleteUser(parsed.data.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await adminSupabase.from("profiles").delete().eq("id", parsed.data.userId);
  await adminSupabase.from("audit_logs").insert({
    admin_id: auth.userId,
    action: "DELETE_USER",
    metadata: { target_user_id: parsed.data.userId },
  });

  return NextResponse.json({ success: true });
}

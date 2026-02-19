"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  role: z.enum(["President", "Regional Head", "University President", "Volunteer"]),
  region: z.string().min(2, "Region is required"),
});

type FormData = z.infer<typeof schema>;

export function UserInviteForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      role: "Volunteer",
      region: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(null);
    setError(null);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Failed to invite user");
      return;
    }

    setMessage("Invitation sent and user profile created.");
    form.reset();
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <h2 className="text-lg font-semibold text-forest">Add User</h2>

      <div>
        <label className="text-sm font-medium">Full Name</label>
        <input className="mt-1 w-full" {...form.register("full_name")} />
        <p className="text-xs text-red-600 mt-1">{form.formState.errors.full_name?.message}</p>
      </div>

      <div>
        <label className="text-sm font-medium">Email</label>
        <input type="email" className="mt-1 w-full" {...form.register("email")} />
        <p className="text-xs text-red-600 mt-1">{form.formState.errors.email?.message}</p>
      </div>

      <div>
        <label className="text-sm font-medium">Role</label>
        <select className="mt-1 w-full" {...form.register("role") }>
          <option>President</option>
          <option>Regional Head</option>
          <option>University President</option>
          <option>Volunteer</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">Region</label>
        <input className="mt-1 w-full" {...form.register("region")} />
        <p className="text-xs text-red-600 mt-1">{form.formState.errors.region?.message}</p>
      </div>

      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="rounded-md bg-saffron px-4 py-2 font-semibold text-black hover:opacity-90 disabled:opacity-50"
      >
        {form.formState.isSubmitting ? "Inviting..." : "Invite User"}
      </button>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}

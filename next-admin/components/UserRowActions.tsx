"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/types";

const roles: Role[] = ["President", "Regional Head", "University President", "Volunteer"];

interface Props {
  userId: string;
  currentRole: Role;
  currentRegion: string;
}

export function UserRowActions({ userId, currentRole, currentRegion }: Props) {
  const [role, setRole] = useState<Role>(currentRole);
  const [region, setRegion] = useState(currentRegion);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const updateRole = () => {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role, region }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setError(payload.error ?? "Failed to update role");
        return;
      }

      router.refresh();
    });
  };

  const deleteUser = () => {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setError(payload.error ?? "Failed to delete user");
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <select value={role} onChange={(event) => setRole(event.target.value as Role)} className="w-44">
          {roles.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input value={region} onChange={(event) => setRegion(event.target.value)} className="w-40" />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={updateRole}
          disabled={isPending}
          className="rounded-md bg-saffron px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-60"
        >
          Save
        </button>
        <button
          type="button"
          onClick={deleteUser}
          disabled={isPending}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 disabled:opacity-60"
        >
          Delete
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

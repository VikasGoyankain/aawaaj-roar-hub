"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  timeoutMs: number;
}

export function InactivityLogout({ timeoutMs }: Props) {
  const timerRef = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const resetTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(async () => {
        await supabase.auth.signOut();
        router.push("/login");
      }, timeoutMs);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [router, timeoutMs]);

  return null;
}

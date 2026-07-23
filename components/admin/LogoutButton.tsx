"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await getSupabaseBrowser()?.auth.signOut();
        router.replace("/admin/login");
        router.refresh();
      }}
      className="rounded-brand border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
    >
      Cerrar sesión
    </button>
  );
}

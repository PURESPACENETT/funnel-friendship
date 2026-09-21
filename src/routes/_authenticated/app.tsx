import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  KanbanSquare,
  LayoutDashboard,
  Linkedin,
  ListChecks,
  LogOut,
  Radar,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

const NAV = [
  { to: "/app", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/app/demandes", label: "Demandes", icon: ListChecks, exact: false },
  { to: "/app/pipeline", label: "Pipeline", icon: KanbanSquare, exact: false },
  { to: "/app/prospection", label: "Prospection", icon: Radar, exact: false },
  { to: "/app/linkedin", label: "LinkedIn", icon: Linkedin, exact: false },
  { to: "/app/tarifs", label: "Tarifs", icon: SlidersHorizontal, exact: false },
] as const;

function AppLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="font-display text-base font-600 tracking-tight">PURE SPACE NETT</p>
            <p className="text-xs text-sidebar-foreground/70">Acquisition & suivi des demandes</p>
          </div>
          <div className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{
                  className: "bg-sidebar-accent text-sidebar-accent-foreground",
                }}
              >
                <item.icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="ml-1 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}

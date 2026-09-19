import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Espace interne — PURE SPACE NETT" },
      {
        name: "description",
        content: "Connexion à l'espace de suivi des demandes de PURE SPACE NETT.",
      },
      { property: "og:title", content: "Espace interne — PURE SPACE NETT" },
      {
        property: "og:description",
        content: "Connexion à l'espace de suivi des demandes de PURE SPACE NETT.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast.success("Compte créé. Vérifiez votre boîte mail pour confirmer l'adresse.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app", replace: true });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connexion impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-5 py-16">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-7 shadow-sm">
        <div className="flex items-center gap-2 text-primary">
          <Lock className="size-4" />
          <span className="text-xs font-600 uppercase tracking-wide">Espace interne</span>
        </div>
        <h1 className="mt-3 text-xl text-foreground">PURE SPACE NETT</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? "Connectez-vous pour suivre vos demandes." : "Créez votre accès."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "..." : mode === "signin" ? "Se connecter" : "Créer mon accès"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {mode === "signin" ? "Pas encore d'accès ? Créer un compte" : "J'ai déjà un accès"}
        </button>

        <Link
          to="/"
          className="mt-6 block text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Retour au formulaire public
        </Link>
      </div>
    </div>
  );
}

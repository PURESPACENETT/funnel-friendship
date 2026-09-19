import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — PURE SPACE NETT" },
      {
        name: "description",
        content: "Définissez un nouveau mot de passe pour votre espace PURE SPACE NETT.",
      },
      { property: "og:title", content: "Nouveau mot de passe — PURE SPACE NETT" },
      {
        property: "og:description",
        content: "Définissez un nouveau mot de passe pour votre espace PURE SPACE NETT.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    // Fallback: a recovery session may already be established.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else
        setTimeout(() => {
          setReady((r) => {
            if (!r) setInvalid(true);
            return r;
          });
        }, 3000);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Mot de passe mis à jour. Vous êtes connecté.");
      navigate({ to: "/app", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mise à jour impossible");
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
        <h1 className="mt-3 text-xl text-foreground">Nouveau mot de passe</h1>

        {invalid ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Ce lien est invalide ou a expiré. Demandez un nouveau lien de réinitialisation.
            </p>
            <Link
              to="/auth"
              className="block text-sm text-primary underline-offset-4 hover:underline"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : !ready ? (
          <p className="mt-4 text-sm text-muted-foreground">Vérification du lien...</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input
                id="confirm"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "..." : "Mettre à jour"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

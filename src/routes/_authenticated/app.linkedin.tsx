import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Copy, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LINKEDIN_CITIES,
  LINKEDIN_ROLES,
  LINKEDIN_TEMPLATES,
  linkedInSearchUrl,
} from "@/lib/linkedin-outreach";
import {
  addLinkedInContact,
  deleteLinkedInContact,
  listLinkedInContacts,
  updateLinkedInContactStatus,
} from "@/lib/linkedin.functions";

const LINKEDIN_STATUSES = [
  { value: "a_contacter", label: "À contacter" },
  { value: "contacte", label: "Contacté" },
  { value: "interesse", label: "Intéressé" },
  { value: "converti", label: "Converti" },
  { value: "ecarte", label: "Écarté" },
] as const;

type LinkedInStatus = (typeof LINKEDIN_STATUSES)[number]["value"];

export const Route = createFileRoute("/_authenticated/app/linkedin")({
  head: () => ({
    meta: [
      { title: "Prospection LinkedIn — PURE SPACE NETT" },
      {
        name: "description",
        content: "Recherches LinkedIn par ville et messages d'invitation, de suivi et de relance.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LinkedInPage,
});

function LinkedInPage() {
  const [roleValue, setRoleValue] = useState(LINKEDIN_ROLES[0]!.value);
  const [prenom, setPrenom] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [ville, setVille] = useState("Pantin");

  const role = LINKEDIN_ROLES.find((r) => r.value === roleValue) ?? LINKEDIN_ROLES[0]!;

  const messages = useMemo(
    () =>
      LINKEDIN_TEMPLATES.map((template) => ({
        template,
        text: template.build({
          prenom: prenom.trim() || "Madame, Monsieur",
          entreprise: entreprise.trim(),
          ville: ville.trim() || "Paris",
          role,
        }),
      })),
    [prenom, entreprise, ville, role],
  );

  const queryClient = useQueryClient();
  const fetchContacts = useServerFn(listLinkedInContacts);
  const addContact = useServerFn(addLinkedInContact);
  const setStatus = useServerFn(updateLinkedInContactStatus);
  const removeContact = useServerFn(deleteLinkedInContact);

  const contactsQuery = useQuery({
    queryKey: ["linkedin-contacts"],
    queryFn: () => fetchContacts(),
  });
  const contacts = contactsQuery.data?.contacts ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["linkedin-contacts"] });

  const addMutation = useMutation({
    mutationFn: (vars: {
      fullName: string;
      company?: string;
      city?: string;
      roleKey?: string;
      linkedinUrl?: string;
    }) => addContact({ data: vars }),
    onSuccess: () => {
      toast.success("Contact ajouté au suivi");
      setTrackName("");
      setTrackUrl("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: LinkedInStatus }) => setStatus({ data: vars }),
    onSuccess: (result) => {
      toast.success(
        result.alerted ? "Statut mis à jour — alerte email envoyée" : "Statut mis à jour",
      );
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeContact({ data: { id } }),
    onSuccess: () => {
      toast.success("Contact retiré du suivi");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const [trackName, setTrackName] = useState("");
  const [trackUrl, setTrackUrl] = useState("");

  const counts = useMemo(() => {
    const base: Record<string, number> = {};
    for (const status of LINKEDIN_STATUSES) base[status.value] = 0;
    for (const contact of contacts) base[contact.status] = (base[contact.status] ?? 0) + 1;
    return base;
  }, [contacts]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié`);
    } catch {
      toast.error("Copie impossible sur cet appareil");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-foreground">Prospection LinkedIn</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les recherches à ouvrir ville par ville, et les trois messages à envoyer : invitation,
          suivi, relance.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base text-foreground">1. Qui chercher</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {LINKEDIN_ROLES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setRoleValue(item.value)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                item.value === roleValue
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{role.why}</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base text-foreground">2. Recherches par ville</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Un clic ouvre LinkedIn avec la recherche déjà remplie. Comptez 15 à 20 invitations par
          jour maximum pour rester sous les limites de LinkedIn.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {LINKEDIN_CITIES.map((city) => (
            <div
              key={city}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <span className="text-sm text-foreground">{city}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setVille(city)}>
                  Messages
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={linkedInSearchUrl(role, city)}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Ouvrir
                    <ExternalLink className="ml-1 size-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base text-foreground">3. Messages à envoyer</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="prenom">Prénom du contact</Label>
            <Input
              id="prenom"
              value={prenom}
              onChange={(event) => setPrenom(event.target.value)}
              placeholder="Claire"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="entreprise">Entreprise</Label>
            <Input
              id="entreprise"
              value={entreprise}
              onChange={(event) => setEntreprise(event.target.value)}
              placeholder="Cabinet Duval"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ville">Ville</Label>
            <Input
              id="ville"
              value={ville}
              onChange={(event) => setVille(event.target.value)}
              placeholder="Pantin"
              className="mt-1"
            />
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {messages.map(({ template, text }) => (
            <article key={template.value} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-foreground">{template.label}</p>
                  <p className="text-xs text-muted-foreground">{template.hint}</p>
                </div>
                <div className="flex items-center gap-2">
                  {template.limit ? (
                    <span
                      className={`text-xs ${
                        text.length > template.limit ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {text.length}/{template.limit}
                    </span>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => copy(text, template.label)}>
                    <Copy className="mr-1 size-3.5" />
                    Copier
                  </Button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base text-foreground">4. Suivi des réponses</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajoutez la personne dès l'envoi de l'invitation, puis faites avancer son statut. Au
          passage en « Contacté », vous recevez une alerte par email.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {LINKEDIN_STATUSES.map((status) => (
            <span
              key={status.value}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
            >
              {status.label} : {counts[status.value] ?? 0}
            </span>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <Label htmlFor="track-name">Nom du contact</Label>
            <Input
              id="track-name"
              value={trackName}
              onChange={(event) => setTrackName(event.target.value)}
              placeholder="Claire Duval"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="track-url">Lien LinkedIn (optionnel)</Label>
            <Input
              id="track-url"
              value={trackUrl}
              onChange={(event) => setTrackUrl(event.target.value)}
              placeholder="https://www.linkedin.com/in/…"
              className="mt-1"
            />
          </div>
          <div className="flex items-end">
            <Button
              disabled={trackName.trim().length < 2 || addMutation.isPending}
              onClick={() =>
                addMutation.mutate({
                  fullName: trackName.trim(),
                  company: entreprise.trim() || undefined,
                  city: ville.trim() || undefined,
                  roleKey: role.value,
                  linkedinUrl: trackUrl.trim() || undefined,
                })
              }
            >
              Ajouter au suivi
            </Button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {contactsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun contact suivi pour l'instant. Ajoutez le premier ci-dessus.
            </p>
          ) : (
            contacts.map((contact) => (
              <article key={contact.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-foreground">
                      {contact.linkedin_url ? (
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="underline underline-offset-2"
                        >
                          {contact.full_name}
                        </a>
                      ) : (
                        contact.full_name
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[contact.company, contact.city].filter(Boolean).join(" — ") || "—"}
                      {contact.contacted_at
                        ? ` · contacté le ${new Date(contact.contacted_at).toLocaleDateString("fr-FR")}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(contact.id)}
                    aria-label="Retirer du suivi"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {LINKEDIN_STATUSES.map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      disabled={statusMutation.isPending || contact.status === status.value}
                      onClick={() =>
                        statusMutation.mutate({ id: contact.id, status: status.value })
                      }
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        contact.status === status.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

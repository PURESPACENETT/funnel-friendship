# Audit CRM PURE SPACE NETT — constats et plan de correction

Audit réalisé en lecture seule (code, schéma, logs de compilation). Aucune modification faite. Approuver ce plan lance les corrections dans l'ordre de priorité ci-dessous.

## Blocker

1. **Compilation en échec** — `src/routes/api/public/hooks/quote-request.ts`
   - `corsHeaders` peut renvoyer `Access-Control-Allow-Origin: undefined` (erreur de typage HeadersInit).
   - La route n'est pas reconnue dans l'arbre des routes (`FileRoutesByPath`) : l'aperçu reste bloqué sur la dernière version valide.
   - Reco : renvoyer un `Record<string,string>` avec repli sur `https://purespacenett.com`, laisser l'arbre se régénérer, vérifier le log de compilation.

2. **Chantier 1 inachevé : statut « Perdu » sans motif** — `src/lib/prospects.functions.ts` (`updateProspectStatus`)
   - `lossReason` n'est ni accepté ni enregistré (l'édition précédente a échoué). La colonne `loss_reason` n'est jamais remplie.
   - Reco : ajouter `lossReason` optionnel, l'exiger côté UI pour `perdu`, l'inclure dans l'activité.

## High

3. **Type d'opportunité jamais sauvegardé** — `updateProspect` ignore `opportunity_type` alors que l'UI propose le choix. Reco : l'ajouter au schéma de validation et à l'update.
4. **Formulaire public sans limitation de débit** — `submitQuoteRequest` (`src/lib/quotes.functions.ts`) est public, écrit avec les droits admin et déclenche 2 emails + un appel IA par envoi. Aucun rate limit ni anti-doublon : risque de spam, de coût IA et de réputation d'envoi. Reco : table de limitation par IP/email (ex. 5/heure), rejet des doublons identiques < 10 min, champ piège anti-bot.
5. **Secrets comparés de façon non constante** — `b2b-lead.ts`, `quote-request.ts`, `prospection-quotidienne.ts`, `automatisation-quotidienne.ts` utilisent `!==` / `includes`. Reco : comparaison par hash + `timingSafeEqual` (comme `cron-auth.ts`).
6. **Double envoi possible en prospection manuelle** — `sendOutreach` ne vérifie pas `outreach_sent_at` avant l'envoi ; un double clic ou un envoi après le cron repart si le brouillon a été régénéré (clé d'idempotence liée à `outreach_generated_at`). Reco : refuser si déjà envoyé sauf action explicite « renvoyer ».
7. **Ancienne fonction Deno résiduelle** — `supabase/functions/quote-request-webhook/` doublonne la route TanStack, fait échouer la vérification Deno dans les logs, et son rate limit en mémoire est inefficace. Reco : la supprimer (après confirmation qu'aucun site externe ne l'appelle encore).

## Medium

8. **Écritures non vérifiées en automatisation** — `prospection-daily.server.ts` / `automation-daily.server.ts` : les `update` après envoi ignorent l'erreur ; si la mise à jour échoue, la fiche reste « à contacter » et sera relancée (l'idempotence email limite le risque mais le statut est faux). Reco : contrôler l'erreur et journaliser.
9. **Journalisation email du cron hors helper** — insertion directe dans `prospect_activities` au lieu de `logProspectActivity` ; la clé de dédoublonnage à la minute ne protège pas d'un rejeu du cron. Reco : clé basée sur l'ID du prospect + `outreach_generated_at`.
10. **Alerte LinkedIn avec faux email** — `linkedin.functions.ts` passe l'URL LinkedIn comme `email` à `notifyOwner` ; la clé d'idempotence horaire peut fusionner/écarter des alertes. Reco : champ dédié `contact` et clé basée sur l'ID du contact.
11. **Dédoublonnage des prospects fragile** — seul `external_id` (Google) est contrôlé ; l'import collé crée des doublons (même nom/email). Pas d'index unique sur `external_id`. Reco : index unique partiel + contrôle email/nom à l'import.
12. **Cohérence des secrets cron** — `prospection-quotidienne` n'accepte que `x-cron-secret`, `automatisation-quotidienne` accepte aussi `Authorization: Bearer`. Reco : aligner les deux sur `authenticateCronRequest`.
13. **Pas de dossier de migrations versionné** — `supabase/migrations/` absent, `drizzle/` coexiste. Reco : documenter la source de vérité du schéma.

## Low

14. Dépréciations non bloquantes : `Marker` Google Maps (`prospect-map.tsx`), `.inputValidator()`.
15. `pricing_settings.maybeSingle()` sans filtre d'ID dans `notifyOwner` / `ownerEmail` (fragile si une 2e ligne apparaît).
16. Compte démo `demo.owner@purespacenett.com` encore présent.
17. États vides / erreurs de l'onglet Pipeline, « À faire aujourd'hui » et timeline à vérifier en navigateur après correction du Blocker 1 (non vérifiables tant que la compilation échoue).

## CI (`.github/workflows/ci.yml`)
Bun 1.3.5 → `bun test` → `lint` → `build`. Correcte mais : pas de vérification de types (`tsgo`) — l'erreur du Blocker 1 passerait si Vite compile ; un seul fichier de test (`prospects-shared.test.ts`). Reco : ajouter une étape typecheck et des tests sur la validation du formulaire et le calcul d'estimation.

## Points validés (OK)
- Espace privé protégé (`_authenticated`, SSR désactivé), fonctions privées sous `requireSupabaseAuth`, protection CSRF active.
- RLS actives sur toutes les tables, accès réservé au personnel ; rôles en table séparée, écritures directes interdites.
- Emails : idempotence présente partout, adresse de réponse contact@purespacenett.com, signature Amazigh forcée.
- Plafonds du cron respectés (6 préparés / 8 envoyés).

## Ordre d'exécution
1 → 2 → 3 → 6 → 4 → 5 → 7 (après confirmation) → Medium → CI → vérification navigateur connectée du pipeline, des tâches et du formulaire.

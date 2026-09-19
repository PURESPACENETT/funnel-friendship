# PURE SPACE NETT — Plateforme d'acquisition automatisée

Objectif : une plateforme privée qui capte les demandes (entreprises et particuliers), les qualifie, calcule un devis automatiquement et vous permet de suivre chaque prospect jusqu'à la signature.

## Ce que verront vos prospects

Une page publique de demande de devis, à lier depuis www.purespacenett.com.

Parcours en étapes courtes :
1. Type de client : Entreprise / Sous-traitance / Particulier
2. Type de local : bureaux, commerce, immeuble, chantier, logement...
3. Surface approximative et nombre de pièces / étages
4. Fréquence souhaitée : ponctuel, hebdomadaire, plusieurs fois par semaine, contrat annuel
5. Prestations : nettoyage courant, vitrerie, remise en état, fin de chantier, désinfection
6. Ville / code postal et date souhaitée
7. Coordonnées

À la fin : une estimation de prix immédiate affichée à l'écran, et un email de confirmation automatique au prospect.

## Ce que vous verrez (accès privé)

- **Tableau de bord** : nouvelles demandes du jour, valeur estimée du pipeline, taux de conversion, répartition B2B / particuliers
- **Liste des demandes** avec score de qualification automatique (surface, fréquence, récurrence = priorité haute), filtres et recherche
- **Fiche prospect** : toutes les réponses du formulaire, estimation, historique, notes, changement de statut
- **Statuts** : Nouveau → Contacté → Devis envoyé → Gagné / Perdu
- **Relances** : les demandes sans réponse depuis X jours remontent dans une liste « à relancer »
- **Réglages tarifs** : vous ajustez vous-même les prix au m², les coefficients de fréquence et les majorations par prestation, sans toucher au code

## Notifications

- Email automatique à vous à chaque nouvelle demande, avec le résumé et l'estimation
- Email de confirmation automatique au prospect
- Liste des demandes à traiter dans le tableau de bord

## Identité visuelle

Direction propre et professionnelle, adaptée au B2B du nettoyage : blanc dominant, un bleu-vert profond de confiance, typographie nette, beaucoup d'air. Pas d'effet « template d'agence ».

## Détails techniques

- Lovable Cloud activé : base de données (demandes, statuts, notes, grille tarifaire), authentification pour votre accès privé, RLS restreignant toutes les données aux comptes autorisés
- Formulaire public écrivant via une fonction serveur validée (Zod), sans exposer la base
- Moteur de devis : grille tarifaire stockée en base, calcul côté serveur, éditable depuis les réglages
- Emails via l'infrastructure email de Lovable (nécessite la configuration du domaine d'envoi — je vous guiderai)
- Routes : `/` page de demande de devis, `/merci`, `/auth`, `/app` tableau de bord, `/app/demandes`, `/app/demandes/$id`, `/app/tarifs`
- Métadonnées SEO propres sur les pages publiques

## Ordre de construction

1. Base de données + accès privé
2. Formulaire public multi-étapes + moteur de devis
3. Tableau de bord, liste, fiche prospect, statuts et notes
4. Réglages tarifs
5. Emails automatiques (vous + prospect)

## Non inclus pour l'instant

- Espace client pour vos clients B2B
- WhatsApp / SMS
- Planning d'interventions et facturation

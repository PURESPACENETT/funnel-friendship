# Roadmap

- [x] Formulaire public de devis + page /merci
- [x] Espace privé /app (dashboard, demandes, fiche, tarifs)
- [x] Emails automatiques (alerte + confirmation) via notify.purespacenett.com
- [x] Parcours mot de passe oublié (/auth + /reset-password)
- [x] Test création de compte + parcours complet (Playwright)
- [ ] L'utilisateur crée son vrai compte sur /auth (compte de démo existant : demo.owner@purespacenett.com)
- [x] Renseigner l'email d'alerte dans Réglages → Tarifs (contact@purespacenett.com)
- [x] Analyse automatique du besoin écrit (résumé qualifié IA sur la fiche prospect)
- [x] Pipeline par statut dans l'espace privé
- [x] Prospection : recherche d'entreprises locales (Google Maps), import de listes, message de premier contact rédigé par l'IA, envoi après relecture
- [x] Recherche d'adresse email : scan automatique du site web du prospect (Apollo abandonné, connexion impossible)
- [x] Carte des entreprises par ville/quartier avec rayon de recherche ajustable (1–50 km)
- [x] Bouton « Scanner leur site » sur la fiche prospect (affiche tous les emails trouvés)
- [x] Message de premier contact préparé automatiquement dès la recherche (envoi après relecture)
- [x] Test complet validé : recherche → message préparé → email envoyé → statut « Contacté »
- [x] Référencement local : pages Nettoyage Pantin / Paris / Île-de-France, données structurées, plan du site
- [ ] Compléter la fiche Google Business Profile existante (catégorie, téléphone, horaires, page Pantin et logo — validation par le gérant) et créer / compléter la fiche Pages Jaunes
- [x] Aligner le site sur la fiche Google existante : 2 rue Chevreul, horaires 7 h–22 h, lien Maps et identité visuelle
- [x] Prospection Paris + Île-de-France lancée (Paris 11e, Boulogne, Montreuil, Saint-Denis) + test d'envoi validé
- [x] Numéro de téléphone réel (07 59 48 30 21) sur les pages publiques
- [x] Prospection automatique du lundi au vendredi à 9h (Paris) : recherche, envoi des premiers messages, alerte email à chaque fiche passée en « Contacté »
- [x] Filtrage des adresses non démarchables (placeholders de site, dpo@, rgpd@, webmaster@…)

- [x] Page « Nettoyage de bureaux » (route, FAQ, données structurées, lien pied de page, plan du site)
- [x] Google Search Console : connexion rattachée, site vérifié (tag META), propriété ajoutée, plan du site envoyé

## CHANTIER G — Automatisation commerciale
- [x] Relances des demandes avec fenêtre de 3 jours et idempotence par dossier
- [x] Relances des prospects après 4 jours avec idempotence par prospect
- [x] Demande d'avis automatique 1 jour après un dossier gagné
- [x] Utiliser le lien Google actuel pour les demandes d'avis
- [x] Rapport commercial quotidien avec déduplication de l'envoi
- [x] Renforcer le endpoint d'automatisation : POST protégé, GET 405, réponses sans cache
- [ ] Vérifier les secrets et le déclenchement cron en production
- [ ] Exécuter un test bout-en-bout en production sans générer de relances réelles non souhaitées

- [x] Persister en base la date de demande d’avis et la date de première relance prospect pour empêcher les doublons sur plusieurs exécutions cron

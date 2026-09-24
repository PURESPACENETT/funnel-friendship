-- PURE SPACE NETT pricing baseline: 25 EUR/hour, VAT-exempt pricing basis.
-- Rendements supplied by the business:
-- bureaux 20 m2/h, commerce 20 m2/h, immeuble 20 m2/h,
-- logement 20 m2/h, chantier 15 m2/h, remise en état 15 m2/h.
--
-- Keep estimates exact to the hourly baseline: no frequency discount and no range spread.
-- Service surcharges are reset to 0 so the 25 EUR/hour basis is not double-counted.

UPDATE public.pricing_settings
SET
  min_price = 25,
  range_spread = 0,
  property_rates = jsonb_build_object(
    'bureaux', 1.25,
    'commerce', 1.25,
    'immeuble', 1.25,
    'chantier', 1.6667,
    'logement', 1.25,
    'autre', 1.25
  ),
  frequency_multipliers = jsonb_build_object(
    'ponctuel', 1,
    'hebdomadaire', 1,
    'plusieurs_semaine', 1,
    'quotidien', 1,
    'contrat_annuel', 1
  ),
  service_surcharges = jsonb_build_object(
    'nettoyage_courant', 0,
    'vitrerie', 0,
    'remise_en_etat', 0,
    'fin_de_chantier', 0,
    'desinfection', 0
  )
WHERE id = '00000000-0000-0000-0000-000000000001';

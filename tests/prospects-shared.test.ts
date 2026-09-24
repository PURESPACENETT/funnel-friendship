import { describe, expect, test } from "bun:test";
import {
  CONTACTED_STATUSES,
  PIPELINE_COLUMNS,
  PROSPECT_STATUS_VALUES,
  defaultOpportunityType,
  prospectPatchSchema,
  prospectSearchSchema,
  scoreProspect,
} from "@/lib/prospects-shared";

describe("CRM prospect rules", () => {
  test("covers every supported prospect status", () => {
    const pipelineStatuses = PIPELINE_COLUMNS.flatMap((column) => column.statuses);
    expect(new Set(pipelineStatuses)).toEqual(new Set(PROSPECT_STATUS_VALUES));
    expect(PROSPECT_STATUS_VALUES).toHaveLength(14);
  });

  test("contacted statuses are a subset of supported statuses", () => {
    expect(CONTACTED_STATUSES.every((status) => PROSPECT_STATUS_VALUES.includes(status))).toBe(true);
    expect(CONTACTED_STATUSES).toContain("contacte");
    expect(CONTACTED_STATUSES).toContain("converti");
    expect(CONTACTED_STATUSES).not.toContain("a_contacter");
  });

  test("defaults cleaning sectors to subcontracting", () => {
    expect(defaultOpportunityType("entreprise_nettoyage")).toBe("sous_traitance");
    expect(defaultOpportunityType("societe_proprete")).toBe("sous_traitance");
    expect(defaultOpportunityType("hôtel")).toBe("vente_directe");
    expect(defaultOpportunityType(null)).toBe("vente_directe");
  });

  test("scores a reachable local cleaning prospect within bounds", () => {
    const score = scoreProspect({
      postalCode: "93000",
      website: "https://example.test",
      phone: "0102030405",
      email: "contact@example.test",
      reviewsCount: 25,
      sector: "entreprise_nettoyage",
    });

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBe(100);
  });

  test("validates prospect search and patch inputs", () => {
    expect(
      prospectSearchSchema.parse({
        sector: "entreprise de nettoyage",
        area: "Pantin",
        radiusKm: 10,
      }),
    ).toEqual({
      sector: "entreprise de nettoyage",
      area: "Pantin",
      radiusKm: 10,
    });

    expect(() =>
      prospectSearchSchema.parse({
        sector: "x",
        area: "Pantin",
        radiusKm: 100,
      }),
    ).toThrow();

    expect(
      prospectPatchSchema.parse({
        id: "00000000-0000-4000-8000-000000000001",
        email: "contact@example.test",
        phone: "0102030405",
      }),
    ).toMatchObject({ email: "contact@example.test" });

    expect(() =>
      prospectPatchSchema.parse({
        id: "00000000-0000-4000-8000-000000000001",
        email: "not-an-email",
      }),
    ).toThrow();
  });
});

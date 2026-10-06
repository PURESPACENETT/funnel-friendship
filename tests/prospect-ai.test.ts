import { describe, expect, test } from "bun:test";

import { buildFallbackOutreachEmails, draftOutreachEmails } from "@/lib/prospect-ai.server";
import { qualifyQuoteRequest, qualificationSchema } from "@/lib/quote-ai.server";

describe("prospection email alternatives", () => {
  test("creates three distinct subcontracting proposals with the required signature", () => {
    const proposals = buildFallbackOutreachEmails({
      companyName: "Propreté Exemple",
      sector: "entreprise_nettoyage",
      city: "Pantin",
    });

    expect(proposals).toHaveLength(3);
    expect(new Set(proposals.map(({ subject }) => subject)).size).toBe(3);
    expect(new Set(proposals.map(({ body }) => body)).size).toBe(3);
    for (const proposal of proposals) {
      expect(proposal.body).toContain("sous-traitance");
      expect(proposal.body).not.toContain("vente directe");
      expect(proposal.body.endsWith("Amazigh — PURE SPACE NETT\nwww.purespacenett.com")).toBe(true);
    }
  });

  test("creates three direct-service proposals without inventing a known need", () => {
    const proposals = buildFallbackOutreachEmails({
      companyName: "Hôtel Exemple",
      sector: "hôtel",
    });

    expect(proposals).toHaveLength(3);
    expect(new Set(proposals.map(({ subject }) => subject)).size).toBe(3);
    for (const proposal of proposals) {
      expect(proposal.body).not.toContain("sous-traitance");
      expect(proposal.body).toContain("Amazigh — PURE SPACE NETT");
      expect(proposal.body).toContain("www.purespacenett.com");
    }
    expect(proposals[0]?.body).toContain("Avez-vous un besoin actuel");
  });

  test("falls back to checked local outreach when the direct OpenAI key is absent", async () => {
    const previousKey = process.env["OPENAI_API_KEY"];
    delete process.env["OPENAI_API_KEY"];

    try {
      const proposals = await draftOutreachEmails({
        companyName: "Entreprise Exemple",
        sector: "entreprise_nettoyage",
        city: "Pantin",
      });

      expect(proposals).toHaveLength(3);
      expect(
        proposals.every(({ body }) =>
          body.endsWith("Amazigh — PURE SPACE NETT\nwww.purespacenett.com"),
        ),
      ).toBe(true);
      expect(new Set(proposals.map(({ subject }) => subject)).size).toBe(3);
    } finally {
      if (previousKey === undefined) delete process.env["OPENAI_API_KEY"];
      else process.env["OPENAI_API_KEY"] = previousKey;
    }
  });

  test("qualification schema enforces actionable points and known urgency values", () => {
    const qualification = {
      summary: "Nettoyage régulier demandé pour des bureaux de 180 m² à Pantin.",
      keyPoints: ["180 m²", "Intervention hebdomadaire", "Démarrage souhaité en juin"],
      urgency: "moyenne",
      nextStep: "Confirmer les horaires et organiser une visite des locaux.",
    };

    expect(qualificationSchema.parse(qualification)).toEqual(qualification);
    expect(() =>
      qualificationSchema.parse({ ...qualification, keyPoints: ["180 m²", "Hebdomadaire"] }),
    ).toThrow();
    expect(() => qualificationSchema.parse({ ...qualification, urgency: "immédiate" })).toThrow();
    expect(() => qualificationSchema.parse({ ...qualification, summary: "" })).toThrow();
  });

  test("returns no qualification when OpenAI is not configured", async () => {
    const previousKey = process.env["OPENAI_API_KEY"];
    delete process.env["OPENAI_API_KEY"];

    try {
      await expect(
        qualifyQuoteRequest({
          clientType: "professionnel",
          propertyType: "bureaux",
          surfaceM2: 180,
          frequency: "hebdomadaire",
          services: ["entretien"],
          city: "Pantin",
          postalCode: "93500",
          contactName: "Camille Exemple",
          estimateMin: 120,
          estimateMax: 240,
        }),
      ).resolves.toBeNull();
    } finally {
      if (previousKey === undefined) delete process.env["OPENAI_API_KEY"];
      else process.env["OPENAI_API_KEY"] = previousKey;
    }
  });
});

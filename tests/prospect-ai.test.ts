import { describe, expect, test } from "bun:test";

import { buildFallbackOutreachEmails } from "@/lib/prospect-ai.server";

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
});


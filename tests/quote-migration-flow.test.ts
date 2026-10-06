import { describe, expect, mock, test } from "bun:test";

const sentEmails: Array<{ template: string; to: string; options: Record<string, unknown> }> = [];
const databaseUpdates: Array<{ table: string; values: Record<string, unknown>; id: string }> = [];

mock.module("@/lib/email-templates/send-email", () => ({
  sendTemplateEmail: async (template: string, to: string, options: Record<string, unknown>) => {
    sentEmails.push({ template, to, options });
    return { sent: true };
  },
}));

mock.module("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from(table: string) {
      return {
        update(values: Record<string, unknown>) {
          return {
            eq(_column: string, id: string) {
              databaseUpdates.push({ table, values, id });
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  },
}));

mock.module("ai", () => ({
  Output: { object: ({ schema }: { schema: unknown }) => ({ schema }) },
  streamText: () => ({
    output: Promise.resolve({
      summary: "Bureaux de 180 m² à entretenir chaque semaine.",
      keyPoints: ["180 m²", "Fréquence hebdomadaire", "Accès après 18 h"],
      urgency: "moyenne",
      nextStep: "Confirmer les horaires et organiser une visite.",
    }),
    usage: Promise.resolve({ inputTokens: 20, outputTokens: 30, totalTokens: 50 }),
  }),
}));

const { notifyNewRequest } = await import("@/lib/quote-notifications.server");
const { qualifyAndStore } = await import("@/lib/quote-ai.server");

describe("offline quote migration flow", () => {
  test("sends confirmation and owner notification only through the email stub", async () => {
    sentEmails.length = 0;

    await notifyNewRequest({
      id: "synthetic-quote-1",
      estimate: { min: 120, max: 240 },
      score: 75,
      ownerEmail: "owner@example.test",
      input: {
        clientType: "entreprise",
        propertyType: "bureaux",
        surfaceM2: 180,
        frequency: "hebdomadaire",
        services: ["nettoyage_courant"],
        city: "Pantin",
        postalCode: "93500",
        contactName: "Camille Exemple",
        email: "camille@example.test",
        phone: "0100000000",
        desiredDate: "2026-11-01",
        companyName: "Exemple SAS",
        message: "Accès après 18 h",
      },
    });

    expect(sentEmails.map(({ template }) => template)).toEqual([
      "request-confirmation",
      "new-request-owner",
    ]);
    expect(sentEmails.map(({ to }) => to)).toEqual([
      "camille@example.test",
      "owner@example.test",
    ]);
    expect(sentEmails.every(({ options }) => options.idempotencyKey)).toBe(true);
  });

  test("persists a valid mocked GPT qualification to the Supabase stub", async () => {
    const previousKey = process.env["OPENAI_API_KEY"];
    process.env["OPENAI_API_KEY"] = "test-key";
    databaseUpdates.length = 0;

    try {
      const ok = await qualifyAndStore("synthetic-quote-1", {
        clientType: "entreprise",
        propertyType: "bureaux",
        surfaceM2: 180,
        frequency: "hebdomadaire",
        services: ["nettoyage_courant"],
        city: "Pantin",
        postalCode: "93500",
        contactName: "Camille Exemple",
        estimateMin: 120,
        estimateMax: 240,
      });

      expect(ok).toBe(true);
      expect(databaseUpdates).toHaveLength(1);
      expect(databaseUpdates[0]).toMatchObject({
        table: "quote_requests",
        id: "synthetic-quote-1",
        values: {
          ai_summary: "Bureaux de 180 m² à entretenir chaque semaine.",
          ai_urgency: "moyenne",
          ai_next_step: "Confirmer les horaires et organiser une visite.",
        },
      });
      expect(databaseUpdates[0]?.values["ai_key_points"]).toHaveLength(3);
    } finally {
      if (previousKey === undefined) delete process.env["OPENAI_API_KEY"];
      else process.env["OPENAI_API_KEY"] = previousKey;
    }
  });
});


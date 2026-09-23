import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { quoteRequestSchema } from "@/lib/quotes-shared";
import { submitQuoteRequest } from "@/lib/quotes.functions";

const secretSchema = z.string().min(32).max(256);

export const Route = createFileRoute("/api/public/hooks/b2b-lead")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () =>
        new Response("Method Not Allowed", {
          status: 405,
          headers: { Allow: "POST", "X-Robots-Tag": "noindex, nofollow" },
        }),
      POST: async ({ request }) => {
        const expected = process.env["B2B_LEAD_WEBHOOK_SECRET"] ?? "";
        const provided = request.headers.get("x-b2b-lead-secret") ?? "";
        if (!expected || !secretSchema.safeParse(expected).success || provided !== expected) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Requête invalide" }, { status: 400 });
        }

        const parsed = quoteRequestSchema.safeParse(body);
        if (!parsed.success || parsed.data.clientType !== "entreprise") {
          return Response.json({ error: "Données B2B invalides" }, { status: 400 });
        }

        try {
          const result = await submitQuoteRequest({ data: parsed.data });
          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("B2B lead import failed", error);
          return Response.json({ error: "Enregistrement impossible" }, { status: 500 });
        }
      },
    },
  },
});

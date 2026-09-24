import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily automatic prospecting round, triggered by the scheduler.
 * Protected by a shared secret header — nothing runs without it.
 */
export const Route = createFileRoute("/api/public/hooks/prospection-quotidienne")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { secretMatches, providedCronSecret } = await import("@/lib/secret-compare.server");
        const accepted = [
          process.env["PROSPECTION_CRON_SECRET"],
          process.env["LOVABLE_CRON_SECRET"],
        ];
        if (!secretMatches(providedCronSecret(request), accepted)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const { runDailyProspection } = await import("@/lib/prospection-daily.server");
          const result = await runDailyProspection();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("daily prospection failed", error);
          return new Response(
            JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});

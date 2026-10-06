# Client Acquisition Magic

Que penses-tu du texte suivant, on peut faire un projet pareil nous même ?

"Systèmes automatisés d'acquisition clients — Tunnels de conversion et automatisation sur mesure

Digital Renforcy conçoit et déploie des systèmes automatisés d'acquisition clients sur-mesure. Tunnels de conversion, landing pages haute performance, formulaires intelligents, chatbots IA et automatisation complète du parcours prospect. Chaque contact est capté, qualifié et transmis automatiquement."

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://funnel-friendship.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/26b9f4d5-20ac-40f1-abaf-4e43b025acc6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Server-side AI

Set `OPENAI_API_KEY` in a local `.env.local` file for direct OpenAI API access. Prospecting email drafts use GPT-6 Luna, and quote qualification uses GPT-6.1 Sol through the Responses API. GPT-6 Astra is reserved for a future complex-analysis workflow and is not currently called by the app.

The Supabase client uses `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; server-side admin operations also require `SUPABASE_SERVICE_ROLE_KEY`. The browser build uses the corresponding `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` variables.

`LOVABLE_API_KEY` remains necessary for existing Lovable-managed email, Google Maps, and Clay integrations. It is no longer used for AI model requests. `LOVABLE_SEND_URL` is an optional email endpoint override. The notification recipient is configured in the Supabase pricing settings, not as an environment variable.

// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "path";
import { loadEnv, type Plugin } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Server routes (email sending, etc.) read non-VITE_ env vars from
// process.env. The default template only loads VITE_-prefixed vars, so load
// the rest here, server-side only — never added to the client define block.
function serverEnvPlugin(): Plugin {
  return {
    name: "server-env",
    config(_, { mode }) {
      const serverEnv = loadEnv(mode, process.cwd(), "");
      Object.assign(process.env, serverEnv);

      // Lovable Cloud exposes the managed connection as server variables in
      // production. Mirror only the public values so Vite can embed them in
      // the browser bundle when their VITE_ aliases are not injected.
      // Assigning undefined to process.env stores the string "undefined",
      // so only copy real URLs, with the public project values as fallback.
      const isUrl = (v?: string) => !!v && /^https?:\/\//.test(v);
      const url = [process.env['VITE_SUPABASE_URL'], process.env['SUPABASE_URL']].find(isUrl)
        ?? "https://wewihwzeesxhugnupkpm.supabase.co";
      const key = [process.env['VITE_SUPABASE_PUBLISHABLE_KEY'], process.env['SUPABASE_PUBLISHABLE_KEY']]
        .find((v) => !!v && v !== "undefined")
        ?? "sb_publishable_E8iNDHPwmHLdi8aBiYT3rw_W-FqbNOF";
      process.env['VITE_SUPABASE_URL'] = url;
      process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] = key;
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [serverEnvPlugin()],
    resolve: {
      alias: {
        // Pin entities deep imports to the hoisted v4.5.0 copy — a nested v7
        // breaks SSR (no ./lib/decode.js).
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(__dirname, "node_modules/entities"),
      },
    },
  },
});

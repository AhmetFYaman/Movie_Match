# Deploy MovieMatch to Vercel

The app uses standard Next.js hosting in the Vercel `movie-match` project, connected to the `Movie_Match` GitHub repository.

## Live routing

- Public URL: https://ahmetyaman.site/movie-match
- App origin: https://movie-match-beige.vercel.app/movie-match
- `src/lib/paths.ts` defines `/movie-match` for both Next.js `basePath` and browser API requests.
- The separate Portfolio repository rewrites `/movie-match/:path*` to this app origin, including scripts, images, and API requests. The main domain remains attached to the portfolio; no DNS changes are needed.
- Pushes to each repository's `main` branch deploy that project independently. Keep the prefix and portfolio rewrite in sync if either changes.

## Recreating the deployment

1. Create your GitHub repository and push the project. Inspect the staged files first: `.env.local`, `node_modules`, `.next`, and the backup archive must not be included. Only `.env.example` should be committed from the environment files.
2. Import that repository into Vercel. Select **Next.js**, the folder containing `package.json` as the root, and **Node.js 24.x**. Keep the default output directory; build with `npm run build` and install with `npm ci`.
3. Add **TMDB_READ_ACCESS_TOKEN** in Vercel's environment variables for Production and Preview. Enter the TMDB Read Access Token, not the shorter API key. Never use a `NEXT_PUBLIC_` prefix. Rotate the token previously pasted into chat before launch.
4. Keep Fluid Compute enabled. Both recommendation entry points declare `maxDuration = 120` to accommodate the bounded TMDB detail requests. No separate server, database, or persistent disk is required.
5. Deploy. Changing an environment variable afterward requires a new deployment.
6. Test the deployed URL: Browse posters, autocomplete, select a movie, Mood search, sliders, and mobile layout. Confirm `/.env.local` returns 404 and secrets are absent from browser responses. Keep API-usage and function-usage limits in mind; consider hosting-level rate limiting before a widely public launch.

## Local preflight

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

The token is read only by the server. Visitors can still inspect frontend HTML/CSS/JavaScript and call public API routes. A private repository hides source from GitHub visitors; it does not hide browser-delivered code.

## If deployment fails

- **Missing token / TMDB authentication error:** verify the environment name and selected deployment environment, then redeploy. Do not paste credentials into logs or source.
- **Function timeout:** check that Fluid Compute is enabled and the route's 120-second allowance is supported by your project. Individual TMDB requests already have timeouts; temporary upstream failures can still affect results.
- **Images missing:** `next.config.ts` already allows TMDB's image host. Check upstream availability and Vercel image usage rather than broadening it to every host.

Official references: [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [function duration](https://vercel.com/docs/functions/configuring-functions/duration), [environment variables](https://vercel.com/docs/environment-variables).

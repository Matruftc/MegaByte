# MegaByte

MegaByte is a collection of interactive learning academies and project demos. The repository root is the website entry point, so it can be served directly by GitHub Pages or another static host.

## Run locally

```sh
npm install
npm start
```

Open `http://localhost:8001`. The local Node server serves the site and its API routes.

## Main projects

- `PY_PRJ/website` — Python Academy
- `JAVA_PRJ` — Java Academy
- `AWS_PRJ` — AWS Academy (cloud foundations, lessons, quizzes and service map)
- `DB_PRJ/website` — Database Academy
- `SF_PRJ/website` — Snowflake Academy
- `public` — published static site files used by Capacitor
- `android` — Android application project

To refresh the Android web bundle after changing published files, run `npx cap sync android`.

## Deploy with accounts on Netlify

The backend uses MongoDB Atlas and Netlify Functions. Static-only hosting does not run login, saved progress, or email APIs.

```sh
npm ci
npm test
npm run netlify:login
npm run netlify:link
npm run dev:netlify
```

Import this repository into Netlify or link an existing site. Deploy using the checked-in `netlify.toml`; configure MONGODB_URI and MONGODB_DB in the site’s backend environment before deploying. See [BACKEND_DESIGN.md](BACKEND_DESIGN.md) for database setup, environment variables, deployment validation, and current progress-sync limitations.

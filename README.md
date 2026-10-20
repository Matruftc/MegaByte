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

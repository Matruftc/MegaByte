# MegaByte founder portfolios

React + TypeScript implementation of the creator portfolio design, adapted to Matru and Bisal using `assets/megabyte-data.js`.

From the repository root:

```sh
npm install --prefix portfolio-app
npm run build --prefix portfolio-app
npm start
```

Open http://localhost:8001/portfolio.html. Founder deep links use `#matru` and `#bisal`.

The build checks TypeScript, builds the application into `assets/portfolio/`, and refreshes both root and `public/` portfolio entry points and generated assets. Do not edit the generated bundles directly. Shared founder/project data remains in `assets/megabyte-data.js`. Configured founder photos replace the emblem automatically. Google Fonts supplies Kanit with a system fallback.

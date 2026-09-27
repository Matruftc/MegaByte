# ETL/ELT Academy · MegaByte

A self-contained learning hub for practical data engineering. It runs as a static site with no package installation or API keys.

## Run locally

Open `index.html`, or serve this directory over HTTP:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. The MegaByte landing page links to this academy at `ETL_ELT_PRJ/`.

## Included

- 15 guided modules, from ingestion fundamentals to backfills and a capstone
- ETL/ELT pipeline lab with sample source data, transformation, deduplication, validation, and rejected-row output
- Data quality lab for uniqueness, email format, required values, and freshness
- 12-question knowledge check with explanations and saved best score
- Local progress tracking, theme toggle, responsive layout, and MegaByte home link

Progress is stored in this browser using local storage. Course content is in `data.js`; the interface and interactions are in `app.js` and `styles.css`.

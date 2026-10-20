# MegaByte contact email setup

The contact form submits to `api/submit-query.js`. This is a Vercel Node.js Function, served from the project's `/api` directory. It sends the query to the MegaByte inbox and then sends the visitor a branded acknowledgment. The acknowledgment includes an animated GIF version of the MegaByte M/B mark, the wordmark, a signature from Matru (Mega) & Bisal (Byte), and a do-not-reply notice. Some email clients may show only the first GIF frame; the wordmark and alt text remain readable.

## Required setup

1. In Resend, verify a sending domain and create an API key.
2. Create a `.env` file from `.env.example` and fill in `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. Keep `.env` private; it is git-ignored.
3. For local development, stop any static-only server and run `node server.js`. Open `http://localhost:8001`. The included Node server serves the landing page and `/api/submit-query` together.
4. For deployment, use Vercel. It serves functions placed in the root `api` directory. Add these environment variables to the Vercel project, for Preview and Production as appropriate:

   - `RESEND_API_KEY`: the Resend API key. Keep it in Vercel's encrypted environment-variable settings; never put it in browser code.
   - `RESEND_FROM_EMAIL`: for example, `MegaByte Do Not Reply <noreply@your-verified-domain.com>`. Use an address on the domain verified in Resend.
   - `MEGABYTE_TO_EMAIL`: the inbox that receives queries. Defaults to `onmegabyte@gmail.com` if omitted.

5. Redeploy after adding the environment variables. A static-only server cannot execute the email function.

Until these settings are configured, the form displays a clear delivery failure and offers the direct MegaByte email address. It does not report an automatic reply as sent.

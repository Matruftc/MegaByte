/* MegaByte: editable site content.
 * Change text here; the landing page (index.html) and portfolios (portfolio.html) render from it.
 * Leave a field empty ("") to hide it. Contact links stay hidden until you fill them in.
 */
window.MEGABYTE = {
  brand: {
    name: "MegaByte",
    tagline: "Hands-on learning for data people, built by practitioners.",
    intro: "MegaByte is the partnership of Matru (“Mega”) and Bisal (“Byte”): two Ravenshaw University graduates who started their careers at Wipro and work with Snowflake. We turn what we learn on the job into practical, interactive learning tools.",
    email: "onmegabyte@gmail.com",   // shared inbox: contact links, founder "Email" buttons and the query form
  },

  // Topics offered in the "Contact & queries" form (added to the email subject)
  queryTopics: ["General question", "Snowflake Academy", "Python Academy", "ATS Resume Builder", "Project Milano",
                "Collaboration / work with us", "Report a bug", "Feedback"],

  projects: [
    {
      id: "snowflake-academy",
      name: "Snowflake Academy",
      status: "Live",
      icon: "❄️",
      summary: "An interactive Snowflake learning hub: 338 explained questions, quizzes graded in your own words, flashcards, an offline prep-coach chatbot, and a community Question Dropbox.",
      features: [
        "338 questions with answers & explanations across 22 topics",
        "Quiz mode, 3D flashcards, instant search and progress tracking",
        "Frosty: offline chatbot that explains, compares and quizzes",
        "Question Dropbox: submit questions in any format",
        "User profiles with avatars, stored in a browser NoSQL database",
      ],
      stack: ["HTML", "CSS", "JavaScript", "IndexedDB (NoSQL)", "Python"],
      preview: "assets/sf-academy-preview.png",
      links: [
        { label: "🚀 Launch Snowflake Academy", href: "SF_PRJ/website/index.html", primary: true },
        { label: "📊 Getting Started deck (.pptx)", href: "SF_PRJ/presentations/Snowflake_Getting_Started.pptx" },
        { label: "❓ Question bank (.pptx)", href: "SF_PRJ/presentations/Snowflake_Getting_Started_Question_Bank.pptx" },
      ],
      stats: [["338", "questions"], ["22", "topics"], ["168", "slides"], ["10", "avatars"]],
    },
    {
      id: "python-academy",
      name: "Python Academy",
      status: "Live",
      icon: "🐍",
      summary: "Learn Python by running it: 210 explained questions with verified, runnable examples, a real Python interpreter in the browser, predict-the-output puzzles, quizzes graded in your own words, and XP, levels and badges.",
      features: [
        "210 questions across 19 modules, from print() to decorators, async, pandas and Snowflake",
        "Live playground: real CPython (Pyodide) in the browser, with save and share",
        "45 predict-the-output puzzles whose answers come from actually running the code",
        "IDE-style interface: editor tabs, status bar and a ⌘K command palette",
        "Monty: offline tutor chatbot, plus XP, levels, streaks and 15 badges",
      ],
      stack: ["HTML", "CSS", "JavaScript", "Pyodide (WebAssembly)", "IndexedDB (NoSQL)", "Python"],
      preview: "assets/py-academy-preview.svg",
      links: [
        { label: "🐍 Launch Python Academy", href: "PY_PRJ/website/index.html", primary: true },
        { label: "▶️ Open the playground", href: "PY_PRJ/website/index.html#/playground" },
      ],
      stats: [["210", "questions"], ["19", "modules"], ["45", "output puzzles"], ["15", "badges"]],
    },
    {
      id: "resume-builder",
      name: "ATS Resume Builder",
      status: "Live",
      icon: "📄",
      summary: "Build a resume that applicant tracking systems can read: fill in a form, watch a clean one-column resume update live, get an ATS score with specific fixes, and see which job-description keywords you're missing.",
      features: [
        "ATS-safe layout: one column, standard headings, real selectable text",
        "Live ATS score with up to 19 checks: action verbs, quantified results, length and more",
        "Job-description keyword match: paste a posting, see found vs missing keywords",
        "Export to PDF or plain text; save and reopen as JSON",
        "Three styles, Letter or A4, autosaved in your browser",
      ],
      stack: ["HTML", "CSS", "JavaScript", "localStorage"],
      preview: "assets/resume-builder-preview.svg",
      links: [
        { label: "📄 Build my resume", href: "RESUME_PRJ/website/index.html", primary: true },
      ],
      stats: [["19", "ATS checks"], ["3", "styles"], ["3", "export formats"], ["0", "sign-ups"]],
    },
    {
      id: "milano",
      name: "Project Milano",
      status: "Live",
      icon: "🏙️",
      summary: "An enterprise financial analytics dashboard for the fictional Milano Tech Solutions: interactive KPIs, cross-filtering charts and a sortable data grid over company revenue and expenses, backed by a Python data pipeline that loads the data into Snowflake.",
      features: [
        "KPI cards built as custom Web Components, with year-over-year trends",
        "Chart.js charts that cross-filter the data table by department",
        "Sortable, paginated data grid with CSV and PDF export",
        "Sign in / register with existing-user validation",
        "Milano AI Bot: a built-in chatbot for quick answers",
        "Data pipeline: Python mock-data generator and Snowflake loader (PUT + COPY INTO)",
      ],
      stack: ["JavaScript", "Web Components", "Chart.js", "Python", "Snowflake"],
      preview: "assets/milano-preview.svg",
      links: [
        { label: "🏙️ Open Milano dashboard", href: "MILANO_PRJ/website/index.html", primary: true },
      ],
      stats: [["22", "financial metrics"], ["100", "monthly records"], ["2", "interactive charts"], ["1", "Snowflake pipeline"]],
    },
  ],

  founders: [
    {
      id: "matru",
      name: "Matru",
      alias: "Mega",
      role: "Co-founder, MegaByte",
      emblem: "assets/emblem-mega.svg",
      photo: "",                       // optional: path to a photo, e.g. "assets/matru.jpg" (replaces the emblem)
      headline: "The “Mega” in MegaByte.",
      about: "Matru is a Ravenshaw University graduate who started their career at Wipro and works hands-on with Snowflake. Co-founder of MegaByte and co-creator of Snowflake Academy.",
      education: [{ school: "Ravenshaw University", detail: "Graduate" }],
      experience: [{ company: "Wipro", detail: "Started career at Wipro" }],
      skills: ["Snowflake"],          // add more, e.g. "SQL", "Python", …
      projects: ["snowflake-academy", "python-academy", "resume-builder", "milano"],
      links: { linkedin: "", github: "", email: "" },
    },
    {
      id: "bisal",
      name: "Bisal",
      alias: "Byte",
      role: "Co-founder, MegaByte",
      emblem: "assets/emblem-byte.svg",
      photo: "",
      headline: "The “Byte” in MegaByte.",
      about: "Bisal is a Ravenshaw University graduate who started their career at Wipro and works hands-on with Snowflake. Co-founder of MegaByte and co-creator of Snowflake Academy.",
      education: [{ school: "Ravenshaw University", detail: "Graduate" }],
      experience: [{ company: "Wipro", detail: "Started career at Wipro" }],
      skills: ["Snowflake"],
      projects: ["snowflake-academy", "python-academy", "resume-builder", "milano"],
      links: { linkedin: "", github: "", email: "" },
    },
  ],
};

# ROOT ACCESS — the résumé you can hack

An interactive, Linux-inspired portfolio for **Noa Rezzik** (junior cybersecurity). Recruiters can explore it like a
computer system (**Terminal Mode**) or read a premium editorial CV (**Recruiter Mode**). Both are always one click apart,
and the CV and e-mail address are always visible.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · GSAP (+ ScrollTrigger) · Lucide · Vitest + Testing Library.
No backend, no paid APIs, no analytics, no data collection.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit + UI tests (Vitest)
npm run build        # type-check + production build → dist/
npm run preview      # serve the production build
```

Requires Node 20+.

### Handy URLs

| URL | What it does |
| --- | --- |
| `/` | Cinematic intro (skippable) → Terminal or CV |
| `/#recruiter` (or `#cv`) | Straight to Recruiter Mode, no intro — **share this one with recruiters** |
| `/#terminal` | Straight to the terminal |
| `/?intro=0` | Skip the intro |

---

## Editing the content (one file)

Everything the site says comes from **[`src/config/candidate.ts`](src/config/candidate.ts)**: name, e-mail, tagline,
skills, education, experience, projects and links. The terminal, the virtual filesystem, Recruiter Mode and the generated
PDF all read from it.

Content rules built into the project:

* **Nothing is invented.** Missing info is `null` (or an empty array) and is simply not rendered.
* **Project links are optional.** Set `repoUrl` / `demoUrl` on a project to show a real link; leave them `null` and the card
  says *"Repository: not published"* with no clickable link. Same for `links.github`, `links.linkedin`, etc.
* **Experience is honest.** `experience: []` renders as *"No professional cybersecurity experience yet — still building"*.
* Items marked `// REVIEW:` in the config are written conservatively from the brief. Add specifics (techniques used, what
  you learned) before publishing — only things that are true and that you can discuss.

### The résumé PDF

`public/Noa-Rezzik-CV.pdf` is what *Download CV* and the `resume` command serve. It is generated from the config:

```bash
npm run resume:build   # needs Chromium (PLAYWRIGHT_BROWSERS_PATH or CHROMIUM_PATH)
```

If you have your own designed CV, **just overwrite that file** (keep the name, or change `resume.url` in the config).

---

## What's inside

```
src/
  config/candidate.ts     ← all editable content (single source of truth)
  terminal/
    parser.ts             tokenizer; refuses shell operators — nothing is ever executed
    commands.ts           typed command registry (help, ls, cd, cat, skills, projects, …)
    session.ts            cwd, history, CTF state, execute()
    fs.ts                 virtual filesystem + path resolution (. .. ~ absolute/relative)
    ctf.ts                mini-CTF state machine, hints, flag
    completion.ts         Tab completion + suggestion chips
    history.ts            ↑/↓ history with draft restore
    suggest.ts            typo suggestions (Levenshtein)
  components/             Intro, TerminalView, Blocks, RecruiterMode, ProjectCard, CtfFinale,
                          NetworkBackground (canvas), Button (magnetic), Illustrations (SVG)
  hooks/                  useMotion (reduced-motion), useMagnetic
  index.css               design tokens (Tailwind @theme) + base styles
```

**Design tokens** — background `#080B10`, surface `#111820`, text `#F4F4F0`, muted `#89929C`, accent `#A3FF12`;
Space Grotesk + IBM Plex Mono (self-hosted via Fontsource, so no third-party requests).

### Terminal commands

`help` · `whoami` · `ls [-a] [-l]` · `cd` · `pwd` · `cat` · `skills` · `projects [n|name]` · `experience` · `education` ·
`contact` · `resume` · `clear` · `history` · `neofetch` · `challenge` · `hint` · `submit` · `base64 -d` · `motion on|off` ·
`recruiter` · `man <cmd>` · `sudo hire noa` — plus a few unlisted easter eggs for curious people.

Keyboard: **Tab** autocomplete (commands *and* paths) · **↑/↓** history · **Ctrl+L** clear · **Ctrl+C** cancel ·
**Ctrl+U** wipe line · **Alt+M** switch mode · **Esc** skip intro / close dialogs. On mobile, tappable suggestion chips
under the prompt mean no typing is required.

**Safety:** the "shell" is a `switch` over a registry. Input is tokenized, never `eval`'d, never sent to a server.
`; | & < > \` $()` are rejected, and real programs (`rm`, `nmap`, `curl`, …) get a polite refusal.

### Mini-CTF (optional, 2–5 min)

Type `challenge` (or press **Start** in the side panel). Stages: find a hidden file with `ls -a` → read `incident.log` →
decode the Base64 payload with the built-in `base64 -d` → read the unlocked `secret.txt` → `submit` the flag.
`hint` gives three progressive hints per step, so non-technical recruiters are never stuck. Finishing triggers the
cinematic **ACCESS GRANTED** sequence with a contact CTA. The flag is original and fictional.

<details><summary>Spoiler: solution</summary>

```
ls -a
cat incident.log
base64 -d .intercepted
cat secret.txt
submit ROOT{CURIOSITY_UNLOCKS_OPPORTUNITY}
```
</details>

### Accessibility & performance

* Fully keyboard-operable; skip link; visible focus rings; `role="log"` terminal output; labelled controls; modal focus handling.
* **Reduced motion:** honours `prefers-reduced-motion` *and* has an in-app toggle (⚡ button or `motion off`). When on, the
  intro shows its final state, GSAP animations and the canvas network are static, CSS animations are neutralised.
* Canvas background is capped in node count/DPR on touch devices and pauses with the tab.
* Production JS ≈ 145 kB gzipped; fonts self-hosted; no runtime network calls.

---

## Testing

```bash
npm test
```

Covers: command parsing (quotes, operators, flags), typo suggestions, virtual-filesystem navigation (absolute/relative,
`.`, `..`, `~`, errors), CTF progression and hints, command history, Tab completion, every required command, honesty checks
(no invented repos/credentials), and UI-level critical navigation: intro → terminal/CV, mode switching, Alt+M, resume action,
CTF finale, no dead links, and that the PDF exists.

---

## Deployment (free)

The app is a static site: build output is `dist/`.

### Vercel
1. Push the repo to GitHub → **Add New… → Project** on vercel.com → import it.
2. Framework preset: **Vite** (detected). Build: `npm run build`, output: `dist`. (`vercel.json` already sets this.)
3. Deploy. Add your custom domain under *Settings → Domains* if you have one.

### Netlify
1. **Add new site → Import an existing project** → pick the repo.
2. Build command `npm run build`, publish directory `dist` (already set in `netlify.toml`).
3. Deploy.

### Any static host (GitHub Pages, Cloudflare Pages, S3…)
`npm run build` and upload `dist/`. If it is served from a sub-path, set `base` in `vite.config.ts`.

---

## Pre-launch checklist

- [ ] Review every `REVIEW:` item in `src/config/candidate.ts`; add real specifics only.
- [ ] Add `repoUrl` / `links.github` / `links.linkedin` where real URLs exist (leave `null` otherwise).
- [ ] Replace `public/Noa-Rezzik-CV.pdf` with the final CV (or run `npm run resume:build`).
- [ ] `npm test && npm run build`.
- [ ] Open `/#recruiter` on a phone and send yourself a test e-mail from the "technical challenge" button.

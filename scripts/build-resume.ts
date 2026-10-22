/**
 * Generates public/Noa-Rezzik-CV.pdf from src/config/candidate.ts.
 *
 *   npm run resume:build
 *
 * The PDF contains only what is in the config file. If you have your own
 * designed CV, simply overwrite public/Noa-Rezzik-CV.pdf and skip this script.
 */
import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { candidate as c } from '../src/config/candidate';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><style>
  @page { size: A4; margin: 0 }
  * { box-sizing: border-box }
  body { margin: 0; font: 9.6pt/1.38 'Helvetica Neue', Arial, sans-serif; color: #11161c; }
  .bar { background: #080B10; color: #F4F4F0; padding: 22pt 40pt 16pt; }
  h1 { margin: 0; font-size: 30pt; letter-spacing: -0.02em; }
  h1 span { color: #A3FF12 }
  .tag { margin-top: 4pt; color: #b9c0c7; font-size: 11pt }
  .contact { margin-top: 10pt; font-size: 9.5pt; color: #F4F4F0 }
  .contact b { color: #A3FF12; font-weight: 600 }
  main { padding: 12pt 40pt 16pt }
  h2 { font-size: 9pt; letter-spacing: .16em; text-transform: uppercase; color: #4c5a1a;
       border-bottom: 1.5pt solid #A3FF12; padding-bottom: 3pt; margin: 11pt 0 6pt }
  ul { margin: 0; padding-left: 14pt } li { margin: 2pt 0 }
  .row { display: flex; justify-content: space-between; gap: 12pt }
  .row b { font-weight: 700 } .muted { color: #5b6670 }
  .skills p { margin: 3pt 0 } .skills b { display: inline-block; width: 105pt }
  .proj { margin: 6pt 0 } .proj b { font-weight: 700 }
</style>
<div class="bar">
  <h1>${esc(c.name.split(' ')[0])} <span>${esc(c.name.split(' ')[1])}</span></h1>
  <div class="tag">${esc(c.tagline)}</div>
  <div class="contact"><b>Email</b> ${esc(c.email)} &nbsp;·&nbsp; <b>Location</b> ${esc(c.location)}
  ${c.links.github ? `&nbsp;·&nbsp; <b>GitHub</b> ${esc(c.links.github)}` : ''}
  ${c.links.linkedin ? `&nbsp;·&nbsp; <b>LinkedIn</b> ${esc(c.links.linkedin)}` : ''}</div>
</div>
<main>
  <h2>Profile</h2><p>${esc(c.summary)}</p>
  <p class="muted"><b>Target roles:</b> ${c.targetRoles.map(esc).join(' · ')}</p>
  <h2>Education</h2>
  ${c.education.map((e) => `<div class="row"><span><b>${esc(e.degree)}</b><br>${esc(e.school)}, ${esc(e.location)}</span><span class="muted">${esc(e.period)}</span></div>`).join('')}
  <h2>Technical skills</h2>
  <div class="skills">${c.skills.map((s) => `<p><b>${esc(s.group)}</b>${s.items.map(esc).join(', ')}</p>`).join('')}</div>
  <h2>Experience</h2>
  <p>No professional cybersecurity experience yet. Hands-on practice:</p>
  <ul>${c.practice.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
  <h2>Projects</h2>
  ${c.projects.map((p) => `<div class="proj"><b>${esc(p.name)}</b> — ${esc(p.tagline)}<br><span class="muted">${esc(p.tech.join(', '))}</span>${p.repoUrl ? `<br><span class="muted">${esc(p.repoUrl)}</span>` : ''}</div>`).join('')}
</main></html>`;

function findChromium(): string | undefined {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  if (!existsSync(base)) return undefined;
  for (const d of readdirSync(base).filter((n) => n.startsWith('chromium'))) {
    for (const rel of ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome']) {
      const p = join(base, d, rel);
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? findChromium() });
const page = await browser.newPage();
await page.setContent(html);
await page.pdf({ path: 'public/Noa-Rezzik-CV.pdf', format: 'A4', printBackground: true });
await browser.close();
console.log('wrote public/Noa-Rezzik-CV.pdf');

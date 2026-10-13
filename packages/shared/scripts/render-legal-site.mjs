/**
 * Render the phone app's Privacy policy and Terms of use (`src/legal.ts`) as a small static site for
 * GitHub Pages, so the public URL Google Play needs always shows the same words as the app.
 * Usage: node packages/shared/scripts/render-legal-site.mjs <output-dir>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEGAL_CONTACT_EMAIL, LEGAL_LAST_UPDATED, PRIVACY_POLICY, TERMS_OF_USE } from '../src/legal.ts';

const outDir = process.argv[2] ?? '_site';

const escape = (text) => String(text)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// Turn the contact address into a mail link after escaping, so nothing else becomes markup.
const withMailLink = (html) => html.replaceAll(LEGAL_CONTACT_EMAIL, `<a href="mailto:${LEGAL_CONTACT_EMAIL}">${LEGAL_CONTACT_EMAIL}</a>`);

const styles = `
:root { --bg: #f7f4ec; --card: #ffffff; --ink: #14213d; --muted: #4a5568; --gold: #b8862b; --line: #e6dfcc; }
@media (prefers-color-scheme: dark) { :root { --bg: #0e1628; --card: #16213a; --ink: #f2ede1; --muted: #b8c0d0; --gold: #e3b553; --line: #26324d; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 720px; margin: 0 auto; padding: 32px 16px 64px; }
header { margin-bottom: 24px; }
.brand { color: var(--gold); font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; font-size: 13px; text-decoration: none; }
h1 { font-size: 30px; line-height: 1.2; margin: 8px 0 4px; }
h2 { font-size: 19px; margin: 28px 0 6px; }
.meta { color: var(--muted); font-size: 14px; margin: 0; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 16px 20px; margin: 20px 0; }
.card ul { margin: 0; padding-left: 20px; }
.card li { margin: 6px 0; }
p { margin: 0 0 12px; overflow-wrap: anywhere; }
a { color: var(--gold); }
nav { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 14px; }
`;

function page({ title, description, body }) {
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} · FireBuddy</title>
<meta name="description" content="${escape(description)}">
<style>${styles}</style>
</head>
<body>
<main>
${body}
<nav><a href="../">FireBuddy</a><a href="../privacy/">Privacy policy</a><a href="../terms/">Terms of use</a><a href="mailto:${LEGAL_CONTACT_EMAIL}">Contact</a></nav>
</main>
</body>
</html>
`;
}

function documentPage(doc) {
  const highlights = doc.highlights.map((item) => `<li>${escape(item)}</li>`).join('\n');
  const sections = doc.sections.map((section) => `<h2>${escape(section.heading)}</h2>\n${section.body.split('\n').filter(Boolean).map((para) => `<p>${withMailLink(escape(para))}</p>`).join('\n')}`).join('\n');
  return page({
    title: doc.title,
    description: doc.introduction,
    body: `<header><a class="brand" href="../">FireBuddy</a><h1>${escape(doc.title)}</h1><p class="meta">Last updated ${escape(LEGAL_LAST_UPDATED)}</p></header>
<p>${withMailLink(escape(doc.introduction))}</p>
<div class="card"><ul>
${highlights}
</ul></div>
${sections}`,
  });
}

const home = page({
  title: 'FireBuddy',
  description: 'FireBuddy helps you track spending, grow your net worth and plan your FIRE date, with your records kept on your phone.',
  body: `<header><span class="brand">DouDou Studios</span><h1>FireBuddy</h1><p class="meta">Budget, net worth and FIRE planning, private by design.</p></header>
<p>FireBuddy keeps your money records on your phone. Read how we handle your data and the terms for using the app.</p>
<div class="card"><ul>
<li><a href="privacy/">Privacy policy</a></li>
<li><a href="terms/">Terms of use</a></li>
<li>Support and data protection: <a href="mailto:${LEGAL_CONTACT_EMAIL}">${LEGAL_CONTACT_EMAIL}</a></li>
</ul></div>`,
}).replaceAll('href="../', 'href="./');

for (const [path, html] of [['', home], ['privacy', documentPage(PRIVACY_POLICY)], ['terms', documentPage(TERMS_OF_USE)]]) {
  const dir = join(outDir, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}
console.log(`Legal site written to ${outDir}`);

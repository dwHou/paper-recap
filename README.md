# Paper Recap

[English](README.md) | [简体中文](README.zh-CN.md)

[![Deploy Paper Recap](https://github.com/dwHou/paper-recap/actions/workflows/pages.yml/badge.svg)](https://github.com/dwHou/paper-recap/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/code_license-MIT-25231f.svg)](LICENSE)

Turn the papers you read—and the useful conclusions from your conversations with AI agents—into a searchable, durable personal knowledge site.

Paper Recap is a dependency-free static site workflow. Each paper is stored as a Markdown file, a Python script validates and builds the site, and GitHub Actions deploys it to GitHub Pages. It includes first-class support for LaTeX equations, paper figures, precise same-day ordering, and a portable Codex skill that can maintain the repository from multiple machines.

**Site address after enabling GitHub Pages:** <https://dwhou.github.io/paper-recap/>

## Features

- One readable, portable, Git-friendly Markdown file per paper.
- Full-text search across titles, authors, tags, summaries, and notes.
- Grouped topic filters with multi-tag intersections and shareable filter URLs, plus newest-first and title A–Z sorting.
- Precise same-day ordering through timezone-aware `read_at` timestamps.
- KaTeX rendering for inline `$...$` and display `$$...$$` equations.
- Responsive figures with captions, lazy loading, and click-to-zoom.
- Light and dark themes, mobile layouts, and paper detail dialogs.
- Build-time validation for metadata, required sections, math delimiters, and media paths.
- Automatic GitHub Pages deployment on every push to `main`.
- A bundled `update-paper-recap` Codex skill for turning rough notes or agent conversations into published recaps.

## Quick start

Requirements: Git and Python 3. The builder uses only the Python standard library—no Node.js, npm, or third-party Python packages are required.

```bash
git clone https://github.com/dwHou/paper-recap.git
cd paper-recap
python3 scripts/build_site.py
python3 -m http.server 8000 --directory dist
```

Open <http://localhost:8000>.

> The site loads KaTeX from jsDelivr, so local equation rendering requires an internet connection. Content validation and site generation remain fully dependency-free.

## Create your own Paper Recap

1. Fork this repository, or clone it and push it to your own GitHub repository.
2. Create your first note from `content/TEMPLATE.md`, then remove the example notes you do not want.
3. Update the site title in `index.html`, and set the site author and copyright start year in `site.config.json`.
4. Replace the default repository URL in `.codex/skills/update-paper-recap/SKILL.md` with your own repository.
5. Run `python3 scripts/build_site.py` and fix any validation errors.
6. In your GitHub repository, open `Settings → Pages` and set Source to **GitHub Actions**.
7. Push to `main`. The included workflow will validate, build, and deploy the site.

A project repository is normally published at:

```text
https://<username>.github.io/<repository>/
```

If the repository is named `<username>.github.io`, it is normally published at:

```text
https://<username>.github.io/
```

`site.config.json` defaults to Devonn Hou and a 2026 copyright start year. Each build extends the footer year through the current year. This setting only controls the HTML author metadata and footer; it does not change figure credits, `LICENSE`, or `COPYRIGHT`.

## Add a paper

Copy the template and use a stable filename made from the reading date and an English slug:

```bash
cp content/TEMPLATE.md content/papers/2026-08-03-example-paper.md
```

Example frontmatter:

```yaml
---
title: "Paper Title"
display_title: "VAR"
paper_url: "https://arxiv.org/abs/xxxx.xxxxx"
authors: "First Author et al."
venue: "Conference / Journal / arXiv"
published: "2026"
read_date: "2026-08-03"
read_at: "2026-08-03T22:35:13+08:00"
status: "Read closely"
tags: ["Video Generation", "Diffusion Models"]
one_liner: "The one sentence that should restore the paper's core idea six months later."
---
```

Choose 2–5 canonical `key` values from [`content/tag-taxonomy.json`](content/tag-taxonomy.json) for `tags`. The catalog groups research areas and methods / engineering. Video generation, causal / autoregressive generation, and streaming / long video describe different dimensions and can overlap. World-model classification requires state prediction or interactive simulation; a long video alone is insufficient. Keep narrower concepts in the optional `search_terms` list or note body so they remain searchable without expanding the browsing catalog.

Keep the complete paper name in `title`. The optional `display_title` provides a short card and detail heading, such as `VAR`; the detail view also shows the complete title, and search indexes both.

For new reading sessions, set `read_at` to the actual local time. Historical imports without a reliable reading time may omit it. Brief notes may use `略读`; when the source cannot support a useful one-sentence summary, keep `one_liner: ""` instead of inventing one. The taxonomy also includes image restoration, enhancement, watermarking, and digital-human topics.

Selecting multiple tags shows their intersection. Counts show the total number of notes under each tag. Card and detail tags link to that topic. Search, selected tags, and sorting are stored in the URL for refresh and sharing.

The body must contain these top-level sections in this order:

1. `研究问题` — research question
2. `核心方法` — core method
3. `关键发现` — key findings
4. `我的提问` — questions and distilled answers
5. `局限与疑问` — limitations and open questions
6. `我的判断` — your assessment
7. `下次只看这些` — the shortest future recap path

The section names are currently Chinese because the validator and UI are optimized for the original workflow. You may translate them, but must update `REQUIRED_SECTIONS` in `scripts/build_site.py` at the same time.

See [`content/TEMPLATE.md`](content/TEMPLATE.md) for a complete note. Then run:

```bash
python3 scripts/build_site.py
```

A successful build writes the deployable static site to `dist/`. Do not edit `dist/` or `assets/papers.js` manually; they are generated by the build script.

## Mathematics

Inline math:

```markdown
The noise predictor is denoted by $\epsilon_\theta(x_t,t)$.
```

Display math:

```markdown
$$
\mathcal{L}_{\mathrm{simple}}
= \mathbb{E}_{t,x_0,\epsilon}
\left[\lVert \epsilon-\epsilon_\theta(x_t,t) \rVert_2^2\right].
$$
```

Keep equations as editable LaTeX rather than screenshots. Prefer standard KaTeX-supported commands, and define symbols near the equation.

## Figures

Store each paper's media in a dedicated directory:

```text
content/
├── papers/
│   └── 2026-08-03-example-paper.md
└── media/
    └── example-paper/
        ├── method-overview.webp
        └── qualitative-results.webp
```

Reference the image from Markdown:

```markdown
![Method overview](../media/example-paper/method-overview.webp "Paper Figure 2: method overview. Source: the authors, CC BY 4.0.")
```

Image requirements:

- Use only `../media/<slug>/...` paths relative to each note in `content/papers/`, so Typora previews figures directly; the builder converts them to site paths.
- Include meaningful alt text plus the figure number, source, and license in the caption.
- PNG, JPEG, WebP, and GIF are supported; WebP is preferred.
- Keep every image at or below 3 MiB.
- Usually include one method overview and, at most, one decisive result.
- The site is public. New figures require verified reuse permission. Figures carried over from the owner's older notes are marked for source and license review before publication.

## Codex skill: the shortest workflow

The repository includes `.codex/skills/update-paper-recap/`. It instructs an agent to:

- Deduplicate by normalized title, URL, DOI, arXiv ID, authors, and slug.
- Merge new material into an existing paper instead of creating duplicate pages.
- Preserve important equations, the reader's judgment, and only the questions that changed understanding.
- Record an exact `read_at` timestamp for correct same-day ordering.
- Add one or two high-value figures when the license permits reuse.
- Validate, commit, and publish the update.

### Register the skill

From the repository root, run:

```bash
python3 scripts/install_skill.py
```

If a previous registration already exists:

```bash
python3 scripts/install_skill.py --replace
```

The script symlinks the repository-owned skill into:

```text
$CODEX_HOME/skills/update-paper-recap
```

When `CODEX_HOME` is unset, it uses:

```text
~/.codex/skills/update-paper-recap
```

You can then say in a Codex session:

```text
Use $update-paper-recap to publish the following notes:

Paper: title or URL
My understanding: rough bullet points
Important Q&A: agent answers that changed my understanding
My assessment: trustworthiness, reproduction value, and relevance to my work
```

The input does not need to match a template. When essential information is missing, the agent should use `待补充` rather than invent facts.

### Multiple machines or clusters

Clone the same repository and register the skill once on every machine:

```bash
git clone git@github.com:<username>/<repository>.git
cd <repository>
python3 scripts/install_skill.py
```

Because the registration is a symlink, future updates require only:

```bash
git pull
```

New sessions will immediately use the updated skill. Concurrent agents should sync `origin/main` before editing. If two machines modify the same paper, stop automatic conflict resolution and merge the two sets of judgments manually.

## Project structure

```text
paper-recap/
├── .codex/skills/update-paper-recap/   # Portable agent workflow
├── .github/workflows/pages.yml          # GitHub Pages deployment
├── assets/
│   ├── app.js                           # Search, filtering, Markdown, and UI
│   └── styles.css                       # Design and responsive layout
├── content/
│   ├── papers/                          # One Markdown file per paper
│   ├── media/                           # Paper-specific figures
│   └── TEMPLATE.md                      # New-note template
├── scripts/
│   ├── build_site.py                    # Validate and build dist/
│   └── install_skill.py                 # Register the Codex skill
├── index.html                           # Site shell
├── 404.html
├── COPYRIGHT                            # Content copyright scope
└── LICENSE                              # MIT License for the code
```

## Automatic deployment

`.github/workflows/pages.yml` runs on every push to `main`:

```text
checkout → validate and build with Python → upload dist → deploy to GitHub Pages
```

Invalid note metadata, unbalanced math delimiters, missing sections, or broken media paths fail the workflow before a damaged site can be published.

## Privacy and public content

GitHub Pages sites are public by default. Do not commit:

- Company-confidential or internal project details.
- Unpublished papers, review materials, or private experimental results.
- API keys, access tokens, credentials, or account data.
- Personal or otherwise sensitive information.
- Paper figures that do not have a clear public reuse license.

## Contributing

Issues and pull requests for reusable improvements are welcome, especially for Markdown rendering, accessibility, responsive behavior, validation, and deployment.

Do not include private reading notes, restricted materials, or unlicensed paper figures in contributions. Before submitting a change, run:

```bash
python3 scripts/build_site.py
git diff --check
```

## License and content copyright

The software source code is available under the [MIT License](LICENSE), copyright Junsong Chen.

The personal reading notes and original prose under `content/` belong to Devonn Hou and are not covered by the MIT License. Third-party figures retain their respective owners' rights; migrated figure credits are pending review. See [`COPYRIGHT`](COPYRIGHT) for details.

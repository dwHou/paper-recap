---
name: update-paper-recap
description: Add, revise, validate, or publish paper-reading notes in the Paper Recap GitHub Pages site. Use when the user says “更新到 Paper Recap”, supplies a paper summary or Agent Q&A to archive, wants to edit an existing recap, or asks to refresh/deploy the personal paper-reading website.
---

# Update Paper Recap

Turn raw reading notes and Agent conversations into durable recap entries. For short new notes, optimize for future recall. When migrating an existing user-authored note, preserve its full learning path and every non-duplicate insight, explanation, equation, code example, figure, question, and judgment. Length alone is never a reason to omit material.

## Workflow

1. Locate the repository root by finding `scripts/build_site.py` and `content/papers/`. If absent, clone `git@github.com:dwHou/paper-recap.git` into a user-approved or obvious project location, then run `python3 scripts/install_skill.py` from that clone.
2. Treat every record as public. Stop before writing if the input appears to contain company-confidential, unpublished, credential, personal, or otherwise sensitive material; ask the user for a sanitized version.
3. Inspect `git status --short --branch`. Never mix unrelated changes into the recap commit. When clean, update from `origin/main` with `git pull --ff-only` before editing.
4. Identify the paper from the supplied title, URL, PDF, or context. Browse authoritative sources only when identity, authors, venue, year, or claims require verification. Never invent missing bibliographic facts.
5. Read `references/note-format.md` before creating or substantially restructuring an entry.
6. Deduplicate before choosing a filename. Search every note in `content/papers/` by normalized title, paper URL, DOI, arXiv ID, and slug. Treat a matching DOI/arXiv ID, or a matching canonical title and authors, as the same paper even when its filename or reading date differs. If a match exists, edit that file in place and merge the new summary, Q&A, formulas, judgments, and figures into it; never create a second note for the same paper. If several candidates remain, inspect and verify them before writing, and ask the user only when the identity is still genuinely ambiguous.
7. Create or edit the scoped Markdown note or notes in `content/papers/`. Name new files `YYYY-MM-DD-short-kebab-slug.md`, using the read date and a stable English slug. Set `read_at` on every new reading session to the actual local reading/submission time in timezone-aware ISO 8601 format so same-day entries sort correctly; historical imports with no reliable time may omit it. When merging an existing note, preserve its original `read_at` unless the user explicitly records a new reading session. Add that note's figures (see step 10) under `content/media/<slug>/`, referenced from the note as `../media/<slug>/...` for Typora preview.
8. Preserve the user's own judgment and disagreements. For a migration, map each source section and meaningful paragraph to the destination before editing, retain the source's reasoning sequence with nested headings inside the template's top-level sections, and verify coverage afterward. Keep pedagogical repetitions when they explain a concept in a different way; remove only truly redundant material. Keep pseudocode and implementation details marked as such. Condense conversational filler in Agent answers, not the user's learning notes. Mark unknowable gaps as `待补充`; do not silently turn inference into fact.
9. Preserve important equations in LaTeX. Use `$...$` for inline math and `$$...$$` for display math; never replace formulas with vague prose or screenshots.
10. Actively look for useful figures. For new short notes, a method overview and one decisive result are usually enough. **Before a migration, make an image inventory** with one entry per source image: source section, exact path or URL, whether the file resolves, and intended destination. Include Markdown images, HTML `<img>` and `<figure>`, remote images, and repeated references; inspect the actual images to distinguish duplicates. Preserve every distinct explanatory figure in its corresponding section instead of silently dropping it to meet an arbitrary count. When the source is a PDF, use the PDF skill to render and visually inspect the relevant pages, then crop only the meaningful figure. When the source is a blog, project page, or repo, fetch the page and pull the relevant diagram/screenshot the same way. Optimize the crop without sacrificing labels or legibility. Verify reuse permission because the site is public; include figure number (or a descriptive name when the source has none), source, and license in the Markdown caption. If an image is unavailable or its reuse permission remains uncertain, record that exception and retain a source link as appropriate; a link is **not** a migrated, previewable image.
11. **Reconcile the inventory before finishing.** Match each source image to the correct destination embed or to a named exception, preserving section order and explanatory context. Compare image identities as well as counts. Confirm each `../media/...` path exists, its file is valid and within the size limit, and the built page displays the figures. Report unresolved images by note and source; do not claim complete image coverage while exceptions remain. Run `python3 .codex/skills/update-paper-recap/scripts/validate_update.py` and `python3 scripts/build_site.py`; fix every reported error.
12. Treat “更新到 Paper Recap” as authorization to commit this recap note and its scoped media files and push them for publication unless the user says local-only. Stage only the intended note and `content/media/<slug>/`, commit with `content: add <paper slug>` or `content: update <paper slug>`, run `git pull --rebase origin main`, revalidate, then `git push origin main`.
13. If the push loses a concurrent race, pull with rebase and retry once. Stop on a content conflict, preserve both versions, and ask the user to choose; never resolve conflicting judgments by guessing.

## Editing rules

- Keep `one_liner` specific and useful six months later; avoid generic praise.
- Keep one to five focused tags and reuse existing taxonomy keys where possible.
- Include concrete result numbers only when supplied or verified.
- Keep every formula needed to understand the method or result. Define symbols immediately around the equation and check delimiter balance.
- Put Q&A under `我的提问`. When migrating an existing detailed note, retain every question that adds a distinct explanation, even if the answer is long.
- Before finishing a migration, compare source and destination section by section, including fenced code, equations, tables, links, and images. Report deliberate omissions explicitly; never silently drop a source section to meet a target length.
- When merging an existing paper, remove redundant points while preserving all non-duplicate insights. Keep changed judgments as an explicit evolution rather than silently replacing the earlier conclusion.
- Make `下次只看这些` one to three items. This is the fastest recap path.
- Do not edit generated `dist/` or `assets/papers.js`; the build script owns them.
- For new short notes, use figures sparingly. For migrated notes, preserve distinct explanatory figures from the source. Store them under `content/media/<slug>/`, prefer WebP, keep each file at or below 3 MiB, require descriptive alt text, and caption the figure number, source, and license or unresolved license status.

## User-facing intake

Accept messy notes. The user does not need to fill a template. The smallest useful input is:

```text
论文：标题或链接
我的理解：随手写的要点
重要问答：与 Agent 对话中最有价值的 Q&A
我的判断：是否可信、是否值得复现、与当前工作的关系
```

If essential meaning is missing, make a conservative draft with `待补充` instead of blocking on cosmetic details.

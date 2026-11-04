# Paper Recap agent instructions

For requests to add, revise, remove, or publish paper-reading notes, read and follow `.codex/skills/update-paper-recap/SKILL.md` before editing. Keep the workflow dependency-free and treat all site content as public.

## Migration completeness gate

When moving an existing note into `content/papers/`, inventory its images **before** rewriting: record the source section and each Markdown image, HTML `<img>`, figure, and external image URL. Resolve local paths against the source file. Map every distinct source image to a destination image in the corresponding section, or record a specific unresolved exception. A link to an image is not an embedded image and must not be counted as migrated. Do not use equal image counts alone as proof; check image identity and context.

Before reporting completion, reconcile the inventory image by image, verify every `../media/...` file exists and builds, and inspect the rendered note. If any image remains a link, is unavailable, or cannot be reused, name the affected note and image in the final report. Never say there are no omissions while such exceptions remain. Apply the same source-to-destination coverage check to explanations, equations, code, tables, and links.

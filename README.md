# Exam Prep Archive

A simple English material browser for IELTS, GRE, and GMAT. The GitHub Pages app combines files hosted in dedicated repositories with a curated registry of current official and licensed external sources.

**Live site:** https://kitkitkittt.github.io/exam-prep-lite/

## Material repositories

| Exam | Repository | Indexed content |
| --- | --- | --- |
| IELTS | [Kitkitkittt/IELTS](https://github.com/Kitkitkittt/IELTS) | Cambridge books and audio, writing references, listening guides |
| IELTS practice source | [Kitkitkittt/IELTS-practice](https://github.com/Kitkitkittt/IELTS-practice) | Static practice engine and vocabulary source |
| GRE | [Kitkitkittt/GRE-CN](https://github.com/Kitkitkittt/GRE-CN) | Vocabulary datasets, PDFs, spreadsheets, reading collection |
| GMAT | [Kitkitkittt/gmat.site](https://github.com/Kitkitkittt/gmat.site) | Demonstration and 100-question JSON banks |

These are GitHub forks, so upstream history and ownership remain visible at the repository level. The site itself contains no credit panel.

## Current catalog snapshot

- 350 total resources: 311 GitHub-hosted files and 39 curated external sources
- 301 IELTS resources, including the hosted archive and current official Cambridge/IELTS.org entries
- 40 GRE resources, including official ETS practice, Quant review, POWERPREP, and video indexes
- 9 GMAT resources, including official GMAC entries, question banks, and current free video courses
- Cambridge IELTS volumes 1–21 are indexed in the interface
- Complete book/audio files are currently present for Cambridge 4–18
- Cambridge 19–21 contain verified official product and preview records but are not labelled as hosted
- Cambridge 1–3 remain missing because neither hosted files nor curated external records are present

The catalog distinguishes `hosted`, `public_official`, `licensed`, and `third_party_free` access. A downloadable official URL is not treated as permission to mirror it. Full commercial CAM19–21 payloads must not be committed without a written redistribution grant.

## Interface

- IELTS, GRE, and GMAT switching
- Compact category navigation
- Cambridge 21-to-1 volume grid with hosted/official/licensed/missing indicators
- Fast search across titles, publishers, editions, skills, tests, parts, and formats
- Resource-type and access filters
- Cambridge Listening grouping by edition, test, and part
- Direct PDF preview
- Streaming audio player
- Image, Markdown, text, CSV, and JSON preview
- Official/licensed resource detail views with direct source actions
- Bookmarks, completion marks, recent resources, last-opened state, and deep links stored locally
- Full-width mobile preview with a Back action

No study files are copied into the GitHub Pages build. This is important because a published Pages site may not exceed 1 GB, while the indexed IELTS archive alone is larger than that.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

## Source registry and catalog refresh

The curated registry lives in `sources/official.json`. It records source ownership, resource type, access state, mirroring policy, edition metadata, and verification date. The committed `public/catalog.json` merges that registry with the current GitHub repository trees, keeping visitor browsers independent of the GitHub API.

```bash
npm run catalog
```

The snapshot script reads the public repository trees, translates visible labels to English, normalizes hosted and external records, and writes the catalog. It uses `GITHUB_TOKEN` when present but does not require one for public repositories.

Validate registry structure without network access:

```bash
npm run validate:sources
```

Run the live source-health report manually:

```bash
npm run check:sources
```

The weekly Source health workflow follows redirects, falls back to a ranged GET when HEAD is rejected, reports missing URLs, and treats automation-blocking HTTP 403 responses separately instead of deleting records.

## Test and build

```bash
npm run check
```

GitHub Actions runs the tests and production build on pull requests. Changes merged into `main` are deployed to GitHub Pages.

## Content and trademark boundary

Exam names and provider names belong to their respective owners. This independent educational archive is not endorsed by IELTS, Cambridge University Press & Assessment, ETS, GMAC, mba.com, the British Council, or IDP.

The material repositories may contain third-party works with terms separate from this application's source-code license. Forking or indexing a repository does not relicense its contents. The repository owner is responsible for retaining only material they are authorized to host and share.

## Credits

Credits are intentionally kept in this README rather than displayed in the material browser.

| Project | How it informed Exam Prep Archive | Upstream license/status |
| --- | --- | --- |
| [IELTS Atlas](https://github.com/sallowayma-git/IELTS-practice) by sallowayma-git | Static library behavior, file import, and vocabulary structure | GPL-3.0 |
| [my-ielts](https://github.com/hefengxian/my-ielts) by hefengxian | Vocabulary organization reference | No repository license declared; design reference only |
| [ISTS](https://github.com/aimerfeng/ists) by Aimer Feng | Local-first material-management philosophy | MIT |
| [IELTS Study](https://github.com/iFralex/IELTS-Study) by iFralex | Exam-library reference | Source notice reserves redistribution rights; design reference only |
| [IELTS](https://github.com/zeeklog/IELTS) by zeeklog | Primary three-pane material-browser and archive reference | No repository license declared |
| [Vox Velocity](https://github.com/andrewveda/vox-velocity) by Andrew Veda | Vocabulary-library reference | MIT |
| [oVLT](https://github.com/englishcentral/ovlt) by EnglishCentral | Vocabulary-diagnostic reference | MIT |
| [GRE-CN](https://github.com/LER0ever/GRE-CN) by L.E.R | GRE material collection and dataset structure | BSD-3-Clause |
| [GRE Preparation Tool](https://github.com/itsShnik/gre-preparation-tool) by Nikhil Shah | Lightweight GRE study-flow reference | MIT |
| [gmat.site](https://github.com/huongoss/gmat.site) by huongoss | GMAT question-bank schema | No repository license declared |
| [PDF.js](https://github.com/mozilla/pdf.js) by Mozilla | In-page PDF rendering for files served by GitHub | Apache-2.0 |

The interface uses [DM Sans](https://fonts.google.com/specimen/DM+Sans) and [DM Mono](https://fonts.google.com/specimen/DM+Mono) under their respective open font licenses.

## License

The browser application's source code is released under the [GNU General Public License v3.0](LICENSE). Third-party materials in linked repositories retain their own terms.

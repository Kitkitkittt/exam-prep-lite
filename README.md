# Exam Prep Archive

A simple English material browser for IELTS, GRE, and GMAT. The GitHub Pages app stays small while PDFs, audio, datasets, and question banks are retrieved directly from dedicated GitHub repositories under the same account.

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

- 277 IELTS files, approximately 1.97 GB
- 32 GRE files, approximately 158 MB
- 2 GMAT question-bank files
- Cambridge IELTS volumes 1–21 are indexed in the interface
- Complete book/audio files are currently present for Cambridge 4–18
- Cambridge 1–3 and 19–21 are shown as unavailable because the inspected source repositories do not contain those book/audio files

The catalog never marks a volume available unless at least one real repository file exists. Add properly licensed files to the IELTS material repository, run the snapshot command, and deploy again to update coverage.

## Interface

- IELTS, GRE, and GMAT switching
- Compact category navigation
- Cambridge 1–21 volume grid with hosted/missing indicators
- Fast English-title search
- Direct PDF preview
- Streaming audio player
- Image, Markdown, text, CSV, and JSON preview
- Direct raw-file and repository-file actions
- Responsive single-column layout on smaller screens

No study files are copied into the GitHub Pages build. This is important because a published Pages site may not exceed 1 GB, while the indexed IELTS archive alone is larger than that.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

## Refresh the material snapshot

The committed `public/catalog.json` makes the deployed site fast and avoids consuming unauthenticated GitHub API requests in every visitor's browser.

```bash
npm run catalog
```

The snapshot script reads the current public repository trees, translates the visible labels to English, and writes the catalog. It uses `GITHUB_TOKEN` when present but does not require one for these public repositories.

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

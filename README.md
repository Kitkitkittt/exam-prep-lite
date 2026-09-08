# ExamPrep Lite

ExamPrep Lite is an English-only, local-first study workspace for IELTS, GRE, and GMAT preparation. It combines a curated official-resource index with original practice questions, timed sessions, mistake review, spaced-repetition vocabulary, writing drills, analytics, and local material import.

**Live site:** https://kitkitkittt.github.io/exam-prep-lite/

## What it includes

- IELTS Academic, GRE General Test, and GMAT Focus workspaces
- Original mixed-question sprints with selectable length and timer
- Immediate answer feedback and explanations
- Recent-mistake queue and skill-level accuracy summaries
- Spaced-repetition vocabulary review
- Writing prompts, self-review rubric, word count, and local drafts
- Curated links to official preparation resources
- JSON/CSV question-bank import
- Local PDF, DOCX, and audio storage through IndexedDB
- Progress backup as a portable JSON file
- Responsive keyboard- and touch-friendly interface

No account, backend, analytics service, or cloud storage is required. Progress and imported materials stay in the current browser profile.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Test and build

```bash
npm run check
```

The production site is written to `dist/`. GitHub Actions deploys that directory to GitHub Pages whenever `main` changes.

## Import format

Use an array in JSON:

```json
[
  {
    "exam": "gre",
    "skill": "Quantitative",
    "difficulty": "Medium",
    "prompt": "What is 20% of 45?",
    "choices": ["5", "9", "12", "20"],
    "answer": 1,
    "explanation": "0.20 × 45 = 9."
  }
]
```

For CSV, use these headers:

```csv
exam,skill,difficulty,prompt,choices,answer,explanation
gmat,Quantitative,Easy,What is 3 + 4?,"5|6|7|8",2,3 + 4 = 7.
```

Answers use zero-based indexes: `0` is the first choice. Exact answer text is also accepted.

## Content and trademark boundary

The built-in questions, explanations, vocabulary examples, and writing prompts in this repository are original educational samples. They are not official exam questions and are not copied from commercial preparation books.

Exam names and provider names belong to their respective owners. This independent project is not endorsed by IELTS, Cambridge University Press & Assessment, ETS, GMAC, mba.com, the British Council, or IDP. Official materials remain at their providers' websites. Users are responsible for having permission to import local materials.

## Credits

The application was informed by the following open-source and educational projects. Credits are intentionally kept in this README rather than displayed in the study interface.

| Project | How it informed ExamPrep Lite | Upstream license/status |
| --- | --- | --- |
| [IELTS Atlas](https://github.com/sallowayma-git/IELTS-practice) by sallowayma-git | Static practice flow, question-bank import, history, and mistake analytics | GPL-3.0 |
| [my-ielts](https://github.com/hefengxian/my-ielts) by hefengxian | Vocabulary typing and compact learning-flow reference | No repository license declared; studied as a design reference only |
| [ISTS](https://github.com/aimerfeng/ists) by Aimer Feng | Local-first architecture, SRS, mock practice, writing workflows, and import philosophy | MIT |
| [IELTS Study](https://github.com/iFralex/IELTS-Study) by iFralex | Timed simulator and progress-dashboard reference | Source notice reserves redistribution rights; studied as a design reference only |
| [IELTS](https://github.com/zeeklog/IELTS) by zeeklog | Resource-catalog information architecture | No repository license declared; no bundled material copied |
| [Vox Velocity](https://github.com/andrewveda/vox-velocity) by Andrew Veda | Gamified vocabulary-learning reference | MIT |
| [oVLT](https://github.com/englishcentral/ovlt) by EnglishCentral | Vocabulary-diagnostic and placement-flow reference | MIT |
| [GRE-CN](https://github.com/LER0ever/GRE-CN) by L.E.R | CSV-first vocabulary-corpus structure | BSD-3-Clause |
| [GRE Preparation Tool](https://github.com/itsShnik/gre-preparation-tool) by Nikhil Shah | Lightweight quiz and progress mechanics | MIT |
| [gmat.site](https://github.com/huongoss/gmat.site) by huongoss | Timed-session and results-analysis reference | No repository license declared; studied as a design reference only |

The interface uses [Manrope](https://fonts.google.com/specimen/Manrope), [Newsreader](https://fonts.google.com/specimen/Newsreader), and [DM Mono](https://fonts.google.com/specimen/DM+Mono) from Google Fonts under their respective open font licenses.

## License

ExamPrep Lite is released under the [GNU General Public License v3.0](LICENSE).

Third-party names, linked resources, and imported user content are not relicensed by this repository. See each upstream project or provider for its own terms.

# cvnew Development Context

A unified repo replacing `gitond/cvsite` and `gitond/cvtex` — single source of truth for CV data, LaTeX CV, portfolio website, and blog. Object files in `data_storage/` drive all output pipelines.

## Project structure

```
.
├── .claude
│   └── settings.json
├── CLAUDE.md
├── data_storage          # Object files — source of truth for all content
│   ├── education
│   ├── entry_wo_picture
│   ├── entry_w_picture
│   ├── image
│   ├── intro
│   ├── paragraphed_text
│   ├── portfolio
│   ├── texcv_structure
│   └── webcv_structure
├── .gitignore
├── Makefile              # Root-level orchestration for all pipelines
├── README.md
├── texcv
│   ├── cv.pdf            # ⚠️ Build artifact — only overwrite via Makefile pipeline
│   └── cv.tex
└── webcv
    ├── client
    ├── package.json
    ├── package-lock.json
    └── server
        └── server.js
```

## Tech stack

### Data storage
- Object files with enforced field structure (format TBD — see open questions)
- i18n support: Finnish (`fi`) and English (`en`)

### LaTeX CV (`texcv/`)
- Bash `.sh` pipeline renders object files → `.tex`
- `pdflatex` renders `.tex` → `cv.pdf`
- Managed via root `Makefile`

### Website (`webcv/`)
- Node.js + Express backend
- React + Axios frontend
- Plain JavaScript throughout — no TypeScript
- `npm` for package management
- Shared `package.json` / `package-lock.json` (monorepo structure)
- Bash `.sh` pipeline renders object files → website content
- Managed via root `Makefile`
- WebAssembly for integrating C/C++ portfolio projects

## Key commands

```bash
# LaTeX CV
make cv          # object files → .tex → cv.pdf (assumed; verify in Makefile)

# Website
make site        # object files → website build (assumed; verify in Makefile)
npm install      # install dependencies
npm run dev      # start dev server (assumed; verify in package.json)
npm start        # start production server (assumed; verify in package.json)
```

> Note: Makefile targets above are assumed — check the actual `Makefile` for correct target names.

## Off-limits

Claude must **never**:
- Overwrite `texcv/cv.pdf` directly — it is a build artifact produced only by the Makefile pipeline
- Run `npm install <package>` to add new dependencies — suggest additions to `package.json` instead and let the user install
- Install LaTeX packages or modify the LaTeX installation
- Install system-level tools or packages (`apt`, `brew`, etc.)

## Planning documents

Before starting work on any feature or stage, check `plans/` for relevant planning documents if that directory exists. Read all that seem relevant to the task at hand.

## Code patterns & guidelines

- JavaScript only — no TypeScript on either frontend or backend
- Shell scripts must be bash-compatible
- All content pipelines run through the root `Makefile`
- i18n: all user-facing content must support `fi` and `en`
- Object files in `data_storage/` are the single source of truth — never hardcode content that belongs there
- Do not modify `README.md` — it is the canonical project description and is kept as-is

## Workflow guidelines

- Ask before making changes that affect more than 5 files
- Ask before changing object file structure or data storage format (affects all pipelines)
- Prefer small, focused commits
- Do not push to remote or create PRs without explicit instruction

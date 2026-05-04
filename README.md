# cvnew

A singular place where I can store my CV and build a portfolio website. Version control is important!!

## Old projects

Previously this was handled by two repos. `gitond/cvsite` and `gitond/cvtex`. `cvtex` was just my CV in .tex format with built in version control. `cvsite` attempted to be a portfolio website built with React. Its aim was to:

 1. Showcase my Node/React skills
 2. Be a web representation of my CV
   - And also provide a downloadable copy of my CV
 3. Have a portfolio thing in it, meaning that any and all project involved had to be "tryable" onsite; with external gh links among others.
 4. I eventually also wanted to include a blog where I could write my thoughts on the evolving tech field and keep it as a "dev dieary" of sorts.

`cvsite` has never been completely finished. Steps 1 and 2 were complete, 3 and 4 weren't.

## Goal

The aim of this project is to replace the previous two repos with a single coherent one. That way I have one place where I can make changes, add new items, write new blogposts etc and everything iterates through my Latex CV, WebCV, Portfolio, Blog or wherever I need it.

## Architecture/Tech stack

### Data Storage

 - "CV entries" (education, project, language, programming language, database technology, workplace, other relevant experience) and blog posts stored as "object files" with enforced field structure
 - i18n support needed (fi/en)

### Latex

 - "Object files" from **data storage** rendered as `.tex` through a `.sh` pipeline with relevant parameters
 - .tex rendered to .pdf using `pdflatex`
 - `Makefile` to manage all of this (located in project root)

### Website

 - NodeJS backend with `express`
 - React fronend
   - Server communication with `axios`
 - JS, not TS
 - `npm` for package management
   - shared `package.json`, `package-lock.json` between front & back (*"monorepo" structure*)
 - Website content as *"Object files"* in **data storage**
   - `.sh` pipeline to build site
   - `Makefile` for pipelinen management (located in project root)
 - `WebAssembly` for integrating certain C/C++ based projects to portfolio.

## Implementation Stages

### Stage 1: Data Structure & Latex CV

Need to define what gets stored as *"Object files"* in **data storage**, move everything necessary there, build the ***"Object files"* -> `.tex` -> `.pdf`** pipeline, run it at least once.

### Stage 2: WebCV

Build node/express server, react/axios client, react components, ***"Object files"* -> Website** pipeline. Run object file to website pipeline at least once.

### Stage 3: Portfolio with integrated projects

Make all ready projects that can be used in a web environment possible to run from within the website. Note: this includes C/C++ projects. WebAssembly probably needs to be used.

### Stage 4: Blog

Add a blog page to the website, where blog posts can be rendered from *"Object files"*

## Project structure

```
.
├── .claude
│   └── settings.json
├── CLAUDE.md
├── data_storage
│   ├── education
│   ├── entry_wo_picture
│   ├── entry_w_picture
│   ├── image
│   ├── intro
│   ├── paragraphed_text
│   ├── portfolio
│   ├── texcv_structure
│   └── webcv_structure
├── .gitignore
├── Makefile
├── README.md
├── texcv
│   ├── cv.pdf
│   └── cv.tex
└── webcv
    ├── client
    │   └── current_react_app_structure
    ├── package.json
    ├── package-lock.json
    └── server
        └── server.js
```

Entries under `data_storage` can be considered either datatypes, folders or *"Object files"*

## Open questions & challenges

 1. On **data storage** *"object files"*: What are these? `.json`? Something else? How is per-type uniformity enforced? How many different "object types" are needed?
 2. Integrating projects to portfolio: How to do this? (note: different kinds of projects, `WebAssembly`, different programming languages, etc)

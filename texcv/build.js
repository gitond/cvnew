#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const configFlag = args.indexOf('--config');
const configPath = configFlag !== -1 ? args[configFlag + 1] : 'texcv/configs/default.json';

if (!fs.existsSync(configPath)) {
  console.error(`Config not found: ${configPath}`);
  process.exit(1);
}

const cfg  = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const lang = cfg.lang || 'en';
const DATA = path.resolve(__dirname, '..', 'data_storage');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readJson(rel) {
  const p = path.join(DATA, rel);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function readMd(rel) {
  const p = path.join(DATA, rel);
  if (!fs.existsSync(p)) return null;
  const raw  = fs.readFileSync(p, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { front: {}, body: raw.trim() };
  const front = {};
  match[1].split('\n').forEach(line => {
    const m = line.match(/^(\w[\w_]*):\s*(.*)/);
    if (!m) return;
    let val = m[2].trim();
    if (val === 'null')                             val = null;
    else if (val === 'true')                        val = true;
    else if (val === 'false')                       val = false;
    else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    else if (val.startsWith('[') || val.startsWith('{')) {
      try { val = JSON.parse(val.replace(/'/g, '"')); } catch (_) {}
    }
    front[m[1]] = val;
  });
  return { front, body: match[2].trim() };
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g,  '\\&')
    .replace(/%/g,  '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g,  '\\#')
    .replace(/_/g,  '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g,  '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function hasTags(item, include, exclude) {
  const tags = item.tags || [];
  if (exclude && exclude.length && tags.some(t => exclude.includes(t))) return false;
  if (include && include.length && !tags.some(t => include.includes(t))) return false;
  return true;
}

function priorityScore(item, prioritize) {
  if (!prioritize || !prioritize.length) return 0;
  const tags = item.tags || [];
  return tags.filter(t => prioritize.includes(t)).length;
}

function locationImplied(name, location) {
  if (!location) return false;
  const city = location.split(',')[0].trim().toLowerCase();
  if (!city) return false;
  return name.toLowerCase().split(/[\s,]+/).some(w => w.startsWith(city));
}

function makeYearRange(start, end, ongoingSuffix) {
  const suffix = ongoingSuffix !== undefined ? ongoingSuffix : '--present';
  if (end == null)       return `${start}${suffix}`;
  if (end === start)     return String(start);
  return `${start}--${end}`;
}

// ---------------------------------------------------------------------------
// Load data
// ---------------------------------------------------------------------------
const contact     = readJson('contact.json') || {};
const skills      = readJson(`skill.${lang}.json`) || [];
const education   = readJson(`education.${lang}.json`) || [];
const workplaces  = readJson(`workplace.${lang}.json`) || [];

// portfolio items
const portfolioDir = path.join(DATA, 'portfolio');
const projects = fs.readdirSync(portfolioDir)
  .filter(f => f.endsWith(`.${lang}.md`))
  .map(f => {
    const md = readMd(`portfolio/${f}`);
    return { ...md.front, description: md.body };
  });

// publications
const pubDir = path.join(DATA, 'publication');
const publications = fs.readdirSync(pubDir)
  .filter(f => f.endsWith(`.${lang}.md`))
  .map(f => {
    const md = readMd(`publication/${f}`);
    return { ...md.front, description: md.body };
  });

// intro
const introId  = (cfg.sections.intro || {}).id || 'myIntro';
const introMd  = readMd(`intro/${introId}.${lang}.md`);
const introText = introMd ? introMd.body : '';

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildHeader() {
  const name = esc(contact.name || 'Your Name');
  return [
    `\\noindent\\begin{minipage}[t]{0.5\\linewidth}`,
    `{\\LARGE \\textbf{${name}}}`,
    `\\end{minipage}%`,
    `\\begin{minipage}[t]{0.5\\linewidth}`,
    `\\raggedleft`,
    `\\textbf{CURRICULUM VITAE}\\\\`,
    `\\today`,
    `\\end{minipage}`
  ].join('\n');
}

function buildContact() {
  const scfg = cfg.sections.contact || {};
  const sep  = esc(scfg.separator || ' | ');
  const parts = [];
  if (contact.location) parts.push(esc(contact.location));
  if (contact.phone)    parts.push(esc(contact.phone));
  if (contact.email)    parts.push(`\\href{mailto:${contact.email}}{${esc(contact.email)}}`);
  if (contact.linkedin) parts.push(`\\href{${contact.linkedin}}{LinkedIn}`);
  if (contact.github)   parts.push(`\\href{${contact.github}}{GitHub}`);
  if (!parts.length) return '';
  return `\\begin{center}\n${parts.join(sep)}\n\\end{center}`;
}

function buildIntro() {
  const scfg = cfg.sections.intro;
  if (!scfg || !scfg.enabled || !introText) return '';
  return [
    `\\cvsection{${esc(scfg.heading || 'Profile')}}`,
    esc(introText)
  ].join('\n');
}

function gradeToNum(grade, system) {
  if (system === '1-5') return parseFloat(grade) || 0;
  return 0;
}

function buildEducation() {
  const scfg = cfg.sections.education;
  if (!scfg || !scfg.enabled) return '';
  const sorted   = [...education].sort((a, b) => (b.year_start || 0) - (a.year_start || 0));
  const yearStrs = sorted.map(edu => makeYearRange(edu.year_start, edu.year_end));
  const widest   = yearStrs.reduce((a, b) => b.length > a.length ? b : a, '');

  const entries = sorted.map((edu, i) => {
    const loc       = locationImplied(edu.institution, edu.location) ? '' : `, ${esc(edu.location)}`;
    const degLine   = `\\textbf{${esc(edu.degree)}}, ${esc(edu.institution)}${loc}`;
    const majorLine = edu.major ? `\\newline \\textit{Major:} ${esc(edu.major)}` : '';
    const minorLine = edu.minor ? `\\newline \\textit{Minor:} ${esc(edu.minor)}` : '';
    const infoLine  = edu.additional_info ? `\\newline \\textit{${esc(edu.additional_info)}}` : '';

    let coursePart = '';
    if (scfg.show_courses && edu.courses && edu.courses.length) {
      const systems  = scfg.course_grading_systems || [];
      const minGrade = scfg.min_course_grade != null ? parseFloat(scfg.min_course_grade) : null;
      const incTags  = scfg.course_include_tags || [];
      const excTags  = scfg.course_exclude_tags || [];
      const filtered = edu.courses.filter(c => {
        if (systems.length && !systems.includes(c.grading_system)) return false;
        if (minGrade != null && gradeToNum(c.grade, c.grading_system) < minGrade) return false;
        if (excTags.length && (c.tags || []).some(t => excTags.includes(t))) return false;
        if (incTags.length && !(c.tags || []).some(t => incTags.includes(t))) return false;
        return true;
      });
      if (filtered.length) {
        const courseLines = filtered.map(c => `\\newline \\quad \\textbullet\\ ${esc(c.name)}`).join('');
        coursePart = `\\newline \\textit{Relevant courses:}${courseLines}`;
      }
    }

    const right = `${degLine}${majorLine}${minorLine}${infoLine}${coursePart}`;
    return [
      `\\begin{tabularx}{\\linewidth}{@{}p{\\cvleftwidth}X@{}}`,
      `  ${esc(yearStrs[i])} & ${right} \\\\`,
      `\\end{tabularx}`
    ].join('\n');
  });

  return [
    `\\cvsection{${esc(scfg.heading || 'Education')}}`,
    `\\settowidth{\\cvleftwidth}{${widest}}\\addtolength{\\cvleftwidth}{1em}`,
    entries.join('\n\\vspace{8pt}\n')
  ].join('\n');
}

function buildPublications() {
  const scfg = cfg.sections.publications;
  if (!scfg || !scfg.enabled) return '';
  const inc = scfg.include_tags || [];
  const exc = scfg.exclude_tags || [];
  const filtered = publications.filter(p => {
    if (scfg.published_only && p.status !== 'published') return false;
    return hasTags(p, inc, exc);
  });
  if (!filtered.length) return '';

  const items = filtered.map(pub => {
    const statusNote = pub.status === 'ongoing' ? ' (ongoing)' : '';
    const titlePart  = pub.link
      ? `\\href{${pub.link}}{${esc(pub.title)}}${statusNote}`
      : `${esc(pub.title)}${statusNote}`;
    const typeLabel  = pub.type === 'bsc_thesis' ? "BSc Thesis" : "MSc Thesis";
    return `  \\item[\\textbullet] \\textbf{${typeLabel}:} ${titlePart}\\\\\n  ${esc(pub.description)}`;
  });

  return [
    `\\cvsection{${esc(scfg.heading || 'Publications & Theses')}}`,
    `\\begin{description}`,
    items.join('\n'),
    `\\end{description}`
  ].join('\n');
}

function buildWork() {
  const scfg = cfg.sections.work;
  if (!scfg || !scfg.enabled) return '';
  const inc  = scfg.include_tags    || [];
  const exc  = scfg.exclude_tags    || [];
  const prio = scfg.prioritize_tags || [];

  let filtered = workplaces.filter(w => hasTags(w, inc, exc));
  filtered.sort((a, b) => {
    const ps = priorityScore(b, prio) - priorityScore(a, prio);
    if (ps !== 0) return ps;
    return (b.year_start || 0) - (a.year_start || 0);
  });
  if (scfg.max) filtered = filtered.slice(0, scfg.max);

  const yearStrs = filtered.map(w => makeYearRange(w.year_start, w.year_end));
  const widest   = yearStrs.reduce((a, b) => b.length > a.length ? b : a, '');

  const entries = filtered.map((w, i) => {
    const loc     = locationImplied(w.company, w.location) ? '' : `, ${esc(w.location)}`;
    const header  = `\\textbf{${esc(w.role)}}, ${esc(w.company)}${loc}`;
    const summary = w.summary ? `\\newline ${esc(w.summary)}` : '';
    return [
      `\\begin{tabularx}{\\linewidth}{@{}p{\\cvleftwidth}X@{}}`,
      `  ${esc(yearStrs[i])} & ${header}${summary} \\\\`,
      `\\end{tabularx}`
    ].join('\n');
  });

  return [
    `\\cvsection{${esc(scfg.heading || 'Work Experience')}}`,
    `\\settowidth{\\cvleftwidth}{${widest}}\\addtolength{\\cvleftwidth}{1em}`,
    entries.join('\n\\vspace{8pt}\n')
  ].join('\n');
}

function buildProjects() {
  const scfg = cfg.sections.projects;
  if (!scfg || !scfg.enabled) return '';
  const inc  = scfg.include_tags    || [];
  const exc  = scfg.exclude_tags    || [];
  const prio = scfg.prioritize_tags || [];

  let filtered = projects.filter(p => hasTags(p, inc, exc));
  filtered.sort((a, b) => {
    const ps = priorityScore(b, prio) - priorityScore(a, prio);
    if (ps !== 0) return ps;
    return (b.year_start || 0) - (a.year_start || 0);
  });
  if (scfg.max) filtered = filtered.slice(0, scfg.max);

  const items = filtered.map(proj => {
    const yearRange  = proj.year_start ? makeYearRange(proj.year_start, proj.year_end, ' to present') : '';
    const stackTags  = (proj.tech_stack || []).map(t => `\\colorbox{gray!15}{\\strut\\small ${esc(t)}}`).join(' ');
    const repoLink   = proj.repo_url ? ` \\href{${proj.repo_url}}{[repo]}` : '';
    const demoLink   = proj.demo_url ? ` \\href{${proj.demo_url}}{[demo]}` : '';
    const statusNote = proj.status === 'archived' ? ' \\textit{(archived)}' : '';
    const metaParts  = [yearRange ? `\\small ${esc(yearRange)}` : '', stackTags].filter(Boolean).join('\\quad ');
    const desc       = proj.description ? `\\\\\n${esc(proj.description)}` : '';
    return [
      `\\noindent\\begin{minipage}[t]{\\linewidth}`,
      `  {\\large\\textbf{${esc(proj.title)}}}${statusNote}${repoLink}${demoLink}\\\\`,
      `  {${metaParts}}${desc}`,
      `\\end{minipage}`
    ].join('\n');
  });

  return [
    `\\cvsection{${esc(scfg.heading || 'Selected Projects')}}`,
    items.join('\n\\par\\vspace{4pt}\n')
  ].join('\n');
}

// proficiency rank for sorting
const PROF_RANK = { professional: 4, proficient: 3, familiar: 2, beginner: 1 };

// Finnish matriculation: level rank, then grade rank
const LEVEL_RANK = { native: 3, advanced: 2, intermediate: 1 };
const GRADE_RANK = { L: 7, E: 6, M: 5, C: 4, B: 3, A: 2, I: 1 };

function buildLanguages() {
  const scfg = cfg.sections.languages;
  if (!scfg || !scfg.enabled) return '';
  const langs = skills.filter(s => s.category === 'human_language');

  // non-matriculation first (sorted by proficiency), then matriculation (sorted by level then grade)
  const noMat = langs
    .filter(s => !s.matriculation)
    .sort((a, b) => (PROF_RANK[b.proficiency] || 0) - (PROF_RANK[a.proficiency] || 0));
  const mat = langs
    .filter(s => s.matriculation)
    .sort((a, b) => {
      const ld = (LEVEL_RANK[b.matriculation.level] || 0) - (LEVEL_RANK[a.matriculation.level] || 0);
      if (ld !== 0) return ld;
      return (GRADE_RANK[b.matriculation.grade] || 0) - (GRADE_RANK[a.matriculation.grade] || 0);
    });

  const rows = [...noMat, ...mat].map(s => {
    let detail;
    if (s.proficiency) {
      detail = esc(s.proficiency.charAt(0).toUpperCase() + s.proficiency.slice(1));
    } else if (s.matriculation) {
      detail = `Matriculation exam: ${esc(s.matriculation.level)} (${esc(s.matriculation.grade)})`;
    } else {
      detail = '';
    }
    return `  ${esc(s.name)} & ${detail} \\\\`;
  });

  return [
    `\\cvsection{${esc(scfg.heading || 'Languages')}}`,
    `\\begin{tabularx}{\\linewidth}{@{}lX@{}}`,
    rows.join('\n'),
    `\\end{tabularx}`
  ].join('\n');
}

function buildSkillBlock(category, scfg) {
  if (!scfg || !scfg.enabled) return '';
  const exc = scfg.exclude_ids || [];
  const items = skills
    .filter(s => s.category === category && !exc.includes(s.id))
    .sort((a, b) => (PROF_RANK[b.proficiency] || 0) - (PROF_RANK[a.proficiency] || 0));
  if (!items.length) return '';

  const rows = items.map(s => {
    const prof = s.proficiency
      ? `\\textit{${esc(s.proficiency.charAt(0).toUpperCase() + s.proficiency.slice(1))}}` : '';
    const subParts = (s.subtechnologies || []).map(sub => {
      return `\\textbf{${esc(sub.name)}}: ${sub.items.map(esc).join(', ')}`;
    });
    const sub = subParts.length ? ` -- ${subParts.join('; ')}` : '';
    return `  \\textbf{${esc(s.name)}}${prof ? ` (${prof})` : ''}${sub}`;
  });

  return [
    `\\cvsection{${esc(scfg.heading)}}`,
    `\\begin{itemize}[leftmargin=*,noitemsep]`,
    rows.map(r => `  \\item ${r}`).join('\n'),
    `\\end{itemize}`
  ].join('\n');
}

function buildOtherTools() {
  const scfg = cfg.sections.other_tools;
  if (!scfg || !scfg.enabled) return '';
  const exc = scfg.exclude_ids || [];
  const items = skills
    .filter(s => ['tool', 'platform', 'framework'].includes(s.category) && !exc.includes(s.id))
    .sort((a, b) => (PROF_RANK[b.proficiency] || 0) - (PROF_RANK[a.proficiency] || 0));
  if (!items.length) return '';

  const rows = items.map(s => {
    const prof = s.proficiency
      ? `\\textit{${esc(s.proficiency.charAt(0).toUpperCase() + s.proficiency.slice(1))}}` : '';
    const subParts = (s.subtechnologies || []).map(sub => {
      return `\\textbf{${esc(sub.name)}}: ${sub.items.map(esc).join(', ')}`;
    });
    const sub = subParts.length ? ` -- ${subParts.join('; ')}` : '';
    return `  \\item \\textbf{${esc(s.name)}}${prof ? ` (${prof})` : ''}${sub}`;
  });

  return [
    `\\cvsection{${esc(scfg.heading || 'Tools & Platforms')}}`,
    `\\begin{itemize}[leftmargin=*,noitemsep]`,
    rows.join('\n'),
    `\\end{itemize}`
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Assemble document
// ---------------------------------------------------------------------------
const page = cfg.page || {};
const font = cfg.font || {};
const marginTop    = page.margin_top    || '1.5cm';
const marginBottom = page.margin_bottom || '2cm';
const marginLeft   = page.margin_left   || '2cm';
const marginRight  = page.margin_right  || '2cm';
const paper        = page.paper         || 'a4paper';
const fontSize     = font.size          || 11;

const sections = cfg.sections || {};

const body = [
  buildHeader(),
  '\\vspace{8pt}',
  buildContact(),
  sections.intro                  && buildIntro(),
  sections.education              && buildEducation(),
  sections.publications           && buildPublications(),
  sections.work                   && buildWork(),
  sections.projects               && buildProjects(),
  sections.languages              && buildLanguages(),
  sections.programming_languages  && buildSkillBlock('programming_language', sections.programming_languages),
  sections.databases              && buildSkillBlock('database', sections.databases),
  sections.other_tools            && buildOtherTools(),
].filter(Boolean).join('\n\n');

const tex = `% Auto-generated by texcv/build.js — do not edit by hand
\\documentclass[${fontSize}pt]{article}
\\usepackage[${paper},top=${marginTop},bottom=${marginBottom},left=${marginLeft},right=${marginRight}]{geometry}
\\usepackage{tabularx}
\\usepackage{needspace}
\\usepackage{parskip}
\\usepackage{lmodern}
\\usepackage{enumitem}
\\usepackage[dvipsnames,table]{xcolor}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{hyperref}

\\hypersetup{
  colorlinks=true,
  urlcolor=blue,
  linkcolor=black
}

\\pagestyle{empty}
\\newlength{\\cvleftwidth}

\\newcommand{\\cvsection}[1]{%
  \\needspace{4\\baselineskip}%
  \\vspace{14pt}%
  {\\large\\textbf{#1}}\\\\[-4pt]%
  \\rule{\\linewidth}{0.4pt}\\nopagebreak%
  \\vspace{3pt}%
}

\\begin{document}

${body}

\\end{document}
`;

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
const outPath = path.join(__dirname, 'cv.tex');
fs.writeFileSync(outPath, tex, 'utf8');
console.log(`Written: ${outPath}`);

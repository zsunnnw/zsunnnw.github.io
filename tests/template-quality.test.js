const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const index = read('index.html');
const scripts = read('static/js/scripts.js');
const mainCss = read('static/css/main.css');
const config = read('contents/config.yml');
const gitignore = read('.gitignore');
const yaml = require('../static/js/js-yaml.min.js');
const { pages, 'resume-downloads': resumes } = yaml.load(config);

assert.deepEqual(resumes.map(resume => resume.lang), ['en', 'zh-Hans']);
assert.equal(new Set(resumes.map(resume => resume.href)).size, resumes.length, 'each language needs its own PDF');
for (const resume of resumes) {
  assert.equal(path.basename(resume.href), resume.download, 'download name should match the PDF asset');
  assert.equal(read(resume.href).slice(0, 5), '%PDF-', 'each resume must point to a PDF file');
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

assert.equal(index.includes('polyfill.io'), false, 'polyfill.io must not be loaded');
assert.equal(countMatches(index, /id="MathJax-script"/g), 1, 'MathJax should be loaded exactly once');
assert.equal(countMatches(index, /mathjax@3\/es5\/tex-[^"]+\.js/g), 1, 'Only one MathJax component bundle should be loaded');
assert.equal(
  /<link[^>]+static\/css\/styles\.css/.test(index) && /@import\s+["']\.\/styles\.css["']/.test(mainCss),
  false,
  'styles.css should not be loaded both directly and through main.css'
);
assert.equal(index.includes(' mt5 '), false, 'invalid mt5 class should not be used');
assert.equal(index.includes(' md5'), false, 'invalid md5 class should not be used');
assert.match(index, /<img\b[^>]*\balt="/, 'profile image should include alt text');
assert.equal(mainCss.includes('background-size: fill'), false, 'background-size: fill is invalid CSS');
assert.equal(index.includes('github.com/senli1073'), false, 'template should not hard-code the original author GitHub URL');
assert.equal(/<section[^>]+class="top-section"[^>]+style=/.test(index), false, 'hero background should not be defined with inline styles');
assert.match(config, /backgrounds:/, 'background images should be configured in config.yml');
assert.match(config, /static\/assets\/background\//, 'configured backgrounds should use the background directory');
const configuredBackgrounds = [...config.matchAll(/^\s+-\s+(static\/assets\/background\/\S+)$/gm)].map((match) => match[1]);
assert.ok(configuredBackgrounds.length > 0, 'at least one background image should be configured');
configuredBackgrounds.forEach((background) => {
  assert.equal(fs.existsSync(path.join(root, background)), true, `configured background should exist: ${background}`);
});
assert.match(scripts, /function\s+initBackgroundSlideshow/, 'background slideshow should be initialized from JS');
assert.match(mainCss, /prefers-reduced-motion:\s*reduce/, 'slideshow should respect reduced motion preferences');
assert.equal(/<img\b[^>]*\bsrc="static\/assets\/img\/photo\.png"[^>]*\bwidth=/.test(index), false, 'avatar image should not force a fixed width attribute');
assert.equal(/<img\b[^>]*\bsrc="static\/assets\/img\/photo\.png"[^>]*\bheight=/.test(index), false, 'avatar image should not force a fixed height attribute');
assert.match(mainCss, /#avatar img\s*\{[^}]*width:\s*100%[^}]*height:\s*auto/, 'avatar should scale to its container and preserve the image ratio');
assert.ok(fs.existsSync(path.join(root, 'contents/life.md')), 'Life should have a Markdown content file');
assert.match(gitignore, /^\.superpowers\/$/m, '.superpowers companion artifacts should be ignored');
assert.equal(/getElementById\(key\)\.innerHTML\s*=\s*yml\[key\]/.test(scripts), false, 'YAML config values should not be injected with innerHTML');
assert.match(scripts, /typesetPromise/, 'MathJax should be invoked with typesetPromise');
assert.equal(/MathJax\.typeset\(\)/.test(scripts), false, 'MathJax.typeset() should not be called repeatedly per section');
assert.equal(/const\s+section_names\s*=/.test(scripts), false, 'section list should come from configuration instead of a JS constant');
assert.equal(/<ul class="navbar-nav ms-auto me-4 my-3 my-lg-0">\s*<li/s.test(index), false, 'navigation items should be rendered from configuration');
assert.match(index, /<main id="sections"><\/main>/, 'content sections should be rendered into a single sections container');
assert.equal(/<section[^>]+id="home"/.test(index), false, 'home section should not be hard-coded in index.html');
assert.equal(/<section[^>]+id="publications"/.test(index), false, 'publications section should not be hard-coded in index.html');
assert.equal(/<section[^>]+id="awards"/.test(index), false, 'awards section should not be hard-coded in index.html');
assert.match(scripts, /function\s+renderSections/, 'sections should be generated from configuration');
assert.equal(/['"]mt-5['"]/.test(scripts), false, 'generated sections should not add extra top margins');
assert.equal(/['"]mb-5['"]/.test(scripts), false, 'generated sections should not add extra bottom margins');
assert.match(index, /<body[^>]*class="site-loading"/, 'page should start in a loading state before async content is ready');
assert.match(mainCss, /@keyframes\s+skeleton-shimmer/, 'skeleton placeholders should use a shimmer animation');
assert.match(mainCss, /animation:\s*skeleton-shimmer/, 'skeleton placeholders should show a moving shimmer while loading');
assert.match(mainCss, /prefers-reduced-motion:\s*reduce[\s\S]*\.skeleton-block/, 'skeleton animation should respect reduced motion preferences');
assert.match(scripts, /function\s+markSiteReady/, 'JS should expose a loading completion transition');
assert.match(scripts, /\.finally\(\(\)\s*=>\s*markSiteReady\(\)\)/, 'site should leave loading state even if content loading fails');
assert.doesNotMatch(index, /skeleton-nav/, 'navbar should not use skeleton placeholders');
assert.doesNotMatch(index, /skeleton-hero/, 'hero text should not use skeleton placeholder markup');
assert.doesNotMatch(index, /skeleton-avatar/, 'avatar should not use skeleton placeholders');
assert.doesNotMatch(mainCss, /\.skeleton-nav\b/, 'navbar skeleton CSS should not be kept');
assert.doesNotMatch(mainCss, /\.skeleton-hero\b/, 'hero text skeleton CSS should not be kept');
assert.doesNotMatch(mainCss, /\.skeleton-avatar\b/, 'avatar skeleton CSS should not be kept');
assert.match(mainCss, /\.page-skeleton\s*\{[\s\S]*padding-top:\s*2\.4rem/, 'section skeleton placeholders should sit one text line lower');
assert.match(mainCss, /\.skeleton-block\s*\{[\s\S]*max-width:\s*100%/, 'skeleton blocks should never overflow their container');
assert.match(mainCss, /\.skeleton-line-long\s*\{[\s\S]*width:\s*100%/, 'long skeleton lines should shrink with the content container');
assert.match(mainCss, /\.skeleton-line-short\s*\{[\s\S]*width:\s*68%/, 'short skeleton lines should use proportional width for narrow screens');

assert.deepEqual(pages.map(page => page.id), ['home', 'projects', 'life']);
assert.deepEqual(pages[0].sections.map(section => section.id), ['education', 'experience', 'publications', 'awards']);
assert.deepEqual(pages[1].sections.map(section => section.id), ['projects', 'experience']);
assert.deepEqual(pages[2].sections.map(section => section.id), ['life']);

for (const page of pages) {
  const document = page.id === 'home' ? index : read(page.href);
  assert.ok(document.includes(`data-page="${page.id}"`), `page shell should identify itself: ${page.id}`);
  assert.match(document, /<main id="sections"><\/main>/);
  for (const section of page.sections) {
    assert.ok(read(`contents/${section.file || section.id}.md`).trim(), `content should exist: ${section.id}`);
  }
}

console.log('template quality checks passed');

window.MathJax = {
    tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: false,
        tags: 'all',
    },
};

const content_dir = 'contents/'
const config_file = 'config.yml'

const allowedUrlProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
const configOnlyKeys = [
    'pages', 'resume-downloads', 'profile-links', 'affiliations', 'backgrounds',
    'background-mode', 'background-interval-ms', 'background-overlay',
];

function stringifyValue(value) {
    return value == null ? '' : value.toString();
}

function decodeText(value) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = String(value);
    return textarea.value;
}

function setElementValue(element, value) {
    if (value && typeof value === 'object') {
        if ('text' in value) {
            element.textContent = decodeText(value.text);
        }
        if ('href' in value && element instanceof HTMLAnchorElement) {
            element.href = value.href;
        }
        return;
    }

    element.textContent = decodeText(value);
}

function createLink(item) {
    if (!item?.text || !item.href) {
        return null;
    }

    try {
        const url = new URL(item.href, window.location.href);
        if (!['http:', 'https:'].includes(url.protocol)) {
            return null;
        }
    } catch {
        return null;
    }

    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.text;
    return link;
}

function renderNavigation(pages, currentPage, resumes) {
    const list = document.getElementById('navbar-items');

    for (const page of pages) {
        const link = createLink(page);
        if (!link) continue;

        const item = document.createElement('li');
        item.className = 'nav-item';
        link.className = 'nav-link';
        if (page.id === currentPage) {
            link.setAttribute('aria-current', 'page');
        }
        item.append(link);
        list.append(item);
    }

    if (Array.isArray(resumes) && resumes.length) {
        renderResumeMenu(list, resumes);
    }
}

function renderResumeMenu(nav, resumes) {
    const menu = document.createElement('ul');
    menu.className = 'dropdown-menu dropdown-menu-end';
    menu.setAttribute('aria-labelledby', 'resume-toggle');

    for (const resume of resumes) {
        const link = createLink(resume);
        if (!link) continue;

        link.className = 'dropdown-item';
        link.lang = resume.lang;
        link.download = resume.download;
        link.append(' ', createLinkIcon('bi-download'));
        const item = document.createElement('li');
        item.append(link);
        menu.append(item);
    }

    if (!menu.childElementCount) return;

    const item = document.createElement('li');
    item.className = 'nav-item dropdown';
    const toggle = document.createElement('button');
    toggle.id = 'resume-toggle';
    toggle.type = 'button';
    toggle.className = 'nav-link dropdown-toggle';
    toggle.setAttribute('data-bs-toggle', 'dropdown');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = 'Resume';
    item.append(toggle, menu);
    nav.append(item);
}

function createLinkIcon(name) {
    const icon = document.createElement('i');
    icon.classList.add('bi', name);
    icon.setAttribute('aria-hidden', 'true');
    return icon;
}

function renderProfileLinks(links) {
    const container = document.getElementById('profile-links');
    if (!container) return;

    for (const item of links) {
        const link = createLink(item);
        if (!link) continue;

        if (item.style === 'linkedin') {
            link.className = 'profile-linkedin';
            link.setAttribute('aria-label', 'LinkedIn profile');
            link.replaceChildren(createLinkIcon(item.icon));
            container.append(link);
            continue;
        }

        link.className = 'profile-button';
        if (item.style) link.classList.add('profile-button-' + item.style);

        const label = document.createElement('span');
        label.className = 'profile-button-label';
        label.textContent = item.label || item.text;

        const platform = document.createElement('span');
        platform.className = 'profile-button-platform';
        if (item.icon) platform.append(createLinkIcon(item.icon));
        platform.append(item.text);
        link.replaceChildren(label, platform);
        container.append(link);
    }
}

function renderAffiliationLogo(link, affiliation) {
    if (!affiliation.logo) return;

    const frame = document.createElement('span');
    frame.className = 'affiliation-logo';
    if (affiliation['logo-background']) frame.dataset.background = affiliation['logo-background'];

    const image = document.createElement('img');
    image.src = affiliation.logo;
    image.alt = affiliation.text;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => { link.textContent = affiliation.text; }, { once: true });
    frame.append(image);
    link.replaceChildren(frame);
}

function renderAffiliations(links) {
    const list = document.getElementById('affiliation-links');

    for (const item of links) {
        const link = createLink(item);
        if (!link) continue;

        const entry = document.createElement('li');
        entry.className = 'affiliation';

        renderAffiliationLogo(link, item);

        link.className = 'affiliation-university';
        entry.append(link);

        if (item.departments?.length) {
            const departments = document.createElement('ul');
            departments.className = 'affiliation-departments';

            for (const department of item.departments) {
                const departmentLink = createLink(department);
                if (!departmentLink) continue;

                renderAffiliationLogo(departmentLink, department);
                const departmentEntry = document.createElement('li');
                departmentEntry.append(departmentLink);
                departments.append(departmentEntry);
            }

            entry.append(departments);
        }

        list.append(entry);
    }
}

function renderSections(sections) {
    const sectionsContainer = document.getElementById('sections');

    for (const section of sections) {
        const sectionElement = document.createElement('section');
        const container = document.createElement('div');
        const body = document.createElement('div');

        sectionElement.id = section.id;
        container.className = 'container px-5';
        body.className = 'main-body';
        body.id = section.id + '-md';

        if (section.title) {
            const heading = document.createElement('h2');
            heading.textContent = section.title;
            container.append(heading);
        }

        container.append(body);
        sectionElement.append(container);
        sectionsContainer.append(sectionElement);
    }
}

function normalizeBackgrounds(backgrounds) {
    if (Array.isArray(backgrounds)) {
        return backgrounds.filter((background) => typeof background === 'string' && background.trim() !== '');
    }

    if (typeof backgrounds === 'string' && backgrounds.trim() !== '') {
        return [backgrounds];
    }

    return [];
}

function chooseInitialBackgroundIndex(backgroundCount) {
    if (!Number.isFinite(backgroundCount) || backgroundCount <= 1) {
        return 0;
    }

    return Math.floor(Math.random() * backgroundCount);
}

window.chooseInitialBackgroundIndex = chooseInitialBackgroundIndex;

function initBackgroundSlideshow(yml) {
    if (yml['background-mode'] === 'solid') {
        return;
    }

    const backgrounds = normalizeBackgrounds(yml.backgrounds);
    const layers = [...document.querySelectorAll('.top-section-bg')];
    const interval = Number(yml['background-interval-ms']) || 7000;
    const overlay = Number(yml['background-overlay']);

    if (Number.isFinite(overlay)) {
        document.documentElement.style.setProperty('--top-section-overlay', Math.min(0.85, Math.max(0, overlay)));
    }

    if (backgrounds.length === 0 || layers.length === 0) {
        return;
    }

    document.getElementById('top-section')?.classList.add('has-photo-background');

    let activeLayer = 0;
    let activeBackground = chooseInitialBackgroundIndex(backgrounds.length);

    layers[activeLayer].style.backgroundImage = `url("${backgrounds[activeBackground]}")`;

    if (backgrounds.length === 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    window.setInterval(() => {
        const nextLayer = activeLayer === 0 ? 1 : 0;
        activeBackground = (activeBackground + 1) % backgrounds.length;

        layers[nextLayer].style.backgroundImage = `url("${backgrounds[activeBackground]}")`;
        layers[nextLayer].classList.add('top-section-bg-active');
        layers[activeLayer].classList.remove('top-section-bg-active');
        activeLayer = nextLayer;
    }, Math.max(2500, interval));
}

function sanitizeMarkdownHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = html;

    template.content.querySelectorAll('script, style, iframe, object, embed, link, meta, base, form, input, button').forEach((node) => {
        node.remove();
    });

    template.content.querySelectorAll('*').forEach((node) => {
        [...node.attributes].forEach((attribute) => {
            const name = attribute.name.toLowerCase();
            const value = attribute.value.trim();

            if (name.startsWith('on')) {
                node.removeAttribute(attribute.name);
                return;
            }

            if (['href', 'src'].includes(name)) {
                try {
                    const url = new URL(value, window.location.href);
                    if (!allowedUrlProtocols.includes(url.protocol)) {
                        node.removeAttribute(attribute.name);
                    }
                } catch {
                    node.removeAttribute(attribute.name);
                }
            }
        });
    });

    return template.innerHTML;
}

function typesetMath() {
    if (!window.MathJax || !MathJax.startup || !MathJax.typesetPromise) {
        return Promise.resolve();
    }

    return MathJax.startup.promise.then(() => MathJax.typesetPromise());
}

function loadConfig() {
    return fetch(content_dir + config_file)
        .then(response => {
            if (!response.ok) throw new Error('Could not load site configuration');
            return response.text();
        })
        .then(text => jsyaml.load(text) || {})
        .catch(error => {
            console.log(error);
            return {};
        });
}

function applyConfig(yml) {
    Object.keys(yml).forEach(key => {
        if (configOnlyKeys.includes(key)) {
            return;
        }

        const element = document.getElementById(key);
        const value = yml[key];

        if (!element) {
            return;
        }

        try {
            setElementValue(element, value);
        } catch {
            console.log("Invalid id and value: " + key + "," + stringifyValue(value))
        }
    });
}

function loadMarkdownSection(section) {
    const url = new URL(content_dir + (section.file || section.id) + '.md', window.location.href);
    const revision = document.body.dataset.contentRevision;
    if (revision) url.searchParams.set('v', revision);
    return fetch(url, { cache: 'no-cache' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Could not load section: ' + section.id);
            }

            return response.text();
        })
        .then(markdown => {
            const target = document.getElementById(section.id + '-md');
            const html = sanitizeMarkdownHtml(marked.parse(markdown));
            target.innerHTML = html;
            if (section.id === 'experience' && document.body.dataset.page === 'home') {
                target.querySelectorAll('.work-detail').forEach(detail => detail.remove());
            }
            if (section.id === 'life') window.initLifePage?.(target);
        })
        .catch(error => console.log(error));
}

function markSiteReady() {
    document.body.classList.remove('site-loading');
    document.body.classList.add('site-ready');
}

window.addEventListener('DOMContentLoaded', () => {
    marked.use({ mangle: false, headerIds: false });

    loadConfig()
        .then((yml) => {
            const currentPage = document.body.dataset.page;
            const pages = yml.pages || [];
            const page = pages.find(item => item.id === currentPage)
                || pages.flatMap(item => item.details || []).find(item => item.id === currentPage);
            const sections = page?.sections || [];

            // The original homepage exposed Projects and Life as anchors.
            const oldSection = window.location.hash.slice(1);
            if (currentPage === 'home' && ['projects', 'life'].includes(oldSection)) {
                const destination = pages.find(item => item.id === oldSection);
                if (destination) {
                    window.location.replace(destination.href);
                    return;
                }
            }

            applyConfig(yml);
            renderNavigation(pages, document.body.dataset.navPage || currentPage, yml['resume-downloads']);
            renderProfileLinks(yml['profile-links'] || []);
            renderAffiliations(yml.affiliations || []);
            renderSections(sections);
            initBackgroundSlideshow(yml);

            return Promise.all(sections.map(loadMarkdownSection));
        })
        .then(() => typesetMath())
        .catch(error => console.log(error))
        .finally(() => markSiteReady())
        .then(() => {
            // Markdown anchor targets do not exist until the content has loaded.
            const target = document.getElementById(window.location.hash.slice(1));
            if (target && document.getElementById('sections').contains(target)) {
                target.scrollIntoView({ behavior: 'instant' });
            }
        });
});

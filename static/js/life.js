window.initLifePage = function initLifePage(section) {
    const gallery = section.querySelector('#life-gallery');
    if (!gallery) return;

    setupLifeGallery(gallery, Array.from(gallery.querySelectorAll('.gallery-slide')));
    setupTravelMap(section.querySelector('#travel-map'));
};

function lifeButton(className, text, label = text) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = text;
    button.setAttribute('aria-label', label);
    return button;
}

function getPhotoRatio(image) {
    if (!image) return 1;

    const width = image.naturalWidth || Number(image.getAttribute('width'));
    const height = image.naturalHeight || Number(image.getAttribute('height'));
    return width > 0 && height > 0 ? width / height : 1;
}

function setupLifeGallery(gallery, slides) {
    if (!slides.length) return;

    const viewport = gallery.querySelector('.gallery-viewport');
    const track = gallery.querySelector('.gallery-track');
    const count = slides.length;
    const loop = count > 1;
    const images = slides.map(slide => slide.querySelector('img'));
    const ratios = images.map(getPhotoRatio);
    const sourceIndices = slides.map((_, index) => index);
    const displayedIndices = loop ? [count - 2, count - 1, ...sourceIndices, 0, 1] : sourceIndices;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const copies = loop ? [
        slides[count - 2].cloneNode(true),
        slides[count - 1].cloneNode(true),
        ...slides,
        slides[0].cloneNode(true),
        slides[1].cloneNode(true),
    ] : slides;

    track.replaceChildren(...copies);
    copies.forEach(slide => {
        slide.setAttribute('role', 'group');
        slide.setAttribute('aria-roledescription', 'slide');
    });

    const controls = document.createElement('div');
    controls.className = 'gallery-controls';
    const caption = document.createElement('p');
    caption.className = 'gallery-caption';
    const buttons = document.createElement('div');
    buttons.className = 'gallery-buttons';
    const previous = lifeButton('gallery-arrow', '←', 'Previous photo');
    const next = lifeButton('gallery-arrow', '→', 'Next photo');
    const toggle = lifeButton('gallery-toggle', '', '');
    buttons.append(previous, next, toggle);
    controls.append(caption);
    if (loop) controls.append(buttons);
    gallery.append(controls);

    let position = loop ? 2 : 0;
    let playing = loop && !motion.matches;
    let hovering = false;
    let timer;
    let wrapTimer;
    let swipeStart;
    let layoutWidth = 0;

    function paint(jump = false) {
        if (jump) track.classList.add('gallery-jump');
        const current = copies[position];
        const center = current.offsetLeft + current.offsetWidth / 2;
        track.style.setProperty('--gallery-offset', (viewport.clientWidth / 2 - center) + 'px');
        copies.forEach((slide, index) => {
            slide.classList.toggle('gallery-active', index === position);
            slide.setAttribute('aria-hidden', String(index !== position));
        });

        const index = loop ? (position - 2 + count) % count : 0;
        const description = slides[index].querySelector('figcaption')?.textContent.trim();
        const positionLabel = count > 1 ? (index + 1) + ' / ' + count : '';
        caption.textContent = [description, positionLabel].filter(Boolean).join(' · ');
        if (jump) {
            // Commit the invisible reset before allowing another animated slide.
            track.getBoundingClientRect();
            track.classList.remove('gallery-jump');
        }
    }

    function layout(force = false) {
        const width = viewport.clientWidth;
        if (!width || (!force && width === layoutWidth)) return;

        layoutWidth = width;
        const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const frameWidth = width * (loop ? .84 : 1);
        const height = Math.min(28 * rootSize, frameWidth / Math.max(...ratios));
        track.style.setProperty('--gallery-height', height + 'px');
        copies.forEach((slide, index) => {
            slide.style.setProperty('--gallery-width', height * ratios[displayedIndices[index]] + 'px');
        });
        paint(true);
    }

    function schedule() {
        window.clearTimeout(timer);
        if (playing && !hovering && !document.hidden) {
            timer = window.setTimeout(() => advance(1), 4500);
        }
    }

    function finishWrap() {
        if (position >= 2 && position <= count + 1) return;
        window.clearTimeout(wrapTimer);
        position = position < 2 ? count + 1 : 2;
        paint(true);
    }

    function advance(direction) {
        if (!loop || position < 2 || position > count + 1) return;
        position += direction;
        paint();
        if (position < 2 || position > count + 1) {
            if (motion.matches) finishWrap();
            else wrapTimer = window.setTimeout(finishWrap, 650);
        }
        schedule();
    }

    function setPlaying(value) {
        playing = value && loop;
        toggle.textContent = playing ? 'Pause' : 'Play';
        toggle.setAttribute('aria-label', playing ? 'Pause autoplay' : 'Play slideshow');
        caption.setAttribute('aria-live', playing ? 'off' : 'polite');
        schedule();
    }

    viewport.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'mouse') return;
        hovering = true;
        schedule();
    });
    viewport.addEventListener('pointerleave', () => {
        hovering = false;
        schedule();
    });
    viewport.addEventListener('pointerdown', event => {
        if (event.pointerType === 'touch') swipeStart = event.clientX;
    });
    viewport.addEventListener('pointerup', event => {
        if (swipeStart === undefined) return;
        const distance = event.clientX - swipeStart;
        swipeStart = undefined;
        if (Math.abs(distance) > 45) advance(distance < 0 ? 1 : -1);
    });
    viewport.addEventListener('pointercancel', () => { swipeStart = undefined; });

    track.addEventListener('transitionend', event => {
        if (event.target === track && event.propertyName === 'transform') finishWrap();
    });
    previous.addEventListener('click', () => advance(-1));
    next.addEventListener('click', () => advance(1));
    toggle.addEventListener('click', () => setPlaying(!playing));
    controls.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        advance(event.key === 'ArrowLeft' ? -1 : 1);
    });
    document.addEventListener('visibilitychange', schedule);
    motion.addEventListener('change', () => setPlaying(!motion.matches));

    images.forEach((image, index) => {
        if (!image) return;
        image.addEventListener('load', () => {
            const ratio = getPhotoRatio(image);
            if (ratio === ratios[index]) return;
            ratios[index] = ratio;
            layout(true);
        });
    });
    new ResizeObserver(() => layout()).observe(viewport);
    layout();
    setPlaying(playing);
}

function projectTravelPoint(longitude, latitude) {
    return [(longitude + 180) * 1000 / 360, (84 - latitude) * 420 / 151.2];
}

function drawTravelLand(surface) {
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const land = document.createElementNS(svgNamespace, 'svg');
    land.setAttribute('viewBox', '0 0 1000 420');
    land.setAttribute('aria-hidden', 'true');
    surface.prepend(land);

    const source = 'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_110m_land.geojson';
    fetch(source, { referrerPolicy: 'no-referrer' })
        .then(response => {
            if (!response.ok) throw new Error('Travel map unavailable');
            return response.json();
        })
        .then(({ features }) => {
            for (const { geometry } of features) {
                const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
                const path = document.createElementNS(svgNamespace, 'path');
                path.setAttribute('d', polygons.flatMap(polygon => polygon.map(ring => {
                    const points = ring.map(([lon, lat]) => projectTravelPoint(lon, lat)
                        .map(value => value.toFixed(1)).join(','));
                    return 'M' + points.join('L') + 'Z';
                })).join(''));
                path.setAttribute('fill-rule', 'evenodd');
                land.append(path);
            }
        })
        .catch(() => {
            // Location markers remain available if the basemap cannot load.
        });
}

function setupTravelMap(container) {
    if (!container) return;

    const places = Array.from(container.querySelectorAll('[data-place][data-lon][data-lat]'), item => {
        const latitude = Number(item.dataset.lat);
        const longitude = Number(item.dataset.lon);
        const [x, y] = projectTravelPoint(longitude, latitude);
        return { name: item.textContent.trim(), x, y };
    }).filter(({ x, y }) => x >= 0 && x <= 1000 && y >= 0 && y <= 420);
    if (!places.length) return;

    const surface = document.createElement('div');
    surface.className = 'travel-surface';
    surface.setAttribute('role', 'group');
    surface.setAttribute('aria-label', 'World map of places visited');

    const label = document.createElement('p');
    label.className = 'travel-pin-label';
    label.hidden = true;
    surface.append(label);

    let selected = null;

    function show(index) {
        // Neighboring dots can overlap at world scale. Show their names together.
        const place = places[index];
        const nearby = place ? places.filter(other => Math.hypot(
            (place.x - other.x) * surface.clientWidth / 1000,
            (place.y - other.y) * surface.clientHeight / 420,
        ) <= 14) : [];
        label.textContent = nearby.map(other => other.name).join(' · ');
        label.hidden = !nearby.length;

        markers.forEach((pin, markerIndex) => {
            pin.classList.toggle('travel-pin-lit', nearby.includes(places[markerIndex]));
            pin.setAttribute('aria-pressed', String(markerIndex === selected));
        });
    }

    const markers = places.map((place, index) => {
        const pin = lifeButton('travel-pin', '', place.name);
        pin.setAttribute('aria-pressed', 'false');
        pin.style.left = place.x / 10 + '%';
        pin.style.top = place.y * 100 / 420 + '%';
        pin.addEventListener('pointerenter', event => {
            if (event.pointerType === 'mouse') show(index);
        });
        pin.addEventListener('pointerleave', () => show(selected));
        pin.addEventListener('focus', () => show(index));
        pin.addEventListener('blur', () => show(selected));
        pin.addEventListener('click', () => {
            selected = selected === index ? null : index;
            show(selected);
        });
        surface.append(pin);
        return pin;
    });

    container.replaceChildren(surface);
    drawTravelLand(surface);
}

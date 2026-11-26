window.initLifePage = function initLifePage(section) {
    const gallery = section.querySelector('#life-gallery');
    if (!gallery) return;

    const slides = [...gallery.querySelectorAll('.gallery-slide')];
    const albums = new Map();
    for (const slide of slides) {
        const place = slide.dataset.place?.trim().toLowerCase();
        if (!place) continue;
        if (!albums.has(place)) albums.set(place, []);
        albums.get(place).push(slide);
    }

    const heading = gallery.querySelector('#gallery-place-heading');
    let disposeGallery;
    function openAlbum(place) {
        disposeGallery?.();
        heading.textContent = 'Photos · ' + place.name;
        disposeGallery = setupLifeGallery(gallery, albums.get(place.id));
    }

    const connected = setupTravelMap(section.querySelector('#travel-map'), albums, openAlbum);
    if (!connected) setupLifeGallery(gallery, slides);
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

    const listeners = new AbortController();
    const listen = (target, event, handle) => target.addEventListener(event, handle, { signal: listeners.signal });
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

    listen(viewport, 'pointerenter', event => {
        if (event.pointerType !== 'mouse') return;
        hovering = true;
        schedule();
    });
    listen(viewport, 'pointerleave', () => {
        hovering = false;
        schedule();
    });
    listen(viewport, 'pointerdown', event => {
        if (event.pointerType === 'touch') swipeStart = event.clientX;
    });
    listen(viewport, 'pointerup', event => {
        if (swipeStart === undefined) return;
        const distance = event.clientX - swipeStart;
        swipeStart = undefined;
        if (Math.abs(distance) > 45) advance(distance < 0 ? 1 : -1);
    });
    listen(viewport, 'pointercancel', () => { swipeStart = undefined; });

    listen(track, 'transitionend', event => {
        if (event.target === track && event.propertyName === 'transform') finishWrap();
    });
    listen(previous, 'click', () => advance(-1));
    listen(next, 'click', () => advance(1));
    listen(toggle, 'click', () => setPlaying(!playing));
    listen(controls, 'keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        advance(event.key === 'ArrowLeft' ? -1 : 1);
    });
    listen(document, 'visibilitychange', schedule);
    listen(motion, 'change', () => setPlaying(!motion.matches));

    images.forEach((image, index) => {
        if (!image) return;
        listen(image, 'load', () => {
            const ratio = getPhotoRatio(image);
            if (ratio === ratios[index]) return;
            ratios[index] = ratio;
            layout(true);
        });
    });
    const resize = new ResizeObserver(() => layout());
    resize.observe(viewport);
    layout();
    setPlaying(playing);

    return () => {
        listeners.abort();
        resize.disconnect();
        window.clearTimeout(timer);
        window.clearTimeout(wrapTimer);
        controls.remove();
    };
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

function setupTravelMap(container, albums, openAlbum) {
    if (!container) return false;

    const places = [...container.querySelectorAll('[data-place][data-lon][data-lat]')].map(item => {
        const id = item.dataset.place.trim().toLowerCase();
        const [x, y] = projectTravelPoint(Number(item.dataset.lon), Number(item.dataset.lat));
        return { id, name: item.textContent.trim(), x, y, slides: albums.get(id) || [] };
    }).filter(({ x, y }) => x >= 0 && x <= 1000 && y >= 0 && y <= 420);
    if (!places.length) return false;

    const surface = document.createElement('div');
    surface.className = 'travel-surface';
    surface.setAttribute('role', 'group');
    surface.setAttribute('aria-label', 'World map of places visited');

    const preview = document.createElement('div');
    preview.className = 'travel-pin-preview';
    preview.hidden = true;
    preview.setAttribute('aria-hidden', 'true');

    const thumbnail = document.createElement('img');
    thumbnail.alt = '';
    const previewName = document.createElement('strong');
    const previewCount = document.createElement('span');
    preview.append(thumbnail, previewName, previewCount);

    const albumList = document.createElement('div');
    albumList.className = 'travel-albums';
    albumList.setAttribute('role', 'group');
    albumList.setAttribute('aria-label', 'Places with photos');

    let selected;
    let activePreview;
    function describePhotos(count) {
        return count ? count + (count === 1 ? ' photo' : ' photos') : 'No photos yet';
    }

    function showPreview(entry, button) {
        const { place, pin } = entry;
        const cover = place.slides[0]?.querySelector('img');
        thumbnail.hidden = !cover;
        if (cover) thumbnail.src = cover.src;
        else thumbnail.removeAttribute('src');

        activePreview?.entry.pin.classList.remove('travel-pin-previewing');
        activePreview = { entry, button };
        pin.classList.add('travel-pin-previewing');
        previewName.textContent = place.name;
        previewCount.textContent = describePhotos(place.slides.length);

        const anchor = button.getBoundingClientRect();
        const origin = container.getBoundingClientRect();
        preview.hidden = false;
        const below = anchor.top < preview.offsetHeight + 18;
        const left = anchor.left + anchor.width / 2 - origin.left;
        const top = (below ? anchor.bottom : anchor.top) - origin.top;
        preview.style.setProperty('--preview-x', left + 'px');
        preview.style.setProperty('--preview-y', top + 'px');
        preview.classList.toggle('travel-pin-preview-below', below);
    }

    function hidePreview(button) {
        if (activePreview?.button !== button) return;
        activePreview.entry.pin.classList.remove('travel-pin-previewing');
        activePreview = undefined;
        preview.hidden = true;
    }

    function connectPreview(button, entry) {
        button.addEventListener('pointerenter', event => {
            if (event.pointerType !== 'touch') showPreview(entry, button);
        });
        button.addEventListener('pointerleave', event => {
            if (event.pointerType !== 'touch' && !button.matches(':focus-visible')) hidePreview(button);
        });
        button.addEventListener('focus', () => showPreview(entry, button));
        button.addEventListener('blur', () => hidePreview(button));
        button.addEventListener('keydown', event => {
            if (event.key === 'Escape') hidePreview(button);
        });
        button.addEventListener('click', () => {
            select(entry);
            showPreview(entry, button);
        });
    }

    function select(entry) {
        if (selected === entry || !entry.place.slides.length) return;
        selected?.pin.setAttribute('aria-pressed', 'false');
        selected?.album.setAttribute('aria-pressed', 'false');
        selected = entry;
        entry.pin.setAttribute('aria-pressed', 'true');
        entry.album.setAttribute('aria-pressed', 'true');
        openAlbum(entry.place);
    }

    const entries = places.map(place => {
        const photoCount = place.slides.length;
        const pin = lifeButton('travel-pin', '', place.name + ', ' + describePhotos(photoCount));
        pin.style.left = place.x / 10 + '%';
        pin.style.top = place.y * 100 / 420 + '%';
        pin.classList.toggle('travel-pin-has-photos', photoCount > 0);
        const entry = { place, pin };
        connectPreview(pin, entry);
        surface.append(pin);

        if (photoCount) {
            const album = lifeButton('travel-album', place.name);
            for (const button of [pin, album]) {
                button.setAttribute('aria-pressed', 'false');
                button.setAttribute('aria-controls', 'life-gallery');
            }
            entry.album = album;
            connectPreview(album, entry);
            albumList.append(album);
        }
        return entry;
    });

    container.replaceChildren(surface);
    drawTravelLand(surface);
    if (albumList.childElementCount) container.append(albumList);
    container.append(preview);

    const firstAlbum = entries.find(entry => entry.place.id === albums.keys().next().value && entry.album)
        || entries.find(entry => entry.album);
    if (firstAlbum) select(firstAlbum);
    return Boolean(firstAlbum);
}

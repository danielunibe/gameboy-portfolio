import { cartridges, socialLinks } from './projects.js';
import { englishCartridges, uiCopy } from './translations.js';
import {
    animateCartridgeDeparture,
    animateCartridgeEjection,
    animateCartridgeReturn,
    getMotionDuration,
    waitForMotion,
    waitForTransition
} from './animations.js';

const world = document.getElementById('world');
const rack = document.getElementById('cartridge-racks');
const socialLinksElement = document.getElementById('social-links');
const viewport = document.getElementById('project-viewport');
const canvas = document.getElementById('bootCanvas');
const context = canvas.getContext('2d');
const announcer = document.getElementById('screen-announcer');
const ejectButton = document.getElementById('return-btn');
const ejectLabel = document.getElementById('eject-label');
const languageToggle = document.getElementById('language-toggle');
const animPuck = document.getElementById('animPuck');
const puckVisual = document.getElementById('activeCartridgeVisual');
const puckSticker = document.getElementById('activeStickerVisual');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const themeColors = {
    profile: { accent: '#bf3e36', ink: '#3a1d1c', paper: '#fff0e6' },
    work: { accent: '#138a78', ink: '#153a36', paper: '#e9f5ee' },
    experience: { accent: '#8065a0', ink: '#30283d', paper: '#f0eaf5' },
    method: { accent: '#71844d', ink: '#313a2b', paper: '#eef0df' }
};

let isInserted = false;
let isEjecting = false;
let currentCartId = null;
let selectedCartId = cartridges[0]?.id ?? null;
let screenState = { view: 'home', itemIndex: 0, detailMode: 'summary' };
let currentLanguage = (() => {
    try { return localStorage.getItem('portfolio-language') === 'en' ? 'en' : 'es'; }
    catch { return 'es'; }
})();
let animationSequence = 0;
let bootFrame = null;
let lastHoverTime = 0;
let audioContext = null;

try {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (AudioContextConstructor) audioContext = new AudioContextConstructor();
} catch {
    // El sonido es decorativo; la navegación funciona sin Web Audio.
}

function playTone(frequency, type = 'sine', duration = 0.07, volume = 0.06, delay = 0) {
    if (!audioContext) return;
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => undefined);

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const startAt = audioContext.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration);
}

function playHover() {
    const now = Date.now();
    if (now - lastHoverTime < 80) return;
    lastHoverTime = now;
    playTone(392, 'sine', 0.045, 0.025);
}

function playSelect() {
    playTone(329.63, 'sine', 0.07, 0.07);
    playTone(523.25, 'sine', 0.07, 0.035, 0.012);
}

function playInsert() {
    playTone(98, 'triangle', 0.12, 0.08);
    playTone(164.81, 'square', 0.08, 0.035, 0.075);
}

function playEjectSound() {
    playTone(523.25, 'sine', 0.09, 0.07);
    playTone(261.63, 'sine', 0.16, 0.05, 0.07);
}

function getCartridge(id) {
    const cartridge = cartridges.find((entry) => String(entry.id) === String(id));
    if (!cartridge || currentLanguage !== 'en') return cartridge;
    const translation = englishCartridges[cartridge.key];
    if (!translation) return cartridge;
    return {
        ...cartridge,
        ...translation,
        items: cartridge.items.map((item, index) => ({ ...item, ...(translation.items?.[index] || {}) }))
    };
}

function copy(key, values = {}) {
    let value = uiCopy[currentLanguage]?.[key] ?? uiCopy.es[key] ?? key;
    for (const [name, replacement] of Object.entries(values)) value = value.replaceAll(`{${name}}`, String(replacement));
    return value;
}

function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

function safeExternalURL(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' ? url.href : '';
    } catch {
        return '';
    }
}

function renderLinks(links = []) {
    return links.map(({ label, url }) => {
        const safeURL = safeExternalURL(url);
        if (!safeURL) return '';
        return `<a class="screen-link" href="${escapeHTML(safeURL)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)} <span aria-hidden="true">↗</span></a>`;
    }).join('');
}

function renderRack() {
    const renderCartridge = (entry) => {
        const cartridge = getCartridge(entry.id);
        return `
        <button class="cartridge cart-${escapeHTML(cartridge.shell)}" id="rack-cart-${cartridge.id}" type="button"
            data-cartridge-id="${cartridge.id}" aria-label="${escapeHTML(copy('insertCartridge'))} ${escapeHTML(cartridge.label)}"
            aria-pressed="${String(cartridge.id) === String(selectedCartId)}">
            <span class="cartridge-grooves" aria-hidden="true"><i></i><i></i></span>
            <span class="sticker sticker-${escapeHTML(cartridge.theme)}">
                <img class="cover-art" src="${escapeHTML(cartridge.cover)}" alt="" draggable="false">
                <span class="sticker-label">${escapeHTML(cartridge.label)}</span>
            </span>
        </button>
    `;
    };
    rack.querySelector('#rack-left').innerHTML = cartridges.slice(0, 2).map(renderCartridge).join('');
    rack.querySelector('#rack-right').innerHTML = cartridges.slice(2).map(renderCartridge).join('');
}

function renderSocialLinks() {
    socialLinksElement.innerHTML = `
        <span class="social-caption">${escapeHTML(copy('findMe'))}</span>
        ${socialLinks.map(({ label, mark, network, art, url }) => {
            const safeURL = safeExternalURL(url);
            if (!safeURL) return '';
            return `<a class="social-link" data-network="${escapeHTML(network)}" href="${escapeHTML(safeURL)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(copy('openSocial', { label }))}">
                <img class="social-art" src="${escapeHTML(art)}" alt="" loading="lazy" draggable="false">
                <span class="social-link-label"><span class="social-mark" aria-hidden="true">${escapeHTML(mark)}</span>${escapeHTML(label)}<span class="social-arrow" aria-hidden="true">↗</span></span>
            </a>`;
        }).join('')}
    `;
}

function updateSelectedCartridge(id, focus = false) {
    const cartridge = getCartridge(id);
    if (!cartridge || isInserted || isEjecting) return;
    selectedCartId = cartridge.id;
    rack.querySelectorAll('[data-cartridge-id]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.cartridgeId) === String(selectedCartId));
    });
    if (screenState.view === 'home') renderScreen();
    if (focus) rack.querySelector(`#rack-cart-${cartridge.id}`)?.focus({ preventScroll: true });
}

function renderHome() {
    return `
        <div class="screen-shell screen-home">
            <div class="home-screen-art">
                <img src="assets/profile/daniel-lcd-hero-v2.png" alt="${escapeHTML(copy('homeImageAlt'))}" draggable="false">
            </div>
            <div class="home-copy">
                <p class="screen-kicker">${escapeHTML(copy('homeKicker'))}</p>
                <h1>${escapeHTML(copy('homeTitle'))}</h1>
            </div>
        </div>
    `;
}

function renderMenu(cartridge) {
    const options = cartridge.items.map((item, index) => `
        <button class="menu-option${index === screenState.itemIndex ? ' is-selected' : ''}" type="button"
            data-action="open-item" data-item-index="${index}" aria-current="${index === screenState.itemIndex ? 'true' : 'false'}"
            aria-label="${escapeHTML(copy('openItem'))}: ${escapeHTML(item.title)}">
            <span class="menu-option-copy"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.summary)}</small></span>
            <span class="menu-chevron" aria-hidden="true">›</span>
        </button>
    `).join('');

    return `
        <div class="screen-shell screen-menu">
            <header class="menu-heading">
                <p class="screen-kicker">${escapeHTML(cartridge.label)}</p>
                <h1>${escapeHTML(cartridge.title)}</h1>
                <p>${escapeHTML(cartridge.intro || cartridge.summary)}</p>
            </header>
            <nav class="menu-list" aria-label="${escapeHTML(cartridge.menuTitle)}">${options}</nav>
        </div>
    `;
}

function renderDetail(cartridge, item) {
    const evidenceMode = screenState.detailMode === 'evidence';
    const evidence = (item.evidence || []).map((entry) => `<li>${escapeHTML(entry)}</li>`).join('');
    const links = renderLinks(item.links || []);
    const body = evidenceMode
        ? `<section class="detail-panel evidence-panel"><p class="panel-label">${escapeHTML(copy('evidenceAndStatus'))}</p>${evidence ? `<ul class="evidence-list">${evidence}</ul>` : `<p>${escapeHTML(copy('evidenceFallback'))}</p>`}<p class="status-chip">${escapeHTML(item.status || copy('statusFallback'))}</p>${links ? `<div class="screen-links">${links}</div>` : ''}</section>`
        : `<div class="detail-panels">
                ${item.context ? `<section class="detail-panel"><p class="panel-label">${escapeHTML(copy('context'))}</p><p>${escapeHTML(item.context)}</p></section>` : ''}
                ${item.responsibility ? `<section class="detail-panel"><p class="panel-label">${escapeHTML(copy('contribution'))}</p><p>${escapeHTML(item.responsibility)}</p></section>` : ''}
                ${!item.context && !item.responsibility ? `<section class="detail-panel"><p class="panel-label">${escapeHTML(copy('journey'))}</p><p>${escapeHTML(item.status || copy('evidenceFallback'))}</p></section>` : ''}
            </div>`;
    const hasEvidence = (item.evidence || []).length > 0 || links.length > 0;

    return `
        <div class="screen-shell screen-detail">
            <div class="detail-topline">
                <button class="screen-back" type="button" data-action="back-menu" aria-label="${escapeHTML(copy('backToList', { label: cartridge.label }))}"><span aria-hidden="true">←</span></button>
            </div>
            <div class="detail-scroll-area">
                <p class="screen-kicker">${escapeHTML(item.period || cartridge.kicker)}</p>
                <h1>${escapeHTML(item.title)}</h1>
                <p class="detail-summary">${escapeHTML(item.summary)}</p>
                ${body}
                ${!evidenceMode && item.status ? `<p class="status-chip">${escapeHTML(item.status)}</p>` : ''}
            </div>
            ${hasEvidence ? `<div class="detail-actions"><button class="screen-text-action" type="button" data-action="toggle-evidence">${escapeHTML(evidenceMode ? copy('showSummary') : copy('exploreEvidence'))} <span aria-hidden="true">↗</span></button></div>` : ''}
        </div>
    `;
}

function renderScreen({ visible = true } = {}) {
    let cartridge = getCartridge(currentCartId) || getCartridge(selectedCartId) || cartridges[0];
    if (!cartridge) return;
    viewport.dataset.theme = cartridge.theme;
    viewport.style.setProperty('--screen-accent', themeColors[cartridge.theme]?.accent || '#847b69');

    if (screenState.view === 'menu' && isInserted) {
        viewport.innerHTML = renderMenu(cartridge);
        viewport.setAttribute('aria-label', copy('menuLabel', { label: cartridge.label }));
    } else if (screenState.view === 'detail' && isInserted) {
        const item = cartridge.items[screenState.itemIndex];
        viewport.innerHTML = item ? renderDetail(cartridge, item) : renderMenu(cartridge);
        viewport.setAttribute('aria-label', item ? copy('detailLabel', { title: item.title }) : copy('menuLabel', { label: cartridge.label }));
    } else {
        viewport.innerHTML = renderHome();
        viewport.dataset.theme = cartridge.theme;
        viewport.setAttribute('aria-label', copy('homeLabel'));
    }

    viewport.classList.toggle('active', visible);
    viewport.scrollTop = 0;
}

function updateLanguageInterface({ announceChange = false } = {}) {
    document.documentElement.lang = currentLanguage;
    document.title = copy('pageTitle');
    document.querySelector('meta[name="description"]')?.setAttribute('content', copy('pageDescription'));
    languageToggle.textContent = copy('languageToggle');
    languageToggle.setAttribute('aria-label', copy('languageButton'));
    languageToggle.setAttribute('aria-pressed', String(currentLanguage === 'en'));
    languageToggle.title = copy('languageButton');
    ejectLabel.textContent = copy('ejectLabel');
    ejectButton.setAttribute('aria-label', copy('ejectButton'));
    document.querySelector('.console-body')?.setAttribute('aria-label', currentLanguage === 'en' ? 'Interactive handheld console' : 'Consola portátil interactiva');
    document.querySelector('.controls-tight-group')?.setAttribute('aria-label', copy('controlGroup'));
    rack.setAttribute('aria-label', copy('racksLabel'));
    rack.querySelector('#rack-left')?.setAttribute('aria-label', copy('leftRackLabel'));
    rack.querySelector('#rack-right')?.setAttribute('aria-label', copy('rightRackLabel'));
    socialLinksElement.setAttribute('aria-label', copy('socialLabel'));

    const controlLabels = {
        up: 'controlUp', down: 'controlDown', left: 'controlLeft', right: 'controlRight',
        back: 'controlBack', confirm: 'controlConfirm', select: 'controlSelect', start: 'controlStart'
    };
    for (const [control, labelKey] of Object.entries(controlLabels)) {
        document.querySelector(`[data-control="${control}"]`)?.setAttribute('aria-label', copy(labelKey));
    }

    renderRack();
    renderSocialLinks();
    if (isInserted) updatePuck(getCartridge(currentCartId));
    renderScreen();
    if (announceChange) announce(copy('languageChanged'));
}

function toggleLanguage() {
    currentLanguage = currentLanguage === 'es' ? 'en' : 'es';
    try { localStorage.setItem('portfolio-language', currentLanguage); }
    catch { /* El selector sigue funcionando aunque el navegador no guarde preferencias. */ }
    updateLanguageInterface({ announceChange: true });
}

function announce(message) {
    announcer.textContent = '';
    window.requestAnimationFrame(() => { announcer.textContent = message; });
}

function drawBootScreen(cartridge, progress) {
    if (!context) return;
    const { accent, paper, ink } = themeColors[cartridge.theme] || themeColors.profile;
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = ink;
    context.fillRect(0, 0, width, height);

    context.fillStyle = 'rgba(255,255,255,.08)';
    for (let x = 24; x < width; x += 28) {
        for (let y = 24; y < height; y += 28) context.fillRect(x, y, 2, 2);
    }

    context.textAlign = 'center';
    context.fillStyle = paper;
    context.font = '700 22px Arial, sans-serif';
    context.fillText(copy('bootTitle'), width / 2, height / 2 - 38);
    context.fillStyle = '#fff';
    context.font = '800 42px Arial, sans-serif';
    context.fillText(cartridge.label, width / 2, height / 2 + 18);

    const barWidth = 260;
    const barX = (width - barWidth) / 2;
    const barY = height / 2 + 62;
    context.fillStyle = 'rgba(255,255,255,.2)';
    context.fillRect(barX, barY, barWidth, 8);
    context.fillStyle = accent;
    context.fillRect(barX, barY, barWidth * progress, 8);
    context.fillStyle = paper;
    context.font = '600 13px Arial, sans-serif';
    context.fillText(copy('bootLine'), width / 2, barY + 34);
}

function runBootSequence(cartridge, sequence) {
    renderScreen({ visible: false });
    canvas.classList.remove('fade-out');
    playTone(261.63, 'sine', 0.14, 0.045);
    playTone(392, 'sine', 0.17, 0.04, 0.13);
    playTone(523.25, 'sine', 0.2, 0.035, 0.3);

    return new Promise((resolve) => {
        const finish = () => {
            if (sequence !== animationSequence || !isInserted) {
                resolve();
                return;
            }
            drawBootScreen(cartridge, 1);
            canvas.classList.add('fade-out');
            viewport.classList.add('active');
            announce(copy('loaded', { label: cartridge.label }));
            resolve();
        };

        if (prefersReducedMotion.matches) {
            finish();
            return;
        }

        const startedAt = performance.now();
        const duration = getMotionDuration('--motion-boot-sequence', 640);
        const drawFrame = (now) => {
            if (sequence !== animationSequence || !isInserted) {
                bootFrame = null;
                resolve();
                return;
            }
            const progress = Math.min(1, (now - startedAt) / duration);
            drawBootScreen(cartridge, progress);
            if (progress < 1) bootFrame = window.requestAnimationFrame(drawFrame);
            else {
                bootFrame = null;
                finish();
            }
        };
        bootFrame = window.requestAnimationFrame(drawFrame);
    });
}

function updatePuck(cartridge) {
    puckVisual.className = `cartridge cart-${cartridge.shell}`;
    puckSticker.className = `sticker sticker-${cartridge.theme}`;
    puckSticker.innerHTML = `<img class="cover-art" src="${escapeHTML(cartridge.cover)}" alt=""><span class="sticker-label">${escapeHTML(cartridge.label)}</span>`;
}

async function runInsertionAnimation(cartridge, rackCart, sequence) {
    const reducedMotion = prefersReducedMotion.matches;
    const departure = animateCartridgeDeparture(rackCart, reducedMotion);
    const zoomDuration = getMotionDuration('--motion-world-zoom', 720);
    const zoom = waitForTransition(world, 'transform', zoomDuration, reducedMotion);
    world.classList.add('zoom-active');

    await waitForMotion(getMotionDuration('--motion-insert-stagger', 110), reducedMotion);
    if (sequence !== animationSequence || !isInserted) return;
    void animPuck.offsetWidth;
    const puckDuration = getMotionDuration('--motion-puck-slide', 520);
    const puck = waitForTransition(animPuck, 'top', puckDuration, reducedMotion);
    animPuck.classList.add('inserting');

    await Promise.all([departure, zoom, puck]);
    if (sequence !== animationSequence || !isInserted) return;

    document.body.classList.add('interface-active');
    ejectButton.disabled = false;
    await runBootSequence(cartridge, sequence);
}

function triggerInsertion(id) {
    if (isInserted || isEjecting) return;
    const cartridge = getCartridge(id);
    const rackCart = document.getElementById(`rack-cart-${id}`);
    if (!cartridge || !rackCart) return;

    playInsert();
    isInserted = true;
    currentCartId = cartridge.id;
    selectedCartId = cartridge.id;
    screenState = { view: 'menu', itemIndex: 0, detailMode: 'summary' };
    rack.inert = true;
    rack.setAttribute('aria-hidden', 'true');
    viewport.focus({ preventScroll: true });
    const sequence = ++animationSequence;
    updatePuck(cartridge);
    rack.querySelectorAll('[data-cartridge-id]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.cartridgeId) === String(cartridge.id)));
    void runInsertionAnimation(cartridge, rackCart, sequence);
}

function moveRackSelection(direction) {
    if (isInserted || isEjecting || !['left', 'right'].includes(direction)) return;
    const currentIndex = cartridges.findIndex((cartridge) => String(cartridge.id) === String(selectedCartId));
    const delta = direction === 'right' ? 1 : -1;
    const nextIndex = (currentIndex + delta + cartridges.length) % cartridges.length;
    updateSelectedCartridge(cartridges[nextIndex].id, true);
    announce(copy('selected', { label: getCartridge(cartridges[nextIndex].id).label }));
}

function moveMenuSelection(direction) {
    const cartridge = getCartridge(currentCartId);
    if (!isInserted || screenState.view !== 'menu' || !cartridge || !['up', 'down'].includes(direction)) return;
    const delta = direction === 'down' ? 1 : -1;
    screenState.itemIndex = (screenState.itemIndex + delta + cartridge.items.length) % cartridge.items.length;
    renderScreen();
    const activeOption = viewport.querySelector(`[data-action="open-item"][data-item-index="${screenState.itemIndex}"]`);
    activeOption?.focus({ preventScroll: true });
    activeOption?.scrollIntoView({ block: 'nearest' });
    announce(copy('itemSelected', {
        title: cartridge.items[screenState.itemIndex].title,
        current: screenState.itemIndex + 1,
        total: cartridge.items.length
    }));
}

function scrollDetail(direction) {
    if (screenState.view !== 'detail') return;
    const detailArea = viewport.querySelector('.detail-scroll-area');
    detailArea?.scrollBy({ top: direction === 'down' ? 72 : -72, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
}

function openItem(index = screenState.itemIndex) {
    const cartridge = getCartridge(currentCartId);
    if (!isInserted || !cartridge || !cartridge.items[index]) return;
    screenState = { view: 'detail', itemIndex: index, detailMode: 'summary' };
    playSelect();
    renderScreen();
    announce(copy('itemOpened', { title: cartridge.items[index].title }));
}

function backAction() {
    if (!isInserted || isEjecting) return;
    if (screenState.view === 'detail') {
        screenState.view = 'menu';
        screenState.detailMode = 'summary';
        renderScreen();
        announce(copy('listOpened'));
        return;
    }
    if (screenState.view === 'menu') {
        screenState.view = 'home';
        renderScreen();
        announce(copy('homeReady'));
        return;
    }
    announce(copy('alreadyHome'));
}

function startAction() {
    if (isEjecting) return;
    if (!isInserted) {
        triggerInsertion(selectedCartId);
        return;
    }
    if (screenState.view === 'detail') {
        screenState.view = 'menu';
        screenState.detailMode = 'summary';
        renderScreen();
        announce(copy('listOpened'));
        return;
    }
    if (screenState.view === 'menu') {
        screenState.view = 'home';
        renderScreen();
        announce(copy('homeOpened'));
        return;
    }
    screenState.view = 'menu';
    renderScreen();
    announce(copy('listOpened'));
}

function selectAction() {
    const cartridge = getCartridge(currentCartId);
    const item = cartridge?.items[screenState.itemIndex];
    if (!item || screenState.view !== 'detail' || !(item.evidence?.length || item.links?.length)) {
        announce(copy('noAlternative'));
        return;
    }
    screenState.detailMode = screenState.detailMode === 'summary' ? 'evidence' : 'summary';
    renderScreen();
    announce(screenState.detailMode === 'evidence' ? copy('evidenceView') : copy('summaryView'));
}

function confirmAction() {
    if (isEjecting) return;
    if (!isInserted) {
        triggerInsertion(selectedCartId);
        return;
    }
    if (screenState.view === 'home') {
        screenState.view = 'menu';
        renderScreen();
        return;
    }
    if (screenState.view === 'menu') openItem();
    else if (screenState.view === 'detail') selectAction();
}

async function triggerEjection() {
    if (!isInserted || isEjecting) return;
    isEjecting = true;
    ejectButton.disabled = true;
    const ejectedId = currentCartId;
    const rackCart = document.getElementById(`rack-cart-${ejectedId}`);
    const sequence = ++animationSequence;
    playEjectSound();

    // La animación de salida recorre en reversa la entrada: el cartucho sube
    // desde la ranura mientras la consola recupera su tamaño de portada.
    viewport.classList.remove('active');
    document.body.classList.remove('interface-active');
    isInserted = false;
    currentCartId = null;
    screenState = { view: 'home', itemIndex: 0, detailMode: 'summary' };

    const reducedMotion = prefersReducedMotion.matches;
    const screenDuration = getMotionDuration('--motion-screen-fade', 220);
    const screenFade = waitForTransition(viewport, 'opacity', screenDuration, reducedMotion);
    const zoomDuration = getMotionDuration('--motion-world-zoom', 720);
    const zoom = waitForTransition(world, 'transform', zoomDuration, reducedMotion);
    const exitFlight = animateCartridgeEjection(puckVisual, reducedMotion);
    world.classList.remove('zoom-active');
    canvas.classList.add('fade-out');

    await Promise.all([exitFlight, screenFade, zoom]);
    if (sequence !== animationSequence) return;

    // Restablece el cartucho oculto encima del cuerpo y prepara la portada
    // antes de devolver su copia visual desde abajo hacia el riel.
    animPuck.classList.add('motion-reset');
    animPuck.classList.remove('inserting');
    void animPuck.offsetWidth;
    animPuck.classList.remove('motion-reset');
    puckVisual.style.visibility = '';
    renderScreen({ visible: false });
    viewport.classList.add('active');
    if (rackCart) await animateCartridgeReturn(rackCart, reducedMotion);
    if (sequence !== animationSequence) return;

    rackCart?.classList.remove('hidden-in-rack');
    rack.inert = false;
    rack.removeAttribute('aria-hidden');
    isEjecting = false;
    updateSelectedCartridge(ejectedId);
    announce(copy('ejected'));
    rackCart?.focus({ preventScroll: true });
}

function handleControl(control) {
    playSelect();
    switch (control) {
        case 'left':
        case 'right':
            if (!isInserted) moveRackSelection(control);
            break;
        case 'up':
        case 'down':
            if (screenState.view === 'menu') moveMenuSelection(control);
            else if (screenState.view === 'detail') scrollDetail(control);
            break;
        case 'confirm':
            confirmAction();
            break;
        case 'back':
            backAction();
            break;
        case 'start':
            startAction();
            break;
        case 'select':
            selectAction();
            break;
        case 'eject':
            void triggerEjection();
            break;
        case 'language':
            toggleLanguage();
            break;
        default:
            break;
    }
}

document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const control = target.closest('[data-control]');
    if (control) {
        handleControl(control.dataset.control);
        return;
    }

    const cartridgeButton = target.closest('[data-cartridge-id]');
    if (cartridgeButton) {
        const id = Number(cartridgeButton.dataset.cartridgeId);
        if (!isInserted) triggerInsertion(id);
        return;
    }

    const action = target.closest('[data-action]');
    if (!action) return;
    switch (action.dataset.action) {
        case 'insert-selected':
            triggerInsertion(selectedCartId);
            break;
        case 'open-menu':
            startAction();
            break;
        case 'open-item':
            openItem(Number(action.dataset.itemIndex));
            break;
        case 'back-menu':
            if (isEjecting || !isInserted) break;
            screenState.view = 'menu';
            screenState.detailMode = 'summary';
            renderScreen();
            break;
        case 'toggle-evidence':
            selectAction();
            break;
        default:
            break;
    }
});

document.addEventListener('pointerover', (event) => {
    if (event.pointerType !== 'mouse') return;
    const target = event.target instanceof Element ? event.target : null;
    const cartridgeButton = target?.closest('[data-cartridge-id]');
    if (cartridgeButton && !cartridgeButton.contains(event.relatedTarget)) {
        updateSelectedCartridge(Number(cartridgeButton.dataset.cartridgeId));
        playHover();
        return;
    }
    if (target?.closest('button, .screen-link')) playHover();
});

document.addEventListener('focusin', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const cartridgeButton = target?.closest('[data-cartridge-id]');
    if (cartridgeButton) updateSelectedCartridge(Number(cartridgeButton.dataset.cartridgeId));
});

document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target instanceof Element ? event.target : null;
    const focusedControl = target?.closest('button, a, input, textarea, select');

    if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        if (!isInserted && event.key === 'ArrowLeft') moveRackSelection('left');
        else if (!isInserted && event.key === 'ArrowRight') moveRackSelection('right');
        else if (event.key === 'ArrowUp') moveMenuSelection('up');
        else if (event.key === 'ArrowDown') moveMenuSelection('down');
        if (screenState.view === 'detail' && event.key === 'ArrowUp') scrollDetail('up');
        if (screenState.view === 'detail' && event.key === 'ArrowDown') scrollDetail('down');
        return;
    }

    if (focusedControl && ['Enter', ' ', 'Spacebar'].includes(event.key)) return;
    if (event.key === 'Enter' || event.key.toLowerCase() === 'z') {
        event.preventDefault();
        confirmAction();
    } else if (event.key === 'Escape' || event.key === 'Backspace' || event.key.toLowerCase() === 'x') {
        event.preventDefault();
        backAction();
    } else if (event.key === ' ') {
        event.preventDefault();
        startAction();
    } else if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        selectAction();
    }
});

canvas.width = 600;
canvas.height = 400;
updateLanguageInterface();
canvas.classList.add('fade-out');

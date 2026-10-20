import { cartridges, socialLinks } from './projects.js?v=20261020-screen-library';
import { englishCartridges, uiCopy } from './translations.js?v=20261020-screen-library';
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
    profile: { accent: '#bd3d36', ink: '#3a1d1c', paper: '#fff0e6' },
    work: { accent: '#087f8b', ink: '#153a36', paper: '#e7f7f5' },
    experience: { accent: '#7048bd', ink: '#30283d', paper: '#f0eaf8' },
    method: { accent: '#4f812f', ink: '#313a2b', paper: '#eef5e4' }
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

function screenIcon(name, className = '') {
    const paths = {
        spark: '<path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7Z"/>',
        cursor: '<path d="m5 3 14 10-7 1-3 7Z"/><path d="m12 14 5 6"/>',
        book: '<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14"/>',
        phone: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10 6h4m-3 12h2"/>',
        desktop: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
        grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 17.5h7m-3.5-3.5v7"/>',
        layers: '<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
        building: '<path d="m3 8 9-5 9 5H3Zm0 13h18M5 11v7m7-7v7m7-7v7"/>',
        health: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
        search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
        target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m12 12 8-8"/>',
        flow: '<rect x="8" y="2" width="8" height="6" rx="1.5"/><rect x="1" y="16" width="8" height="6" rx="1.5"/><rect x="15" y="16" width="8" height="6" rx="1.5"/><path d="M12 8v4M5 16v-4h14v4"/>',
        loop: '<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5m-4 8a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
        left: '<path d="m14 6-6 6 6 6"/>',
        right: '<path d="m10 6 6 6-6 6"/>',
        arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>'
    };
    return `<svg class="screen-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
}

function entryTitle(item) {
    return item.title.replace(/^\d+\s*·\s*/, '');
}

function renderMenuPreview(cartridge, item, index) {
    return `
        <span class="preview-emblem" aria-hidden="true">${screenIcon(item.icon)}</span>
        <div class="preview-copy">
            <p class="preview-tag">${escapeHTML(item.period || item.tag || cartridge.label)}</p>
            <h2>${escapeHTML(item.previewTitle || entryTitle(item))}</h2>
            <p class="preview-summary">${escapeHTML(item.previewSummary || item.summary)}</p>
        </div>
        <button class="preview-open" type="button" data-action="open-item" data-item-index="${index}"
            aria-label="${escapeHTML(copy('openItem'))}: ${escapeHTML(item.title)}">
            <span>${escapeHTML(copy('exploreItem'))}</span>${screenIcon('arrow')}
        </button>`;
}

function renderMenu(cartridge) {
    const options = cartridge.items.map((item, index) => {
        const selected = index === screenState.itemIndex;
        return `<button class="library-item${selected ? ' is-selected' : ''}" id="library-item-${index}" type="button"
            role="tab" aria-selected="${selected}" aria-controls="selection-preview" tabindex="${selected ? '0' : '-1'}"
            data-action="select-item" data-item-index="${index}"
            aria-label="${escapeHTML(copy('selectItem'))}: ${escapeHTML(entryTitle(item))}">
            ${screenIcon(item.icon)}<span>${escapeHTML(item.navTitle || entryTitle(item))}</span>
        </button>`;
    }).join('');
    const item = cartridge.items[screenState.itemIndex];

    return `
        <div class="screen-shell screen-menu">
            <header class="library-heading">
                <h1>${escapeHTML(cartridge.title)}</h1>
                <img src="${escapeHTML(cartridge.cover)}" alt="" draggable="false">
            </header>
            <div class="library-workspace">
                <nav class="library-list" role="tablist" aria-orientation="vertical" aria-label="${escapeHTML(cartridge.menuTitle)}">${options}</nav>
                <section class="library-preview" id="selection-preview" role="tabpanel" aria-labelledby="library-item-${screenState.itemIndex}">
                    ${renderMenuPreview(cartridge, item, screenState.itemIndex)}
                </section>
            </div>
        </div>`;
}

function getDetailTabs(cartridge, item) {
    const contributionLabel = cartridge.theme === 'profile' ? 'moreDetailTab' : cartridge.theme === 'method' ? 'practiceTab' : 'contributionTab';
    return [
        { key: 'summary', label: copy('overviewTab') },
        ...(item.responsibility ? [{ key: 'contribution', label: copy(contributionLabel) }] : []),
        ...((item.evidence?.length || item.links?.length) ? [{ key: 'evidence', label: copy('evidenceTab') }] : [])
    ];
}

function renderDetail(cartridge, item) {
    const tabs = getDetailTabs(cartridge, item);
    const mode = tabs.some((tab) => tab.key === screenState.detailMode) ? screenState.detailMode : 'summary';
    const previous = cartridge.items[(screenState.itemIndex - 1 + cartridge.items.length) % cartridge.items.length];
    const next = cartridge.items[(screenState.itemIndex + 1) % cartridge.items.length];
    const evidence = (item.evidence || []).map((entry) => `<li>${escapeHTML(entry)}</li>`).join('');
    const links = renderLinks(item.links || []);
    let body;
    if (mode === 'evidence') {
        body = `<ul class="entry-evidence">${evidence}</ul>
            ${links ? `<div class="entry-links">${links}</div>` : ''}`;
    } else if (mode === 'contribution') {
        body = `<p class="entry-lead">${escapeHTML(item.responsibility)}</p>`;
    } else {
        body = `${item.period ? `<p class="entry-period">${escapeHTML(item.period)}</p>` : ''}
            <p class="entry-lead">${escapeHTML(item.summary)}</p>
            ${item.context ? `<p class="entry-context">${escapeHTML(item.context)}</p>` : ''}`;
    }

    return `
        <div class="screen-shell screen-detail">
            <header class="entry-heading">
                <button class="entry-back" type="button" data-action="back-menu" aria-label="${escapeHTML(copy('backToList', { label: cartridge.label }))}">${screenIcon('left')}</button>
                <h1 tabindex="-1">${escapeHTML(entryTitle(item))}</h1>
                <div class="entry-pager">
                    <button type="button" data-action="previous-item" aria-label="${escapeHTML(copy('previousItem', { title: entryTitle(previous) }))}" title="${escapeHTML(entryTitle(previous))}">${screenIcon('left')}</button>
                    <button type="button" data-action="next-item" aria-label="${escapeHTML(copy('nextItem', { title: entryTitle(next) }))}" title="${escapeHTML(entryTitle(next))}">${screenIcon('right')}</button>
                </div>
            </header>
            <div class="entry-tabs" role="tablist" aria-label="${escapeHTML(copy('detailTabs'))}">
                ${tabs.map((tab) => `<button id="entry-tab-${tab.key}" type="button" role="tab" aria-selected="${tab.key === mode}" aria-controls="entry-panel" tabindex="${tab.key === mode ? '0' : '-1'}" data-action="detail-tab" data-detail-mode="${tab.key}">${escapeHTML(tab.label)}</button>`).join('')}
            </div>
            <section class="entry-panel-frame" id="entry-panel" role="tabpanel" aria-labelledby="entry-tab-${mode}">
                <div class="entry-art" aria-hidden="true">${screenIcon(item.icon)}<span>${escapeHTML(item.tag || item.period || cartridge.label)}</span></div>
                <div class="detail-scroll-area" tabindex="0"><div class="entry-content">${body}</div></div>
            </section>
        </div>`;
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
    document.body.dataset.theme = cartridge.theme;
    document.documentElement.dataset.theme = cartridge.theme;
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

function revealLibrarySelection(focus = false) {
    const activeOption = viewport.querySelector(`#library-item-${screenState.itemIndex}`);
    const list = viewport.querySelector('.library-list');
    if (focus) activeOption?.focus({ preventScroll: true });
    if (!activeOption || !list) return;
    const top = activeOption.offsetTop;
    if (top < list.scrollTop || top + activeOption.offsetHeight > list.scrollTop + list.clientHeight) {
        list.scrollTo({ top: top - (list.clientHeight - activeOption.offsetHeight) / 2, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
    }
}

function selectLibraryItem(index, { focus = false } = {}) {
    const cartridge = getCartridge(currentCartId);
    if (!isInserted || isEjecting || screenState.view !== 'menu' || !cartridge?.items[index]) return;
    screenState.itemIndex = index;
    viewport.querySelectorAll('[data-action="select-item"]').forEach((button) => {
        const selected = Number(button.dataset.itemIndex) === index;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
    });
    const preview = viewport.querySelector('#selection-preview');
    if (preview) {
        preview.setAttribute('aria-labelledby', `library-item-${index}`);
        preview.innerHTML = renderMenuPreview(cartridge, cartridge.items[index], index);
    }
    revealLibrarySelection(focus);
    announce(copy('itemSelected', {
        title: cartridge.items[index].title,
        current: index + 1,
        total: cartridge.items.length
    }));
}

function moveMenuSelection(direction) {
    const cartridge = getCartridge(currentCartId);
    if (!isInserted || screenState.view !== 'menu' || !cartridge || !['up', 'down', 'left', 'right'].includes(direction)) return;
    const delta = ['down', 'right'].includes(direction) ? 1 : -1;
    selectLibraryItem((screenState.itemIndex + delta + cartridge.items.length) % cartridge.items.length, { focus: true });
}

function setDetailMode(mode, { focus = false } = {}) {
    const cartridge = getCartridge(currentCartId);
    const item = cartridge?.items[screenState.itemIndex];
    if (!isInserted || isEjecting || screenState.view !== 'detail' || !item) return;
    const tab = getDetailTabs(cartridge, item).find((entry) => entry.key === mode);
    if (!tab) return;
    screenState.detailMode = mode;
    renderScreen();
    if (focus) viewport.querySelector(`#entry-tab-${mode}`)?.focus({ preventScroll: true });
    announce(copy('detailSection', { section: tab.label, title: entryTitle(item) }));
}

function moveDetailSection(direction) {
    const cartridge = getCartridge(currentCartId);
    const item = cartridge?.items[screenState.itemIndex];
    if (!item || screenState.view !== 'detail') return;
    const tabs = getDetailTabs(cartridge, item);
    const index = tabs.findIndex((tab) => tab.key === screenState.detailMode);
    const delta = direction === 'left' ? -1 : 1;
    setDetailMode(tabs[(index + delta + tabs.length) % tabs.length].key, { focus: true });
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
    viewport.querySelector('.entry-heading h1')?.focus({ preventScroll: true });
    announce(copy('itemOpened', { title: cartridge.items[index].title }));
}

function backAction() {
    if (!isInserted || isEjecting) return;
    if (screenState.view === 'detail') {
        screenState.view = 'menu';
        screenState.detailMode = 'summary';
        renderScreen();
        revealLibrarySelection(true);
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
        revealLibrarySelection(true);
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
    if (!item || screenState.view !== 'detail' || getDetailTabs(cartridge, item).length < 2) {
        announce(copy('noAlternative'));
        return;
    }
    moveDetailSection('right');
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
    delete document.body.dataset.theme;
    delete document.documentElement.dataset.theme;
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
            else if (screenState.view === 'menu') moveMenuSelection(control);
            else if (screenState.view === 'detail') moveDetailSection(control);
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
        case 'select-item':
            playSelect();
            selectLibraryItem(Number(action.dataset.itemIndex), { focus: true });
            break;
        case 'detail-tab':
            playSelect();
            setDetailMode(action.dataset.detailMode, { focus: true });
            break;
        case 'previous-item':
        case 'next-item': {
            const cartridge = getCartridge(currentCartId);
            if (!cartridge) break;
            const delta = action.dataset.action === 'previous-item' ? -1 : 1;
            openItem((screenState.itemIndex + delta + cartridge.items.length) % cartridge.items.length);
            break;
        }
        case 'back-menu':
            backAction();
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

    if (event.key === 'Enter' && target?.closest('[data-action="select-item"]')) {
        event.preventDefault();
        openItem(Number(target.closest('[data-action="select-item"]').dataset.itemIndex));
        return;
    }

    if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        if (!isInserted && event.key === 'ArrowLeft') moveRackSelection('left');
        else if (!isInserted && event.key === 'ArrowRight') moveRackSelection('right');
        else if (screenState.view === 'menu') moveMenuSelection(event.key.replace('Arrow', '').toLowerCase());
        else if (screenState.view === 'detail' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) moveDetailSection(event.key === 'ArrowLeft' ? 'left' : 'right');
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

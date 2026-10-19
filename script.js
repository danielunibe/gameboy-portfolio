import { cartridges, socialLinks } from './projects.js';

const world = document.getElementById('world');
const rack = document.getElementById('cartridge-racks');
const socialLinksElement = document.getElementById('social-links');
const viewport = document.getElementById('project-viewport');
const canvas = document.getElementById('bootCanvas');
const context = canvas.getContext('2d');
const announcer = document.getElementById('screen-announcer');
const ejectButton = document.getElementById('return-btn');
const animPuck = document.getElementById('animPuck');
const puckVisual = document.getElementById('activeCartridgeVisual');
const puckSticker = document.getElementById('activeStickerVisual');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const themeColors = {
    profile: { accent: '#9b7750', ink: '#37372f', paper: '#f5f0df' },
    work: { accent: '#138a78', ink: '#153a36', paper: '#e9f5ee' },
    experience: { accent: '#8065a0', ink: '#30283d', paper: '#f0eaf5' },
    method: { accent: '#71844d', ink: '#313a2b', paper: '#eef0df' }
};

let isInserted = false;
let isEjecting = false;
let currentCartId = null;
let selectedCartId = cartridges[0]?.id ?? null;
let screenState = { view: 'home', itemIndex: 0, detailMode: 'summary' };
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
    return cartridges.find((cartridge) => String(cartridge.id) === String(id));
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
    const renderCartridge = (cartridge) => `
        <button class="cartridge cart-${escapeHTML(cartridge.shell)}" id="rack-cart-${cartridge.id}" type="button"
            data-cartridge-id="${cartridge.id}" aria-label="Insertar SD ${escapeHTML(cartridge.label)}"
            aria-pressed="${String(cartridge.id) === String(selectedCartId)}">
            <span class="sticker sticker-${escapeHTML(cartridge.theme)}">
                <img class="cover-art" src="${escapeHTML(cartridge.cover)}" alt="" draggable="false">
                <span class="sticker-label">${escapeHTML(cartridge.label)}</span>
            </span>
        </button>
    `;
    rack.querySelector('#rack-left').innerHTML = cartridges.slice(0, 2).map(renderCartridge).join('');
    rack.querySelector('#rack-right').innerHTML = cartridges.slice(2).map(renderCartridge).join('');
}

function renderSocialLinks() {
    socialLinksElement.innerHTML = `
        <span class="social-caption">ENCUÉNTRAME</span>
        ${socialLinks.map(({ label, mark, network, art, url }) => {
            const safeURL = safeExternalURL(url);
            if (!safeURL) return '';
            return `<a class="social-link" data-network="${escapeHTML(network)}" href="${escapeHTML(safeURL)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${escapeHTML(label)} de Daniel Unibe">
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
    const loadedState = isInserted;
    const action = loadedState
        ? '<button class="screen-action" type="button" data-action="open-menu">ABRIR PORTAFOLIO <span aria-hidden="true">↗</span></button>'
        : '<button class="screen-action" type="button" data-action="insert-selected">INSERTAR SD <span aria-hidden="true">↗</span></button>';

    return `
        <div class="screen-shell screen-home">
            <div class="home-screen-art">
                <img src="assets/profile/daniel-lcd-hero.png" alt="Retrato ilustrado de Daniel Unibe" draggable="false">
            </div>
            <div class="home-copy">
                <p class="screen-kicker">DANIEL UNIBE <span aria-hidden="true">·</span> UX/UI</p>
                <h1>Product Designer</h1>
                ${action}
            </div>
        </div>
    `;
}

function renderMenu(cartridge) {
    const options = cartridge.items.map((item, index) => `
        <button class="menu-option${index === screenState.itemIndex ? ' is-selected' : ''}" type="button"
            data-action="open-item" data-item-index="${index}" aria-current="${index === screenState.itemIndex ? 'true' : 'false'}">
            <span class="menu-index">${String(index + 1).padStart(2, '0')}</span>
            <span class="menu-option-copy"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.summary)}</small></span>
            <span class="menu-chevron" aria-hidden="true">›</span>
        </button>
    `).join('');

    return `
        <div class="screen-shell screen-menu">
            <div class="screen-topline">
            <span>${escapeHTML(cartridge.label)} <i aria-hidden="true">/</i> MENÚ</span>
                <span>${String(screenState.itemIndex + 1).padStart(2, '0')} / ${String(cartridge.items.length).padStart(2, '0')}</span>
            </div>
            <header class="menu-heading">
                <p class="screen-kicker">${escapeHTML(cartridge.menuTitle)}</p>
                <h1>${escapeHTML(cartridge.title)}</h1>
                <p>${escapeHTML(cartridge.intro || cartridge.summary)}</p>
            </header>
            <nav class="menu-list" aria-label="${escapeHTML(cartridge.menuTitle)}">${options}</nav>
            <div class="screen-bottomline screen-controls-hint"><span>↑ ↓ ELEGIR · A ABRIR</span><span>START · CATEGORÍA</span></div>
        </div>
    `;
}

function renderDetail(cartridge, item) {
    const evidenceMode = screenState.detailMode === 'evidence';
    const evidence = (item.evidence || []).map((entry) => `<li>${escapeHTML(entry)}</li>`).join('');
    const links = renderLinks(item.links || []);
    const body = evidenceMode
        ? `<section class="detail-panel evidence-panel"><p class="panel-label">EVIDENCIA Y ESTADO</p>${evidence ? `<ul class="evidence-list">${evidence}</ul>` : '<p>No hay evidencia adicional publicada para esta ficha.</p>'}<p class="status-chip">${escapeHTML(item.status || 'Estado no especificado')}</p>${links ? `<div class="screen-links">${links}</div>` : ''}</section>`
        : `<div class="detail-panels">
                ${item.context ? `<section class="detail-panel"><p class="panel-label">CONTEXTO</p><p>${escapeHTML(item.context)}</p></section>` : ''}
                ${item.responsibility ? `<section class="detail-panel"><p class="panel-label">APORTACIÓN</p><p>${escapeHTML(item.responsibility)}</p></section>` : ''}
                ${!item.context && !item.responsibility ? `<section class="detail-panel"><p class="panel-label">RECORRIDO</p><p>${escapeHTML(item.status || 'Explora la evidencia de esta ficha.')}</p></section>` : ''}
            </div>`;
    const hasEvidence = (item.evidence || []).length > 0 || links.length > 0;
    const modeLabel = evidenceMode ? 'SELECT RESUMEN' : 'SELECT EVIDENCIA';

    return `
        <div class="screen-shell screen-detail">
            <div class="screen-topline">
                <button class="screen-back" type="button" data-action="back-menu" aria-label="Volver al menú ${escapeHTML(cartridge.label)}">← ${escapeHTML(cartridge.label)}</button>
                <span>${String(screenState.itemIndex + 1).padStart(2, '0')} / ${String(cartridge.items.length).padStart(2, '0')}</span>
            </div>
            <div class="detail-scroll-area">
                <p class="screen-kicker">${escapeHTML(item.period || cartridge.kicker)}</p>
                <h1>${escapeHTML(item.title)}</h1>
                <p class="detail-summary">${escapeHTML(item.summary)}</p>
                ${body}
                ${!evidenceMode && item.status ? `<p class="status-chip">${escapeHTML(item.status)}</p>` : ''}
            </div>
            <div class="screen-bottomline screen-controls-hint">
                <span>B MENÚ · START CATEGORÍA · EJECT INICIO</span>
                ${hasEvidence ? `<button class="screen-text-action" type="button" data-action="toggle-evidence">${modeLabel}</button>` : '<span>USA B PARA REGRESAR</span>'}
            </div>
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
        viewport.setAttribute('aria-label', `Menú del cartucho ${cartridge.label}`);
    } else if (screenState.view === 'detail' && isInserted) {
        const item = cartridge.items[screenState.itemIndex];
        viewport.innerHTML = item ? renderDetail(cartridge, item) : renderMenu(cartridge);
        viewport.setAttribute('aria-label', item ? `Detalle: ${item.title}` : `Menú del cartucho ${cartridge.label}`);
    } else {
        viewport.innerHTML = renderHome();
        viewport.dataset.theme = cartridge.theme;
        viewport.setAttribute('aria-label', 'Inicio del portafolio interactivo');
    }

    viewport.classList.toggle('active', visible);
    viewport.scrollTop = 0;
}

function announce(message) {
    announcer.textContent = '';
    window.requestAnimationFrame(() => { announcer.textContent = message; });
}

function waitForMotion(duration) {
    return new Promise((resolve) => window.setTimeout(resolve, prefersReducedMotion.matches ? 0 : duration));
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
    context.fillText('CARGANDO CARTUCHO', width / 2, height / 2 - 38);
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
    context.fillText('PREPARANDO LA EXPERIENCIA', width / 2, barY + 34);
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
            announce(`${cartridge.label} cargado. Usa las flechas para recorrer el menú.`);
            resolve();
        };

        if (prefersReducedMotion.matches) {
            finish();
            return;
        }

        const startedAt = performance.now();
        const duration = 640;
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

function createFlightClone(source, rect, { opacity = '1' } = {}) {
    const clone = source.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    clone.removeAttribute('data-cartridge-id');
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('tabindex', '-1');
    clone.classList.remove('hidden-in-rack');
    Object.assign(clone.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: '0',
        zIndex: '150',
        pointerEvents: 'none',
        opacity,
        transform: 'none'
    });
    document.body.appendChild(clone);
    return clone;
}

function animateElement(element, frames, duration, easing = 'cubic-bezier(.2,.8,.25,1)') {
    if (prefersReducedMotion.matches) return Promise.resolve();
    if (typeof element.animate !== 'function') {
        const finalFrame = frames[frames.length - 1] || {};
        element.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ease`;
        window.requestAnimationFrame(() => {
            if (finalFrame.transform) element.style.transform = finalFrame.transform;
            if (finalFrame.opacity !== undefined) element.style.opacity = String(finalFrame.opacity);
        });
        return waitForMotion(duration);
    }
    return element.animate(frames, { duration, easing, fill: 'forwards' }).finished.catch(() => undefined);
}

function animateCartridgeDeparture(rackCart) {
    const rect = rackCart.getBoundingClientRect();
    const flyingCart = createFlightClone(rackCart, rect);
    const dropDistance = Math.ceil(rect.height * 2.15);
    rackCart.classList.add('hidden-in-rack');

    if (prefersReducedMotion.matches) {
        flyingCart.remove();
        return Promise.resolve();
    }

    return animateElement(flyingCart, [
        { transform: 'translate3d(0, 0, 0) rotate(0deg) scale(1)', opacity: 1, offset: 0 },
        { transform: `translate3d(0, ${Math.round(dropDistance * 0.72)}px, 0) rotate(8deg) scale(.97)`, opacity: 1, offset: 0.72 },
        { transform: `translate3d(0, ${dropDistance}px, 0) rotate(13deg) scale(.92)`, opacity: 0, offset: 1 }
    ], 620).finally(() => flyingCart.remove());
}

function updatePuck(cartridge) {
    puckVisual.className = `cartridge cart-${cartridge.shell}`;
    puckSticker.className = `sticker sticker-${cartridge.theme}`;
    puckSticker.innerHTML = `<img class="cover-art" src="${escapeHTML(cartridge.cover)}" alt=""><span class="sticker-label">${escapeHTML(cartridge.label)}</span>`;
}

async function runInsertionAnimation(cartridge, rackCart, sequence) {
    const departure = animateCartridgeDeparture(rackCart);
    await waitForMotion(150);
    if (sequence !== animationSequence || !isInserted) return;
    world.classList.add('zoom-active');

    await waitForMotion(190);
    if (sequence !== animationSequence || !isInserted) return;
    void animPuck.offsetWidth;
    animPuck.classList.add('inserting');

    await Promise.all([departure, waitForMotion(620)]);
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
    announce(`Memoria seleccionada: ${cartridges[nextIndex].label}.`);
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
    announce(`${cartridge.items[screenState.itemIndex].title}, ${screenState.itemIndex + 1} de ${cartridge.items.length}.`);
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
    announce(`Detalle de ${cartridge.items[index].title}.`);
}

function backAction() {
    if (!isInserted || isEjecting) return;
    if (screenState.view === 'detail') {
        screenState.view = 'menu';
        screenState.detailMode = 'summary';
        renderScreen();
        announce('Menú del cartucho.');
        return;
    }
    if (screenState.view === 'menu') {
        screenState.view = 'home';
        renderScreen();
        announce('Inicio. El cartucho sigue insertado; usa EJECT para elegir otra memoria.');
        return;
    }
    announce('Ya estás en el inicio. Usa EJECT para cambiar de cartucho.');
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
        announce('Menú del cartucho.');
        return;
    }
    if (screenState.view === 'menu') {
        screenState.view = 'home';
        renderScreen();
        announce('Inicio del cartucho.');
        return;
    }
    screenState.view = 'menu';
    renderScreen();
    announce('Menú del cartucho.');
}

function selectAction() {
    const cartridge = getCartridge(currentCartId);
    const item = cartridge?.items[screenState.itemIndex];
    if (!item || screenState.view !== 'detail' || !(item.evidence?.length || item.links?.length)) {
        announce('No hay una vista alternativa para esta pantalla.');
        return;
    }
    screenState.detailMode = screenState.detailMode === 'summary' ? 'evidence' : 'summary';
    renderScreen();
    announce(screenState.detailMode === 'evidence' ? 'Vista de evidencia.' : 'Vista de resumen.');
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

async function animateCartridgeReturn(rackCart) {
    const target = rackCart.getBoundingClientRect();
    const start = {
        left: target.left,
        top: -target.height - 24,
        width: target.width,
        height: target.height
    };
    const flyingCart = createFlightClone(rackCart, start, { opacity: '0' });
    if (prefersReducedMotion.matches) {
        flyingCart.remove();
        return;
    }
    await animateElement(flyingCart, [
        { transform: 'translate3d(0, 0, 0) rotate(-9deg) scale(.92)', opacity: 0 },
        { transform: `translate3d(0, ${target.top - start.top}px, 0) rotate(0deg) scale(1)`, opacity: 1 }
    ], 560, 'cubic-bezier(.18,.72,.28,1)');
    flyingCart.remove();
}

async function triggerEjection() {
    if (!isInserted || isEjecting) return;
    isEjecting = true;
    ejectButton.disabled = true;
    const ejectedId = currentCartId;
    const rackCart = document.getElementById(`rack-cart-${ejectedId}`);
    const sequence = ++animationSequence;
    if (bootFrame !== null) {
        window.cancelAnimationFrame(bootFrame);
        bootFrame = null;
    }
    playEjectSound();

    if (!prefersReducedMotion.matches && puckVisual.isConnected) {
        const flyingCart = createFlightClone(puckVisual, puckVisual.getBoundingClientRect());
        await animateElement(flyingCart, [
            { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
            { transform: `translate3d(0, ${-window.innerHeight - 80}px, 0) scale(.86)`, opacity: 0 }
        ], 300);
        flyingCart.remove();
    }

    document.body.classList.remove('interface-active');
    world.classList.remove('zoom-active');
    animPuck.classList.remove('inserting');
    canvas.classList.add('fade-out');
    isInserted = false;
    currentCartId = null;
    screenState = { view: 'home', itemIndex: 0, detailMode: 'summary' };
    renderScreen();

    await waitForMotion(800);
    if (sequence !== animationSequence) return;
    if (rackCart && !prefersReducedMotion.matches) await animateCartridgeReturn(rackCart);
    if (sequence !== animationSequence) return;

    rackCart?.classList.remove('hidden-in-rack');
    rack.inert = false;
    rack.removeAttribute('aria-hidden');
    isEjecting = false;
    updateSelectedCartridge(ejectedId);
    announce('Cartucho expulsado. Elige otra memoria.');
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
renderRack();
renderSocialLinks();
canvas.classList.add('fade-out');
renderScreen();

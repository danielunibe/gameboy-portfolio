const defaultDurations = {
    cartridge: 620,
    return: 560
};

export function getMotionDuration(token, fallback) {
    const rawValue = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    const match = rawValue.match(/^([\d.]+)\s*(ms|s)$/i);
    if (!match) return fallback;
    return Number(match[1]) * (match[2].toLowerCase() === 's' ? 1000 : 1);
}

export function waitForMotion(duration, reducedMotion) {
    if (reducedMotion || duration <= 0) return Promise.resolve();
    return new Promise((resolve) => window.setTimeout(resolve, duration));
}

export function waitForTransition(element, property, duration, reducedMotion) {
    if (!element || reducedMotion || duration <= 0) return Promise.resolve();

    return new Promise((resolve) => {
        let timeoutId;
        const finish = () => {
            window.clearTimeout(timeoutId);
            element.removeEventListener('transitionend', handleTransitionEnd);
            resolve();
        };
        const handleTransitionEnd = (event) => {
            if (event.target === element && event.propertyName === property) finish();
        };

        element.addEventListener('transitionend', handleTransitionEnd);
        timeoutId = window.setTimeout(finish, duration + 120);
    });
}

function createFlightClone(source, rect, { opacity = '1', zIndex = 150 } = {}) {
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
        zIndex: String(zIndex),
        pointerEvents: 'none',
        opacity,
        transform: 'none'
    });
    document.body.appendChild(clone);
    return clone;
}

function animateElement(element, frames, duration, easing, reducedMotion) {
    if (reducedMotion || duration <= 0) return Promise.resolve();
    if (typeof element.animate !== 'function') {
        const finalFrame = frames[frames.length - 1] || {};
        element.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ease`;
        window.requestAnimationFrame(() => {
            if (finalFrame.transform) element.style.transform = finalFrame.transform;
            if (finalFrame.opacity !== undefined) element.style.opacity = String(finalFrame.opacity);
        });
        return waitForMotion(duration, false);
    }
    return element.animate(frames, { duration, easing, fill: 'forwards' }).finished.catch(() => undefined);
}

function getRackSide(rackCart) {
    return rackCart?.closest('#rack-right') ? 'right' : 'left';
}

export function animateCartridgeDeparture(rackCart, reducedMotion) {
    const rect = rackCart.getBoundingClientRect();
    const flyingCart = createFlightClone(rackCart, rect);
    const drift = (getRackSide(rackCart) === 'left' ? -1 : 1) * Math.min(96, window.innerWidth * .07);
    const exitY = Math.max(0, window.innerHeight - rect.top + rect.height + 32);
    rackCart.classList.add('hidden-in-rack');

    if (reducedMotion) {
        flyingCart.remove();
        return Promise.resolve();
    }

    const duration = getMotionDuration('--motion-cartridge-flight', defaultDurations.cartridge);
    const flight = animateElement(flyingCart, [
        { transform: 'translate3d(0, 0, 0) rotate(0deg) scale(1)', opacity: 1, offset: 0 },
        { transform: `translate3d(${Math.round(drift * .74)}px, ${Math.round(exitY * 0.42)}px, 0) rotate(${drift > 0 ? 1 : -1}deg) scale(.99)`, opacity: .84, offset: .48 },
        { transform: `translate3d(${drift}px, ${exitY}px, 0) rotate(${drift > 0 ? 2 : -2}deg) scale(.96)`, opacity: 0, offset: 1 }
    ], duration, 'cubic-bezier(.36,.04,.66,.42)', reducedMotion);
    return flight.finally(() => flyingCart.remove());
}

export function animateCartridgeEjection(puckVisual, reducedMotion) {
    if (reducedMotion || !puckVisual?.isConnected) return Promise.resolve();

    const rect = puckVisual.getBoundingClientRect();
    const flyingCart = createFlightClone(puckVisual, rect);
    puckVisual.style.visibility = 'hidden';
    const exitY = -(rect.bottom + 40);
    const duration = getMotionDuration('--motion-eject-flight', 480);
    const flight = animateElement(flyingCart, [
        { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1, offset: 0 },
        { transform: `translate3d(0, ${Math.round(exitY * .24)}px, 0) scale(.99)`, opacity: 1, offset: .2 },
        { transform: `translate3d(0, ${exitY}px, 0) scale(.94)`, opacity: 0, offset: 1 }
    ], duration, 'cubic-bezier(.28,.68,.38,1)', reducedMotion);
    return flight.finally(() => flyingCart.remove());
}

export async function animateCartridgeReturn(rackCart, reducedMotion) {
    if (!rackCart || reducedMotion) return;

    const target = rackCart.getBoundingClientRect();
    const startTop = window.innerHeight + 32;
    const start = {
        left: target.left,
        top: startTop,
        width: target.width,
        height: target.height
    };
    const flyingCart = createFlightClone(rackCart, start, { opacity: '0' });
    const travelY = target.top - startTop;
    const duration = getMotionDuration('--motion-cartridge-return', defaultDurations.return);
    await animateElement(flyingCart, [
        { transform: 'translate3d(0, 0, 0) rotate(1deg) scale(.96)', opacity: 0, offset: 0 },
        { transform: `translate3d(0, ${Math.round(travelY * .58)}px, 0) rotate(-.5deg) scale(.99)`, opacity: .96, offset: .58 },
        { transform: `translate3d(0, ${travelY}px, 0) rotate(0deg) scale(1)`, opacity: 1, offset: 1 }
    ], duration, 'cubic-bezier(.2,.72,.22,1)', reducedMotion);
    flyingCart.remove();
}

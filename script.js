/* ==========================================================================
   Dave Valenzuela — Portfolio
   Modules: intro · cursor & spotlight · hero parallax · navigation
            · scroll reveal · skills tabs · misc
   ========================================================================== */
(() => {
    'use strict';

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ---------- Intro sequence ---------- */
    function initIntro() {
        // Set to true if the opening animation should only play once per browser session.
        const SHOW_ONCE_PER_SESSION = false;

        const intro = $('#intro');
        const startHero = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-loaded')));

        let seen = false;
        try { seen = SHOW_ONCE_PER_SESSION && sessionStorage.getItem('introSeen') === '1'; } catch (e) { /* storage blocked */ }

        if (!intro || reduceMotion || seen) {
            if (intro) intro.remove();
            startHero();
            return;
        }

        document.body.style.overflow = 'hidden';
        let finished = false;

        const finish = () => {
            if (finished) return;
            finished = true;
            try { if (SHOW_ONCE_PER_SESSION) sessionStorage.setItem('introSeen', '1'); } catch (e) { /* ignore */ }
            intro.classList.add('is-leaving');
            document.body.style.overflow = '';
            setTimeout(startHero, 350);
            setTimeout(() => intro.remove(), 1100);
        };

        setTimeout(finish, 2900);

        intro.addEventListener('click', finish);
        document.addEventListener('keydown', finish, { once: true });
    }

    /* ---------- Cursor ring + background spotlight ---------- */
    function initCursor() {
        if (!finePointer) return;

        const cursor = $('#cursor');
        const spot = $('#spot');
        const interactive = 'a, button, [data-cursor], [role="tab"]';

        const pos = { x: 0, y: 0 };
        const ring = { x: 0, y: 0 };
        const glow = { x: 0, y: 0 };
        let started = false;
        let running = false;

        const tick = () => {
            ring.x += (pos.x - ring.x) * 0.22;
            ring.y += (pos.y - ring.y) * 0.22;
            glow.x += (pos.x - glow.x) * 0.06;
            glow.y += (pos.y - glow.y) * 0.06;

            cursor.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
            if (!reduceMotion) spot.style.transform = `translate3d(${glow.x}px, ${glow.y}px, 0)`;

            const settled =
                Math.abs(pos.x - ring.x) < 0.1 && Math.abs(pos.y - ring.y) < 0.1 &&
                Math.abs(pos.x - glow.x) < 0.1 && Math.abs(pos.y - glow.y) < 0.1;

            if (settled) { running = false; return; }
            requestAnimationFrame(tick);
        };

        window.addEventListener('pointermove', (e) => {
            if (e.pointerType && e.pointerType !== 'mouse') return;
            pos.x = e.clientX;
            pos.y = e.clientY;

            if (!started) {
                started = true;
                ring.x = glow.x = pos.x;
                ring.y = glow.y = pos.y;
                if (!reduceMotion) spot.classList.add('is-on');
            }
            if (!running) { running = true; requestAnimationFrame(tick); }

            const target = e.target instanceof Element ? e.target.closest(interactive) : null;
            cursor.classList.toggle('is-active', !!target);
            cursor.classList.toggle('is-large', !!target && target.dataset.cursor === 'large');
        }, { passive: true });

        document.addEventListener('pointerleave', () => cursor.classList.remove('is-active', 'is-large'));
    }

    /* ---------- Hero parallax (very small) ---------- */
    function initHeroParallax() {
        const hero = $('#home');
        if (!hero || !finePointer || reduceMotion) return;

        let queued = false;
        let mx = 0, my = 0;

        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
            my = ((e.clientY - r.top) / r.height - 0.5) * 2;
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => {
                hero.style.setProperty('--mx', mx.toFixed(3));
                hero.style.setProperty('--my', my.toFixed(3));
                queued = false;
            });
        }, { passive: true });

        hero.addEventListener('pointerleave', () => {
            hero.style.setProperty('--mx', 0);
            hero.style.setProperty('--my', 0);
        });
    }

    /* ---------- Navigation: active section + mobile menu ---------- */
    function initNav() {
        const links = $$('[data-nav]');
        const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);

        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    links.forEach((a) => {
                        const on = a.getAttribute('href') === `#${entry.target.id}`;
                        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
                    });
                });
            }, { rootMargin: '-45% 0px -50% 0px' });
            sections.forEach((s) => io.observe(s));
        }

        const toggle = $('#menu-toggle');
        const nav = $('#site-nav');
        if (!toggle || !nav) return;

        const setOpen = (open) => {
            document.body.classList.toggle('menu-open', open);
            document.body.style.overflow = open ? 'hidden' : '';
            toggle.setAttribute('aria-expanded', String(open));
            toggle.firstElementChild.textContent = open ? 'Close' : 'Menu';
        };

        toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
        links.forEach((a) => a.addEventListener('click', () => setOpen(false)));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
        });
        window.matchMedia('(min-width: 821px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
    }

    /* ---------- Scroll reveal (runs once per element) ---------- */
    function initReveal() {
        const items = $$('[data-reveal]');

        // Stagger children inside a reveal group
        $$('[data-reveal-group]').forEach((group) => {
            $$('[data-reveal]', group).forEach((el, i) => el.style.setProperty('--i', i));
        });

        if (reduceMotion || !('IntersectionObserver' in window)) {
            items.forEach((el) => el.classList.add('is-in'));
            return;
        }

        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

        items.forEach((el) => io.observe(el));
    }

    /* ---------- Skills: accessible tabs ---------- */
    function initSkills() {
        const tabs = $$('.skills__tab');
        if (!tabs.length) return;

        const select = (tab, focus = false) => {
            tabs.forEach((t) => {
                const on = t === tab;
                t.setAttribute('aria-selected', String(on));
                t.tabIndex = on ? 0 : -1;
                $('#' + t.getAttribute('aria-controls')).hidden = !on;
            });
            if (focus) tab.focus();
        };

        tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => select(tab));
            tab.addEventListener('keydown', (e) => {
                const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
                if (e.key in keys) {
                    e.preventDefault();
                    select(tabs[(i + keys[e.key] + tabs.length) % tabs.length], true);
                } else if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
                else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
            });
        });
    }

    /* ---------- GitHub buttons (only when a link is provided) ---------- */
    function initGithubLinks() {
        $$('[data-github]').forEach((card) => {
            const url = (card.dataset.github || '').trim();
            if (!/^https?:\/\//i.test(url)) return;          // empty or invalid: no button

            const holder = $('.project__body', card) || $('.minor__main', card);
            if (!holder) return;

            const title = ($('h4', card) || {}).textContent || 'this project';
            const link = document.createElement('a');
            link.className = 'btn-github';
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'View on GitHub';
            link.setAttribute('aria-label', `View ${title} on GitHub (opens in a new tab)`);
            holder.appendChild(link);
        });
    }

    /* ---------- Misc ---------- */
    function initMisc() {
        // Placeholder links (no real URL yet) shouldn't jump to the top of the page.
        $$('[data-placeholder]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));
        const year = $('#year');
        if (year) year.textContent = new Date().getFullYear();
    }

    initIntro();
    initCursor();
    initHeroParallax();
    initNav();
    initReveal();
    initSkills();
    initMisc();
    initGithubLinks();
})();
/* Hosted design review using the supplied Frame.io share. */
(() => {
  'use strict';
  const rootUrl = new URL('./', document.baseURI);
  const nav = document.querySelector('.nav-links');
  const navToggle = document.querySelector('.nav-toggle');
  const filmDialog = document.querySelector('.video-dialog');
  const player = filmDialog.querySelector('.video-player');
  const reviewPlayer = filmDialog.querySelector('.review-player');
  const frameFallback = filmDialog.querySelector('.frame-fallback');
  const pending = filmDialog.querySelector('.pending-player');
  const filmTitle = document.querySelector('#video-dialog-title');
  const playerNote = document.querySelector('#player-note');
  let films = [];
  const openers = new WeakMap();

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function localUrl(value) {
    if (typeof value !== 'string' || !value) return null;
    try {
      const url = new URL(value, rootUrl);
      return url.origin === rootUrl.origin ? url.href : null;
    } catch { return null; }
  }

  function openDialog(dialog, opener) {
    openers.set(dialog, opener);
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }

  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
      if (event.target === dialog && outside) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (dialog === filmDialog) {
        reviewPlayer.removeAttribute('src');
        player.pause();
        player.removeAttribute('src');
        player.load();
      }
      document.body.classList.remove('dialog-open');
      const opener = openers.get(dialog);
      if (opener?.isConnected) opener.focus({preventScroll: true});
      openers.delete(dialog);
    });
  });

  document.querySelectorAll('[data-open]').forEach(button => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.open);
      if (dialog) openDialog(dialog, button);
    });
  });

  navToggle.hidden = false;
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('is-open', !expanded);
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a,button')) {
      nav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.focus();
    }
  });

  function openFilm(entry, opener) {
    filmTitle.textContent = entry.title;
    const frameUrl = typeof entry.frameUrl === 'string' && entry.frameUrl.startsWith('https://next.frame.io/share/') ? entry.frameUrl : null;
    player.hidden = true;
    pending.hidden = Boolean(frameUrl);
    reviewPlayer.hidden = !frameUrl;
    frameFallback.hidden = !frameUrl;
    if (frameUrl) {
      reviewPlayer.src = frameUrl;
      reviewPlayer.title = `Watch ${entry.title}`;
      frameFallback.href = frameUrl;
      playerNote.textContent = `${entry.duration} · Review player`;
    } else {
      document.querySelector('#pending-poster').src = localUrl(entry.poster) || '';
      playerNote.textContent = 'This review video is currently unavailable.';
    }
    openDialog(filmDialog, opener);
  }

  player.addEventListener('error', () => {
    if (player.hasAttribute('src')) playerNote.textContent = 'This video could not play. Please close it and try again.';
  });

  function buildVideoCard(entry, index) {
    const card = element('article', 'work-card');
    const external = !entry.src && entry.watchUrl?.startsWith('https://next.frame.io/share/');
    const button = element(external ? 'a' : 'button', 'work-visual');
    const playable = Boolean(entry.frameUrl || localUrl(entry.src));
    if (external) {
      button.href = entry.watchUrl;
      button.target = '_blank';
      button.rel = 'noopener noreferrer';
    } else button.type = 'button';
    button.setAttribute('aria-label', `${external ? 'Watch on Frame.io (opens in a new tab):' : playable ? 'Play video' : 'Preview thumbnail for'} ${entry.title}`);
    button.dataset.film = entry.id;
    const image = element('img', 'work-image');
    image.src = localUrl(entry.poster);
    image.alt = '';
    image.width = 1400;
    image.height = 788;
    image.loading = index < 2 ? 'eager' : 'lazy';
    image.decoding = 'async';
    const action = element('span', 'work-action', playable ? '▶' : '↗');
    action.setAttribute('aria-hidden', 'true');
    button.append(image, action);
    if (!external) button.addEventListener('click', () => openFilm(entry, button));
    const caption = element('div', 'work-caption');
    caption.append(element('span', 'work-number', String(index + 1).padStart(2, '0')));
    caption.append(element('h3', 'work-title', entry.title));
    caption.append(element('p', 'work-meta', external ? `${entry.duration} · Frame.io ↗` : playable ? entry.duration || 'Play video' : 'Player pending'));
    card.append(button, caption);
    return card;
  }

  async function loadPortfolio() {
    const grid = document.querySelector('#work-grid');
    try {
      const response = await fetch(new URL('assets/portfolio.json?v=29-stories', rootUrl));
      if (!response.ok) throw new Error('Portfolio unavailable');
      const manifest = await response.json();
      films = Array.isArray(manifest.public) ? manifest.public.filter(entry => !entry.hidden) : [];
      document.querySelector('.frame-label span:last-child').textContent = `001 / ${String(films.length).padStart(3, '0')}`;
      grid.replaceChildren(...films.flatMap((entry, index) => entry.id === manifest.featuredId ? [] : [buildVideoCard(entry, index)]));
      document.querySelectorAll('.hero-feature [data-film]').forEach(button => {
        const film = films.find(entry => entry.id === button.dataset.film);
        if (film) button.addEventListener('click', () => openFilm(film, button));
        else button.disabled = true;
      });
    } catch {
      grid.replaceChildren(element('p', 'loading-note', 'The video list could not load. Please refresh this page.'));
      document.querySelector('.feature-visual').disabled = true;
    } finally {
      grid.setAttribute('aria-busy', 'false');
    }
  }

  document.querySelector('#inquiry-form').addEventListener('submit', event => {
    event.preventDefault();
    document.querySelector('.form-result').hidden = false;
  });
  void loadPortfolio();
})();

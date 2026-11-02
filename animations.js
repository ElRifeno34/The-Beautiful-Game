/* =========================================================
   The Beautiful Game — entrance and 3D animations (Motion)
   Big titles flip up on load, cards tip in and tilt under the
   pointer, and the masthead pitch lies back in 3D. Nothing moves
   for visitors who ask their system for reduced motion.
   ========================================================= */

(function () {
	var M = window.Motion;
	if (!M || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	var EASE = [0.22, 1, 0.36, 1];
	var VIEW = { amount: 0.15, margin: '0px 0px -8% 0px' };

	function list(selector, root) {
		return Array.prototype.slice.call((root || document).querySelectorAll(selector));
	}

	// Hide right away so nothing flashes before its animation starts
	function prepare(els) {
		els.forEach(function (el) { el.style.opacity = '0'; });
		return els;
	}

	// 3D start/end transforms; each pair keeps the same functions so they blend smoothly
	var FLIP_UP = ['perspective(700px) rotateX(-75deg) translateY(24px)', 'perspective(700px) rotateX(0deg) translateY(0px)'];
	var TIP_IN = ['perspective(1200px) rotateX(14deg) translateY(40px)', 'perspective(1200px) rotateX(0deg) translateY(0px)'];
	var LEAN_IN = ['perspective(1000px) rotateX(9deg) translateY(24px)', 'perspective(1000px) rotateX(0deg) translateY(0px)'];

	// Animates in, then hands transforms back to the stylesheet so hover effects keep working.
	// A value can be a start value (animated to its resting value) or a [from, to] pair.
	function reveal(els, from, options) {
		if (!els.length) return Promise.resolve();
		var keyframes = { opacity: [0, 1] };
		Object.keys(from).forEach(function (k) {
			keyframes[k] = Array.isArray(from[k]) ? from[k] : [from[k], k === 'scale' ? 1 : 0];
		});
		var controls = M.animate(els, keyframes, Object.assign({ duration: 0.7, ease: EASE }, options));
		// Motion writes its final transform just after finishing, so clear it a frame later
		return controls.then(function () {
			return new Promise(function (resolve) {
				requestAnimationFrame(function () {
					requestAnimationFrame(function () {
						els.forEach(function (el) { el.style.removeProperty('transform'); });
						resolve();
					});
				});
			});
		});
	}

	// Reveals each element when it scrolls into view. Elements that enter
	// together are staggered by their position in the batch.
	function onScroll(els, from, options) {
		prepare(els).forEach(function (el, i) {
			M.inView(el, function () {
				var delay = (options && options.step || 0) * (i % (options && options.group || 1));
				reveal([el], from, { delay: delay, duration: options && options.duration || 0.7 }).then(function () {
					if (options && options.done) options.done(el);
				});
			}, VIEW);
		});
	}

	/* ---------- Pitch markings drawn behind the masthead ---------- */

	var mast = document.querySelector('.masthead');
	if (mast) {
		var NS = 'http://www.w3.org/2000/svg';
		var pitch = document.createElementNS(NS, 'svg');
		pitch.setAttribute('class', 'masthead-pitch');
		pitch.setAttribute('viewBox', '0 0 240 240');
		pitch.setAttribute('aria-hidden', 'true');
		pitch.innerHTML =
			'<line x1="120" y1="-160" x2="120" y2="400" pathLength="1"/>' +
			'<circle cx="120" cy="120" r="108" pathLength="1"/>' +
			'<circle class="masthead-pitch-spot" cx="120" cy="120" r="3"/>';
		mast.insertBefore(pitch, mast.firstChild);
		var marks = list('line, circle:not(.masthead-pitch-spot)', pitch);
		M.animate(marks, { strokeDashoffset: [1, 0] }, { duration: 1.6, delay: M.stagger(0.25, { startDelay: 0.2 }), ease: EASE });
		M.animate(pitch.querySelector('.masthead-pitch-spot'), { opacity: [0, 1], scale: [0, 1] }, { duration: 0.5, delay: 1.2 });

		// The pitch lies back in 3D and turns gently to follow the pointer
		if (window.matchMedia('(hover: hover)').matches) {
			mast.addEventListener('pointermove', function (e) {
				var r = mast.getBoundingClientRect();
				var px = (e.clientX - r.left) / r.width - 0.5;
				var py = (e.clientY - r.top) / r.height - 0.5;
				pitch.style.transform = 'perspective(500px) rotateX(' + (58 - py * 10) + 'deg) rotateZ(' + (px * 24) + 'deg)';
			});
			mast.addEventListener('pointerleave', function () { pitch.style.removeProperty('transform'); });
		}
	}

	/* ---------- On load ---------- */

	var masthead = prepare(list('.masthead > :not(svg)'));
	reveal(masthead, { y: 10 }, { delay: M.stagger(0.08), duration: 0.8 });

	// Big titles flip up into place, like boards on a stadium scoreboard
	var titles = prepare(list('.intro-title .line, .page-title'));
	reveal(titles, { transform: FLIP_UP }, { delay: M.stagger(0.12, { startDelay: 0.2 }), duration: 1 });

	var intro = prepare(list('.intro .eyebrow, .intro-text, .page--narrow > .eyebrow'));
	reveal(intro, { y: 24 }, { delay: M.stagger(0.12, { startDelay: 0.1 }), duration: 0.8 });

	function articleHero(root) {
		var title = prepare(list('.article-title', root));
		reveal(title, { transform: FLIP_UP }, { delay: 0.15, duration: 1 });
		var hero = prepare(list('.article-hero > :not(.article-title)', root));
		reveal(hero, { y: 18 }, { delay: M.stagger(0.08, { startDelay: 0.1 }) });
	}

	/* ---------- Cards: tip in, then tilt in 3D under the pointer ---------- */

	var canTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

	function tilt(card) {
		if (!canTilt || card.classList.contains('card--soon') || card.querySelector('.card-glare')) return;
		var glare = document.createElement('span');
		glare.className = 'card-glare';
		glare.setAttribute('aria-hidden', 'true');
		card.appendChild(glare);

		card.addEventListener('pointermove', function (e) {
			if (!card.hasAttribute('data-ready')) return;
			var r = card.getBoundingClientRect();
			var px = (e.clientX - r.left) / r.width;
			var py = (e.clientY - r.top) / r.height;
			card.classList.add('is-tilting');
			card.style.transform = 'perspective(900px) rotateX(' + ((0.5 - py) * 8) + 'deg) rotateY(' + ((px - 0.5) * 10) + 'deg) translateY(-4px)';
			card.style.setProperty('--gx', (px * 100) + '%');
			card.style.setProperty('--gy', (py * 100) + '%');
		});
		card.addEventListener('pointerleave', function () {
			card.classList.remove('is-tilting');
			card.style.removeProperty('transform');
		});
	}

	function cards(found) {
		found.forEach(tilt);
		onScroll(found, { transform: TIP_IN }, {
			step: 0.08,
			group: 3,
			duration: 0.9,
			done: function (card) { card.setAttribute('data-ready', ''); }
		});
		found.forEach(function (card) {
			var img = card.querySelector('.card-media img');
			if (!img) return;
			M.inView(card, function () {
				reveal([img], { scale: 1.06 }, { duration: 1.1 });
			}, VIEW);
		});
	}

	function articleBody(root) {
		onScroll(list('.article > p, .article > h3', root), { y: 18 }, { duration: 0.8 });
		onScroll(list('.article > .article-figure', root), { transform: LEAN_IN }, { duration: 1 });
		onScroll(list('.article > blockquote', root), { x: -14 }, { duration: 0.9 });
	}

	onScroll(list('.journal-bar, .empty-state'), { y: 12 }, {});
	cards(list('.card'));
	articleHero();
	articleBody();
	onScroll(list('.about-section h2, .about-section p, .about-body .back-link'), { y: 16 }, {});

	/* ---------- Menu underline that glides between sections ---------- */

	var siteNav = document.querySelector('.site-nav');
	var navList = document.querySelector('.nav-list');
	var wide = window.matchMedia('(min-width: 721px)');
	var glide;

	function glideTo(link, instant) {
		if (!glide || !wide.matches) return;
		if (!link) {
			M.animate(glide, { opacity: 0 }, { duration: instant ? 0 : 0.2 });
			return;
		}
		var r = link.getBoundingClientRect();
		var n = siteNav.getBoundingClientRect();
		glide.style.top = (r.bottom - n.top - 2) + 'px';
		M.animate(glide, { x: r.left - n.left, width: r.width, opacity: 1 }, { duration: instant ? 0 : 0.4, ease: EASE });
	}

	function current() {
		return navList.querySelector('a[aria-current="page"]');
	}

	if (siteNav && navList) {
		glide = document.createElement('span');
		glide.className = 'nav-glide';
		glide.setAttribute('aria-hidden', 'true');
		siteNav.appendChild(glide);

		var setMode = function () {
			navList.classList.toggle('nav-list--glide', wide.matches);
			glide.hidden = !wide.matches;
			glideTo(current(), true);
		};
		wide.addEventListener('change', setMode);
		// Fonts change link widths, so measure again once they have loaded
		if (document.fonts) document.fonts.ready.then(function () { glideTo(current(), true); });
		window.addEventListener('resize', function () { glideTo(current(), true); });
		setMode();

		list('a', navList).forEach(function (link) {
			link.addEventListener('mouseenter', function () { glideTo(link); });
			link.addEventListener('focus', function () { glideTo(link); });
		});
		navList.addEventListener('mouseleave', function () { glideTo(current()); });
		navList.addEventListener('focusout', function (e) {
			if (!navList.contains(e.relatedTarget)) glideTo(current());
		});
	}

	/* ---------- Big titles drift apart as the page scrolls ---------- */

	var drift = list('.intro-title .line');
	if (drift.length === 2) {
		var queued = false;
		var update = function () {
			queued = false;
			var t = Math.min(1, window.scrollY / 600);
			// "translate" is separate from "transform", so this never fights the entrance animation
			drift[0].style.translate = (-28 * t) + 'px 0';
			drift[1].style.translate = (28 * t) + 'px 0';
		};
		window.addEventListener('scroll', function () {
			if (!queued) { queued = true; requestAnimationFrame(update); }
		}, { passive: true });
	}

	/* ---------- Stories added later by stories.js ---------- */

	document.addEventListener('tbg:content', function (e) {
		var detail = e.detail || {};
		if (detail.cards) cards(detail.cards);
		// story.html marks its section in the menu only once the story has loaded
		glideTo(navList && current(), true);
		if (detail.root) {
			articleHero(detail.root);
			articleBody(detail.root);
			onScroll(list('.empty-state', detail.root), { y: 12 }, {});
		}
	});
})();

/* =========================================================
   The Beautiful Game — subtle entrance animations (Motion)
   The masthead and page intro ease in on load; cards, paragraphs
   and photos fade up as they scroll into view. Nothing moves for
   visitors who ask their system for reduced motion.
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

	// Animates in, then hands transforms back to the stylesheet so hover effects keep working
	function reveal(els, from, options) {
		if (!els.length) return;
		var keyframes = { opacity: [0, 1] };
		Object.keys(from).forEach(function (k) { keyframes[k] = [from[k], k === 'scale' ? 1 : 0]; });
		var controls = M.animate(els, keyframes, Object.assign({ duration: 0.7, ease: EASE }, options));
		// Motion writes its final transform just after finishing, so clear it a frame later
		controls.then(function () {
			requestAnimationFrame(function () {
				requestAnimationFrame(function () {
					els.forEach(function (el) { el.style.removeProperty('transform'); });
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
				reveal([el], from, { delay: delay, duration: options && options.duration || 0.7 });
			}, VIEW);
		});
	}

	/* ---------- On load ---------- */

	var masthead = prepare(list('.masthead > *'));
	reveal(masthead, { y: 10 }, { delay: M.stagger(0.08), duration: 0.8 });

	var intro = prepare(list('.intro .eyebrow, .intro-title .line, .intro-text, .page--narrow > .eyebrow, .page-title'));
	reveal(intro, { y: 24 }, { delay: M.stagger(0.09, { startDelay: 0.15 }), duration: 0.8 });

	function articleHero(root) {
		var hero = prepare(list('.article-hero > *', root));
		reveal(hero, { y: 18 }, { delay: M.stagger(0.08, { startDelay: 0.1 }) });
	}

	/* ---------- On scroll ---------- */

	function cards(found) {
		onScroll(found, { y: 28 }, { step: 0.08, group: 3 });
		found.forEach(function (card) {
			var img = card.querySelector('.card-media img');
			if (!img) return;
			M.inView(card, function () {
				reveal([img], { scale: 1.06 }, { duration: 1.1 });
			}, VIEW);
		});
	}

	function articleBody(root) {
		onScroll(list('.article > p, .article > .article-figure', root), { y: 18 }, { duration: 0.8 });
		onScroll(list('.article > blockquote', root), { x: -14 }, { duration: 0.9 });
	}

	onScroll(list('.journal-bar, .empty-state'), { y: 12 }, {});
	cards(list('.card'));
	articleHero();
	articleBody();
	onScroll(list('.about-section h2, .about-section p, .about-body .back-link'), { y: 16 }, {});

	/* ---------- Stories added later by stories.js ---------- */

	document.addEventListener('tbg:content', function (e) {
		var detail = e.detail || {};
		if (detail.cards) cards(detail.cards);
		if (detail.root) {
			articleHero(detail.root);
			articleBody(detail.root);
			onScroll(list('.empty-state', detail.root), { y: 12 }, {});
		}
	});
})();

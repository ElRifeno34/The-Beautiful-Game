/* =========================================================
   The Beautiful Game — live touches
   A scrolling ticker of football moments under the menu, and a
   reading progress bar on stories. Both still work for visitors
   who prefer reduced motion (the ticker simply stops scrolling).
   ========================================================= */

(function () {
	var WIRE = [
		['the-invincibles.html', 'Arsenal 2003–04', '38 played, 0 lost'],
		['90s-parma.html', 'Moscow 1999', 'Parma 3–0 Marseille in the UEFA Cup final'],
		['are-wonderkids-overhyped.html', 'Lamine Yamal', 'European champion at 17'],
		['why-soccer-video-games-are-declining.html', '2023', 'FIFA becomes EA Sports FC'],
		['the-invincibles.html', 'Thierry Henry', '30 league goals, one Golden Boot'],
		['90s-parma.html', 'Parma', 'Serie D in 2015, Serie A by 2018'],
		['is-soccer-becoming-more-soulless.html', 'Francesco Totti', '“Playing with your heart is another.”']
	];

	/* ---------- Ticker ---------- */

	var nav = document.querySelector('.site-nav');
	if (nav) {
		var items = function (hidden) {
			return WIRE.map(function (w) {
				return '<li><a href="' + w[0] + '"' + (hidden ? ' tabindex="-1"' : '') + '><strong>' + w[1] + '</strong><span>' + w[2] + '</span></a></li>';
			}).join('');
		};
		var ticker = document.createElement('aside');
		ticker.className = 'ticker';
		ticker.setAttribute('aria-label', 'From the archive');
		ticker.innerHTML =
			'<p class="ticker-label"><span>From the archive</span></p>' +
			'<div class="ticker-track"><div class="ticker-move">' +
			'<ul class="ticker-list">' + items(false) + '</ul>' +
			// A second copy makes the loop seamless; screen readers skip it
			'<ul class="ticker-list" aria-hidden="true">' + items(true) + '</ul>' +
			'</div></div>';
		nav.insertAdjacentElement('afterend', ticker);
	}

	/* ---------- Reading progress ---------- */

	if (document.querySelector('.article-hero, #story')) {
		var bar = document.createElement('div');
		bar.className = 'read-progress';
		bar.setAttribute('aria-hidden', 'true');
		document.body.appendChild(bar);

		var queued = false;
		var update = function () {
			queued = false;
			var max = document.documentElement.scrollHeight - window.innerHeight;
			var progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
			bar.style.transform = 'scaleX(' + progress + ')';
		};
		var request = function () {
			if (!queued) { queued = true; requestAnimationFrame(update); }
		};
		window.addEventListener('scroll', request, { passive: true });
		window.addEventListener('resize', request);
		document.addEventListener('tbg:content', request);
		update();
	}
})();

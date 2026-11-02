/* =========================================================
   The Beautiful Game — stories written from the website
   Loads published stories from Supabase, adds their cards to the
   home and section pages, and renders them on story.html.
   ========================================================= */

(function () {
	var SECTIONS = {
		'Chronicles.html': { name: 'Chronicles', nav: 'Chronicles' },
		'football-flashbacks.html': { name: 'Football Flashbacks', nav: 'Flashbacks' },
		'legendary-performances.html': { name: 'Legendary Players', nav: 'Legendary Players' },
		'gaming-corner.html': { name: 'Gaming Corner', nav: 'Gaming Corner' }
	};
	var NUMBERS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

	/* ---------- Supabase ---------- */

	var config = window.TBG_CONFIG || {};
	var configured = !!(window.supabase && config.supabaseUrl && config.supabaseKey &&
		config.supabaseUrl.indexOf('YOUR-PROJECT') === -1);
	var client = configured ? window.supabase.createClient(config.supabaseUrl, config.supabaseKey) : null;

	/* ---------- Text ---------- */

	function esc(text) {
		return String(text == null ? '' : text)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	// Curly quotes and dashes, so text typed with straight quotes matches the other stories
	function typeset(text) {
		return String(text || '')
			.replace(/(^|[\s(\[—-])"/g, '$1“').replace(/"/g, '”')
			.replace(/(^|[\s(\[—-])'/g, '$1‘').replace(/'/g, '’')
			.replace(/ -- | --|-- /g, '—');
	}

	function slugify(title) {
		return String(title).toLowerCase()
			.normalize('NFD').replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
			.slice(0, 70).replace(/-+$/, '') || 'story';
	}

	// Splits the story text into blocks. A photo block is written as
	// [photo: <address or name> | <description>]; names are looked up in photos.
	function bodyBlocks(text, photos) {
		photos = photos || {};
		return String(text || '').replace(/\r\n/g, '\n').split(/\n\s*\n/).map(function (block) {
			return block.trim();
		}).filter(Boolean).map(function (block) {
			var photo = block.match(/^\[photo:\s*([^|\]]+?)\s*(?:\|\s*([^\]]*?)\s*)?\]$/i);
			if (photo) {
				var src = photos[photo[1]] || (/^https:\/\//.test(photo[1]) ? photo[1] : '');
				return src ? { type: 'img', src: src, alt: photo[2] || '' } : null;
			}
			if (block.charAt(0) === '>') {
				return { type: 'quote', text: block.split('\n').map(function (l) { return l.replace(/^>\s?/, ''); }).join(' ') };
			}
			return { type: 'p', text: block.split('\n').join(' ') };
		}).filter(Boolean);
	}

	/* ---------- Markup ---------- */

	function storyUrl(story) {
		return 'story.html?s=' + encodeURIComponent(story.slug);
	}

	function articleMain(story, photos) {
		var section = SECTIONS[story.section];
		var blocks = (story.cover_url ? [{ type: 'img', src: story.cover_url, alt: story.cover_alt }] : [])
			.concat(bodyBlocks(story.body, photos));
		var body = blocks.map(function (b) {
			if (b.type === 'img') return '<figure class="article-figure"><img src="' + esc(b.src) + '" alt="' + esc(typeset(b.alt)) + '"></figure>';
			if (b.type === 'quote') return '<blockquote>' + esc(typeset(b.text.replace(/\s+/g, ' '))) + '</blockquote>';
			return '<p>' + esc(typeset(b.text.replace(/\s+/g, ' '))) + '</p>';
		}).join('\n');
		return '<header class="article-hero">' +
			'<p class="eyebrow">A journal entry · ' + section.name + '</p>' +
			'<h2 class="article-title">' + esc(typeset(story.title)) + '</h2>' +
			'<p class="article-meta"><span>' + section.name + '</span><span>Published</span></p>' +
			'<a class="back-link" href="' + story.section + '">← Back to ' + section.nav + '</a>' +
			'</header>' +
			'<article class="article prose">' + body + '</article>';
	}

	function cardHtml(story) {
		return '<article class="card">' +
			'<a class="card-link" href="' + storyUrl(story) + '">' +
			'<figure class="card-media"><img src="' + esc(story.cover_url) + '" alt="' + esc(typeset(story.cover_alt)) + '"></figure>' +
			'<div class="card-body">' +
			'<p class="card-meta"><span>' + SECTIONS[story.section].name + '</span><span>Published</span></p>' +
			'<h3 class="card-title">' + esc(typeset(story.title)) + '</h3>' +
			'<p class="card-desc">' + esc(typeset(story.teaser)) + '</p>' +
			'</div></a></article>';
	}

	// Adds cards (newest first) ahead of the page's own cards. The first card
	// is featured, the second wide, and the rest regular.
	function placeCards(stories, countOnPage) {
		if (!stories.length) return;
		var grid = document.querySelector('.card-grid');
		if (!grid) {
			var empty = document.querySelector('.empty-state');
			if (!empty) return;
			grid = document.createElement('div');
			grid.className = 'card-grid';
			empty.replaceWith(grid);
		}
		var holder = document.createElement('div');
		holder.innerHTML = stories.map(cardHtml).join('');
		var added = Array.prototype.slice.call(holder.children);
		grid.prepend.apply(grid, added);
		document.dispatchEvent(new CustomEvent('tbg:content', { detail: { cards: added } }));

		var cards = grid.querySelectorAll(':scope > .card');
		Array.prototype.forEach.call(cards, function (card, n) {
			card.classList.remove('card--featured', 'card--wide');
			if (n === 0) card.classList.add('card--featured');
			if (n === 1) card.classList.add('card--wide');
		});

		var note = document.querySelector('.journal-note');
		if (countOnPage && note) {
			var published = grid.querySelectorAll(':scope > .card:not(.card--soon)').length;
			note.textContent = (NUMBERS[published] || published) + (published === 1 ? ' story' : ' stories') + ' published.';
		}
	}

	/* ---------- Pages ---------- */

	function loadListing() {
		var file = decodeURIComponent(location.pathname.split('/').pop());
		var section = SECTIONS[file] ? file : null;
		var query = client.from('articles')
			.select('slug,title,section,teaser,cover_url,cover_alt,created_at')
			.eq('published', true)
			.order('created_at', { ascending: false });
		if (section) query = query.eq('section', section);
		query.then(function (res) {
			if (res.error) return console.warn('Could not load stories:', res.error.message);
			placeCards(res.data || [], !!section);
		});
	}

	function loadStory() {
		var main = document.getElementById('story');
		var slug = new URLSearchParams(location.search).get('s');
		var notFound = function () {
			main.innerHTML = '<div class="page"><div class="empty-state"><h3>This story could not be found.</h3>' +
				'<p>It may have been moved or hidden. Head back to <a href="index.html">the journal</a> for the latest stories.</p></div></div>';
			document.dispatchEvent(new CustomEvent('tbg:content', { detail: { root: main } }));
		};
		if (!client || !slug) return notFound();
		client.from('articles').select('*').eq('slug', slug).eq('published', true).maybeSingle().then(function (res) {
			if (res.error || !res.data) return notFound();
			var story = res.data;
			main.innerHTML = articleMain(story);
			document.title = typeset(story.title) + ' · The Beautiful Game';
			var desc = document.querySelector('meta[name="description"]');
			if (desc) desc.setAttribute('content', typeset(story.title) + ' ' + typeset(story.teaser));
			var link = document.querySelector('.nav-list a[href="' + story.section + '"]');
			if (link) link.setAttribute('aria-current', 'page');
			document.dispatchEvent(new CustomEvent('tbg:content', { detail: { root: main } }));
		});
	}

	window.TBG = {
		client: client,
		configured: configured,
		SECTIONS: SECTIONS,
		esc: esc,
		typeset: typeset,
		slugify: slugify,
		bodyBlocks: bodyBlocks,
		articleMain: articleMain,
		cardHtml: cardHtml,
		placeCards: placeCards,
		storyUrl: storyUrl
	};

	if (document.getElementById('story')) loadStory();
	else if (client && document.querySelector('.journal')) loadListing();
})();

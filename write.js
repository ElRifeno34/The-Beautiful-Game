/* =========================================================
   The Beautiful Game — writer's desk
   Builds a new article page, adds its card to the home and
   section pages, and publishes everything to GitHub in one commit.
   ========================================================= */

(function () {
	var REPO = { owner: 'ElRifeno34', name: 'The-Beautiful-Game' };
	var TOKEN_KEY = 'tbg-github-token';
	var MAX_PHOTO_WIDTH = 1600;

	var NAV = [
		['Chronicles.html', 'Chronicles'],
		['football-flashbacks.html', 'Flashbacks'],
		['legendary-performances.html', 'Legendary Players'],
		['gaming-corner.html', 'Gaming Corner'],
		['about-me.html', 'About']
	];
	var SECTIONS = {
		'Chronicles.html': { name: 'Chronicles', nav: 'Chronicles' },
		'football-flashbacks.html': { name: 'Football Flashbacks', nav: 'Flashbacks' },
		'legendary-performances.html': { name: 'Legendary Players', nav: 'Legendary Players' },
		'gaming-corner.html': { name: 'Gaming Corner', nav: 'Gaming Corner' }
	};
	var FONTS = 'https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&family=DM+Sans:wght@400;500;700&display=swap';
	var NUMBERS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

	/* ---------- Page templates ---------- */

	function esc(text) {
		return String(text)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	// Curly quotes and dashes, so drafts typed with straight quotes match the other stories
	function typeset(text) {
		return text
			.replace(/(^|[\s(\[—-])"/g, '$1“').replace(/"/g, '”')
			.replace(/(^|[\s(\[—-])'/g, '$1‘').replace(/'/g, '’')
			.replace(/ -- | --|-- /g, '—');
	}

	function slugify(title) {
		return title.toLowerCase()
			.normalize('NFD').replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
			.slice(0, 70).replace(/-+$/, '') || 'story';
	}

	function page(opts) {
		var nav = NAV.map(function (item) {
			return '\t\t\t\t<li><a href="' + item[0] + '"' + (item[0] === opts.active ? ' aria-current="page"' : '') + '>' + item[1] + '</a></li>';
		}).join('\n');
		return [
			'<!DOCTYPE html>',
			'<html lang="en">',
			'\t<head>',
			'\t\t<meta charset="utf-8" />',
			'\t\t<meta name="viewport" content="width=device-width, initial-scale=1.0">',
			'\t\t<meta name="description" content="' + opts.desc + '">',
			'\t\t<link rel="preconnect" href="https://fonts.googleapis.com">',
			'\t\t<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
			'\t\t<link href="' + FONTS + '" rel="stylesheet">',
			'\t\t<link rel="stylesheet" type="text/css" href="site.css">',
			'\t\t<title>' + opts.title + '</title>',
			'\t</head>',
			'\t<body>',
			'\t\t<header class="masthead">',
			'\t\t\t<p class="masthead-kicker">An independent football journal</p>',
			'\t\t\t<h1 class="masthead-title"><a href="index.html">The Beautiful <span>Game</span></a></h1>',
			'\t\t\t<p class="masthead-tagline">For the love of the game — and everything around it.</p>',
			'\t\t</header>',
			'',
			'\t\t<nav class="site-nav" aria-label="Main">',
			'\t\t\t<button class="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="nav-list">',
			'\t\t\t\t<span></span><span></span><span></span>',
			'\t\t\t</button>',
			'\t\t\t<ul class="nav-list" id="nav-list">',
			nav,
			'\t\t\t</ul>',
			'\t\t</nav>',
			'',
			opts.main,
			'',
			'\t\t<footer class="site-footer">',
			'\t\t\t<div class="footer-inner">',
			'\t\t\t\t<div>',
			'\t\t\t\t\t<h2 class="footer-title">Keep the conversation going</h2>',
			'\t\t\t\t\t<p>Have an article idea? Write to <a href="mailto:ayoub.melliani@hotmail.com">ayoub.melliani@hotmail.com</a></p>',
			'\t\t\t\t</div>',
			'\t\t\t\t<p class="footer-copy">2024 © Ayoub M. · The Beautiful Game</p>',
			'\t\t\t</div>',
			'\t\t</footer>',
			'',
			'\t\t<script src="nav.js"></script>',
			'\t</body>',
			'</html>',
			''
		].join('\n');
	}

	// Turns the text box into article blocks. photos maps a photo name to its saved path.
	function bodyBlocks(text, photos) {
		return text.replace(/\r\n/g, '\n').split(/\n\s*\n/).map(function (block) {
			return block.trim();
		}).filter(Boolean).map(function (block) {
			var photo = block.match(/^\[photo:\s*([^|\]]+?)\s*(?:\|\s*([^\]]*?)\s*)?\]$/i);
			if (photo && photos[photo[1]]) {
				return { type: 'img', src: photos[photo[1]], alt: photo[2] || '' };
			}
			if (block.charAt(0) === '>') {
				return { type: 'quote', text: block.split('\n').map(function (l) { return l.replace(/^>\s?/, ''); }).join(' ') };
			}
			return { type: 'p', text: block.split('\n').join(' ') };
		});
	}

	function articleMain(story, blocks) {
		var section = SECTIONS[story.section];
		var body = [{ type: 'img', src: story.coverPath, alt: story.coverAlt }].concat(blocks).map(function (b) {
			if (b.type === 'img') return '\t\t\t\t<figure class="article-figure"><img src="' + esc(b.src) + '" alt="' + esc(typeset(b.alt)) + '"></figure>';
			if (b.type === 'quote') return '\t\t\t\t<blockquote>' + esc(typeset(b.text.replace(/\s+/g, ' '))) + '</blockquote>';
			return '\t\t\t\t<p>' + esc(typeset(b.text.replace(/\s+/g, ' '))) + '</p>';
		}).join('\n');
		return [
			'\t\t<main>',
			'\t\t\t<header class="article-hero">',
			'\t\t\t\t<p class="eyebrow">A journal entry · ' + section.name + '</p>',
			'\t\t\t\t<h2 class="article-title">' + esc(typeset(story.title)) + '</h2>',
			'\t\t\t\t<p class="article-meta"><span>' + section.name + '</span><span>Published</span></p>',
			'\t\t\t\t<a class="back-link" href="' + story.section + '">← Back to ' + section.nav + '</a>',
			'\t\t\t</header>',
			'',
			'\t\t\t<article class="article prose">',
			body,
			'\t\t\t</article>',
			'\t\t</main>'
		].join('\n');
	}

	function articlePage(story, blocks) {
		var title = esc(typeset(story.title));
		return page({
			title: title + ' · The Beautiful Game',
			desc: title + ' ' + esc(typeset(story.teaser).replace(/[“”]/g, '')),
			active: story.section,
			main: articleMain(story, blocks)
		});
	}

	function cardHtml(story) {
		var i = '\t\t\t\t\t\t\t';
		return [
			'\t\t\t\t\t<article class="card">',
			'\t\t\t\t\t\t<a class="card-link" href="' + story.file + '">',
			i + '<figure class="card-media">',
			i + '\t<img src="' + esc(story.coverPath) + '" alt="' + esc(typeset(story.coverAlt)) + '">',
			i + '</figure>',
			i + '<div class="card-body">',
			i + '\t<p class="card-meta"><span>' + SECTIONS[story.section].name + '</span><span>Published</span></p>',
			i + '\t<h3 class="card-title">' + esc(typeset(story.title)) + '</h3>',
			i + '\t<p class="card-desc">' + esc(typeset(story.teaser)) + '</p>',
			i + '</div>',
			'\t\t\t\t\t\t</a>',
			'\t\t\t\t\t</article>'
		].join('\n');
	}

	// Puts the new card first in the page's grid. The newest story is featured,
	// the next one wide, and the rest regular.
	function addCard(html, card, updateCount) {
		var grid = html.match(/(\t\t\t\t<div class="card-grid">\n)([\s\S]*?)(\n\t\t\t\t<\/div>\n\t\t\t<\/section>)/);
		var cards;
		if (grid) {
			cards = grid[2].match(/\t\t\t\t\t<article class="card[^"]*">[\s\S]*?\n\t\t\t\t\t<\/article>/g) || [];
		} else {
			// A section with no stories yet shows a placeholder box instead of a grid
			grid = html.match(/(\t\t\t\t)<div class="empty-state">[\s\S]*?\n\t\t\t\t<\/div>(\n\t\t\t<\/section>)/);
			if (!grid) throw new Error('Could not find where the story cards go on this page.');
			grid = [grid[0], '\t\t\t\t<div class="card-grid">\n', '', '\n\t\t\t\t</div>' + grid[2]];
			cards = [];
		}
		cards.unshift(card);
		cards = cards.map(function (c, n) {
			return c.replace(/<article class="card[^"]*">/, function (tag) {
				var soon = /card--soon/.test(tag) ? ' card--soon' : '';
				var size = n === 0 ? ' card--featured' : n === 1 ? ' card--wide' : '';
				return '<article class="card' + size + soon + '">';
			});
		});
		html = html.replace(grid[0], grid[1] + cards.join('\n\n') + grid[3]);
		if (updateCount) {
			var published = cards.filter(function (c) { return c.indexOf('card--soon') === -1; }).length;
			var note = (NUMBERS[published] || published) + (published === 1 ? ' story' : ' stories') + ' published.';
			html = html.replace(/(<p class="journal-note">)[^<]*(<\/p>)/, '$1' + note + '$2');
		}
		return html;
	}

	/* ---------- GitHub ---------- */

	function api(token, path, options) {
		options = options || {};
		return fetch('https://api.github.com/repos/' + REPO.owner + '/' + REPO.name + path, {
			method: options.method || 'GET',
			headers: {
				'Accept': 'application/vnd.github+json',
				'Authorization': 'Bearer ' + token,
				'X-GitHub-Api-Version': '2022-11-28'
			},
			body: options.body ? JSON.stringify(options.body) : undefined
		}).then(function (res) {
			if (res.status === 404 && options.allow404) return null;
			if (!res.ok) {
				return res.json().catch(function () { return {}; }).then(function (data) {
					var msg = data.message || res.statusText;
					if (res.status === 401) msg = 'GitHub did not accept the token. Check that it is correct and not expired.';
					if (res.status === 403 || res.status === 404) msg = 'The token cannot write to ' + REPO.name + '. Give it access to that repository with Contents: Read and write.';
					throw new Error(msg);
				});
			}
			return res.json();
		});
	}

	function decodeBase64Text(b64) {
		var bin = atob(b64.replace(/\n/g, ''));
		var bytes = new Uint8Array(bin.length);
		for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		return new TextDecoder('utf-8').decode(bytes);
	}

	function blobToBase64(blob) {
		return new Promise(function (resolve, reject) {
			var reader = new FileReader();
			reader.onload = function () { resolve(String(reader.result).split(',')[1]); };
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}

	// Shrinks large phone photos so the repository stays small
	function preparePhoto(file) {
		return createImageBitmap(file).then(function (img) {
			var scale = Math.min(1, MAX_PHOTO_WIDTH / img.width);
			var canvas = document.createElement('canvas');
			canvas.width = Math.round(img.width * scale);
			canvas.height = Math.round(img.height * scale);
			canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
			return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.85); });
		});
	}

	function publish(token, story, files, setStatus) {
		var branch, baseCommit, baseTree;
		var readFile = function (path) {
			return api(token, '/contents/' + encodeURIComponent(path) + '?ref=' + encodeURIComponent(branch)).then(function (data) {
				return decodeBase64Text(data.content);
			});
		};

		setStatus('Connecting to GitHub…');
		return api(token, '').then(function (repo) {
			branch = repo.default_branch;
			return api(token, '/git/ref/heads/' + encodeURIComponent(branch));
		}).then(function (ref) {
			baseCommit = ref.object.sha;
			return api(token, '/git/commits/' + baseCommit);
		}).then(function (commit) {
			baseTree = commit.tree.sha;
			return api(token, '/git/trees/' + baseTree);
		}).then(function (tree) {
			// Pick a file name that is not taken yet
			var taken = {};
			tree.tree.forEach(function (item) { taken[item.path] = true; });
			var slug = slugify(story.title), n = 2, base = slug;
			while (taken[slug + '.html']) slug = base + '-' + n++;
			story.file = slug + '.html';
			story.coverPath = 'pictures/' + slug + '.jpg';
			var photoPaths = {};
			files.extra.forEach(function (p, i) { p.path = 'pictures/' + slug + '-' + (i + 2) + '.jpg'; photoPaths[p.name] = p.path; });
			story.blocks = bodyBlocks(story.body, photoPaths);

			setStatus('Uploading photos…');
			var photos = [{ path: story.coverPath, file: files.cover }].concat(files.extra);
			return Promise.all(photos.map(function (p) {
				return preparePhoto(p.file).then(blobToBase64).then(function (b64) {
					return api(token, '/git/blobs', { method: 'POST', body: { content: b64, encoding: 'base64' } });
				}).then(function (blob) { return { path: p.path, sha: blob.sha }; });
			}));
		}).then(function (photoBlobs) {
			setStatus('Adding the story to the home and section pages…');
			return Promise.all([readFile('index.html'), readFile(story.section)]).then(function (pages) {
				var card = cardHtml(story);
				var textFiles = [
					{ path: story.file, content: articlePage(story, story.blocks) },
					{ path: 'index.html', content: addCard(pages[0], card, false) },
					{ path: story.section, content: addCard(pages[1], card, true) }
				];
				return Promise.all(textFiles.map(function (f) {
					return api(token, '/git/blobs', { method: 'POST', body: { content: f.content, encoding: 'utf-8' } })
						.then(function (blob) { return { path: f.path, sha: blob.sha }; });
				})).then(function (textBlobs) { return photoBlobs.concat(textBlobs); });
			});
		}).then(function (blobs) {
			setStatus('Publishing…');
			return api(token, '/git/trees', {
				method: 'POST',
				body: {
					base_tree: baseTree,
					tree: blobs.map(function (b) { return { path: b.path, mode: '100644', type: 'blob', sha: b.sha }; })
				}
			});
		}).then(function (tree) {
			return api(token, '/git/commits', {
				method: 'POST',
				body: { message: 'Add article: ' + story.title, tree: tree.sha, parents: [baseCommit] }
			});
		}).then(function (commit) {
			return api(token, '/git/refs/heads/' + encodeURIComponent(branch), { method: 'PATCH', body: { sha: commit.sha } });
		}).then(function () {
			return story.file;
		});
	}

	/* ---------- Form ---------- */

	var form = document.getElementById('editor');
	if (!form) {
		// Loaded without the editor (e.g. for testing): expose the builders only
		window.TBGWriter = { articlePage: articlePage, cardHtml: cardHtml, addCard: addCard, bodyBlocks: bodyBlocks, slugify: slugify };
		return;
	}

	var $ = function (id) { return document.getElementById(id); };
	var fields = { token: $('token'), title: $('title'), section: $('section'), teaser: $('teaser'), cover: $('cover'), coverAlt: $('cover-alt'), body: $('body') };
	var extraPhotos = [];
	var statusEl = $('status');
	var previewUrls = {};
	window.TBGWriter = { articlePage: articlePage, cardHtml: cardHtml, addCard: addCard, bodyBlocks: bodyBlocks, slugify: slugify };

	function setStatus(msg, kind) {
		statusEl.textContent = msg;
		statusEl.className = 'editor-status' + (kind ? ' editor-status--' + kind : '');
	}

	try {
		var saved = localStorage.getItem(TOKEN_KEY);
		if (saved) { fields.token.value = saved; $('remember-token').checked = true; }
	} catch (e) { /* storage unavailable */ }

	function objectUrl(key, file) {
		if (previewUrls[key]) URL.revokeObjectURL(previewUrls[key].url);
		previewUrls[key] = file ? { file: file, url: URL.createObjectURL(file) } : null;
		return previewUrls[key] && previewUrls[key].url;
	}

	function renderPreview() {
		var paths = {};
		extraPhotos.forEach(function (p) { paths[p.name] = previewUrls['extra:' + p.name].url; });
		var story = {
			title: fields.title.value.trim() || 'Your title',
			section: fields.section.value,
			teaser: fields.teaser.value,
			coverPath: (previewUrls.cover && previewUrls.cover.url) || '',
			coverAlt: fields.coverAlt.value
		};
		var html = articleMain(story, bodyBlocks(fields.body.value, paths));
		if (!story.coverPath) html = html.replace(/<figure class="article-figure"><img src="" [^>]*><\/figure>\n?/, '');
		$('preview').innerHTML = html;
	}

	['title', 'section', 'teaser', 'coverAlt', 'body'].forEach(function (k) {
		fields[k].addEventListener('input', renderPreview);
	});
	fields.cover.addEventListener('change', function () {
		objectUrl('cover', fields.cover.files[0]);
		renderPreview();
	});

	$('extra-photo').addEventListener('change', function (e) {
		var file = e.target.files[0];
		if (!file) return;
		var name = 'photo ' + (extraPhotos.length + 1);
		extraPhotos.push({ name: name, file: file });
		objectUrl('extra:' + name, file);
		var ta = fields.body;
		var token = '\n\n[photo: ' + name + ' | describe the photo]\n\n';
		var at = ta.selectionStart || ta.value.length;
		ta.value = ta.value.slice(0, at) + token + ta.value.slice(at);
		$('photo-list').textContent = extraPhotos.length + (extraPhotos.length === 1 ? ' extra photo added.' : ' extra photos added.');
		e.target.value = '';
		renderPreview();
	});

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		var missing = Object.keys(fields).filter(function (k) {
			return k === 'cover' ? !fields.cover.files.length : !fields[k].value.trim();
		});
		if (missing.length) {
			setStatus('Fill in every field before publishing.', 'error');
			fields[missing[0]].focus();
			return;
		}
		var token = fields.token.value.trim();
		try {
			if ($('remember-token').checked) localStorage.setItem(TOKEN_KEY, token);
			else localStorage.removeItem(TOKEN_KEY);
		} catch (err) { /* storage unavailable */ }

		var story = {
			title: fields.title.value.trim(),
			section: fields.section.value,
			teaser: fields.teaser.value.trim(),
			coverAlt: fields.coverAlt.value.trim(),
			body: fields.body.value
		};
		$('publish').disabled = true;
		publish(token, story, { cover: fields.cover.files[0], extra: extraPhotos }, setStatus).then(function (file) {
			var url = new URL(file, location.href).href;
			statusEl.className = 'editor-status editor-status--ok';
			statusEl.innerHTML = 'Published. The story will be live in about a minute at <a href="' + url + '">' + esc(file) + '</a>.';
		}).catch(function (err) {
			setStatus('Not published: ' + err.message, 'error');
		}).then(function () {
			$('publish').disabled = false;
		});
	});

	renderPreview();
})();

/* =========================================================
   The Beautiful Game — writer's desk
   Sign in with Supabase, write or edit a story, format it,
   upload its photos and publish it. Uses the shared helpers
   from stories.js.
   ========================================================= */

(function () {
	var TBG = window.TBG;
	var sb = TBG.client;
	var BUCKET = 'article-photos';
	var MAX_PHOTO_WIDTH = 1600;

	var $ = function (id) { return document.getElementById(id); };
	var views = ['not-configured', 'sign-in', 'desk'];

	function show(view) {
		views.forEach(function (v) { $(v).hidden = v !== view; });
		$('preview-wrap').hidden = view !== 'desk';
	}

	function setStatus(el, msg, kind) {
		el.textContent = msg;
		el.className = 'editor-status' + (kind ? ' editor-status--' + kind : '');
	}

	if (!sb) {
		show('not-configured');
		return;
	}

	/* ---------- Signing in ---------- */

	function enterDesk(session) {
		if (!session) return show('sign-in');
		sb.rpc('is_author').then(function (res) {
			if (res.error || !res.data) {
				sb.auth.signOut();
				show('sign-in');
				setStatus($('sign-in-status'), 'This account is not allowed to publish.', 'error');
				return;
			}
			$('user-email').textContent = session.user.email;
			show('desk');
			TBG.checkAuthor();
			loadMyStories();
			renderPreview();
			var slug = new URLSearchParams(location.search).get('edit');
			if (slug) startEditing({ slug: slug });
		});
	}

	sb.auth.getSession().then(function (res) { enterDesk(res.data.session); });

	$('sign-in-form').addEventListener('submit', function (e) {
		e.preventDefault();
		var status = $('sign-in-status');
		$('sign-in-button').disabled = true;
		setStatus(status, 'Signing in…');
		sb.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value }).then(function (res) {
			$('sign-in-button').disabled = false;
			if (res.error) return setStatus(status, 'Wrong email or password.', 'error');
			$('password').value = '';
			setStatus(status, '');
			enterDesk(res.data.session);
		});
	});

	$('sign-out').addEventListener('click', function () {
		sb.auth.signOut().then(function () {
			var write = document.querySelector('.nav-write');
			if (write) write.remove();
			stopEditing();
			show('sign-in');
		});
	});

	/* ---------- Your stories ---------- */

	function loadMyStories() {
		var list = $('my-stories');
		sb.from('articles').select('id,slug,title,section,published,created_at').order('created_at', { ascending: false }).then(function (res) {
			if (res.error) {
				list.innerHTML = '<li class="editor-help">Could not load your stories.</li>';
				return;
			}
			if (!res.data.length) {
				list.innerHTML = '<li class="editor-help">Stories you publish here will appear in this list.</li>';
				return;
			}
			list.innerHTML = res.data.map(function (s) {
				var date = new Date(s.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
				return '<li class="my-story' + (s.published ? '' : ' my-story--hidden') + '" data-id="' + s.id + '">' +
					'<div><a href="' + TBG.storyUrl(s) + '">' + TBG.esc(TBG.typeset(s.title)) + '</a>' +
					'<span class="my-story-meta">' + TBG.SECTIONS[s.section].name + ' · ' + date + (s.published ? '' : ' · Hidden') + '</span></div>' +
					'<div class="my-story-actions">' +
					'<button type="button" class="link-button" data-action="edit">Edit</button>' +
					'<button type="button" class="link-button" data-action="toggle" data-published="' + s.published + '">' + (s.published ? 'Hide' : 'Show') + '</button>' +
					'<button type="button" class="link-button link-button--danger" data-action="delete">Delete</button>' +
					'</div></li>';
			}).join('');
		});
	}

	$('my-stories').addEventListener('click', function (e) {
		var btn = e.target.closest('button[data-action]');
		if (!btn) return;
		var id = btn.closest('li').getAttribute('data-id');
		var title = btn.closest('li').querySelector('a').textContent;
		var action = btn.getAttribute('data-action');
		if (action === 'edit') return startEditing({ id: id });

		var request;
		if (action === 'toggle') {
			request = sb.from('articles').update({ published: btn.getAttribute('data-published') !== 'true' }).eq('id', id);
		} else {
			if (!window.confirm('Delete “' + title + '” for good? This cannot be undone.')) return;
			request = sb.from('articles').delete().eq('id', id);
		}
		btn.disabled = true;
		request.then(function (res) {
			if (res.error) {
				btn.disabled = false;
				return window.alert('That did not work: ' + res.error.message);
			}
			if (editing && editing.id === id && action === 'delete') stopEditing();
			loadMyStories();
		});
	});

	/* ---------- Writing ---------- */

	var fields = { title: $('title'), section: $('section'), teaser: $('teaser'), cover: $('cover'), coverAlt: $('cover-alt'), body: $('body') };
	var extraPhotos = [];
	var previewUrls = {};
	var statusEl = $('status');
	var editing = null; // the story being edited, or null for a new one

	function objectUrl(key, file) {
		if (previewUrls[key]) URL.revokeObjectURL(previewUrls[key]);
		previewUrls[key] = file ? URL.createObjectURL(file) : null;
	}

	function renderPreview() {
		var photos = {};
		extraPhotos.forEach(function (p) { photos[p.name] = previewUrls['extra:' + p.name]; });
		$('preview').innerHTML = TBG.articleMain({
			title: fields.title.value.trim() || 'Your title',
			section: fields.section.value,
			cover_url: previewUrls.cover || (editing && editing.cover_url) || '',
			cover_alt: fields.coverAlt.value,
			body: fields.body.value
		}, photos);
	}

	['title', 'section', 'teaser', 'coverAlt', 'body'].forEach(function (k) {
		fields[k].addEventListener('input', renderPreview);
	});
	fields.cover.addEventListener('change', function () {
		objectUrl('cover', fields.cover.files[0]);
		renderPreview();
	});

	function insertAtCursor(text) {
		var ta = fields.body;
		var at = ta.selectionStart || ta.value.length;
		ta.value = ta.value.slice(0, at) + text + ta.value.slice(at);
		ta.selectionStart = ta.selectionEnd = at + text.length;
	}

	$('extra-photo').addEventListener('change', function (e) {
		var file = e.target.files[0];
		if (!file) return;
		var name = 'photo ' + (extraPhotos.length + 1);
		extraPhotos.push({ name: name, file: file });
		objectUrl('extra:' + name, file);
		insertAtCursor('\n\n[photo: ' + name + ' | describe the photo]\n\n');
		$('photo-list').textContent = extraPhotos.length + (extraPhotos.length === 1 ? ' extra photo added.' : ' extra photos added.');
		e.target.value = '';
		renderPreview();
	});

	/* ---------- Formatting toolbar ---------- */

	function wrapSelection(before, after, placeholder) {
		var ta = fields.body;
		var start = ta.selectionStart, end = ta.selectionEnd;
		var chosen = ta.value.slice(start, end) || placeholder;
		ta.value = ta.value.slice(0, start) + before + chosen + after + ta.value.slice(end);
		ta.focus();
		ta.selectionStart = start + before.length;
		ta.selectionEnd = start + before.length + chosen.length;
	}

	// Puts a mark at the start of the paragraph the cursor is in
	function markParagraph(mark) {
		var ta = fields.body;
		var start = ta.value.lastIndexOf('\n\n', ta.selectionStart - 1);
		start = start === -1 ? 0 : start + 2;
		var rest = ta.value.slice(start).replace(/^(## |> )/, '');
		ta.value = ta.value.slice(0, start) + mark + rest;
		ta.focus();
		ta.selectionStart = ta.selectionEnd = start + mark.length;
	}

	document.querySelector('.editor-toolbar').addEventListener('click', function (e) {
		var btn = e.target.closest('button[data-format]');
		if (!btn) return;
		var format = btn.getAttribute('data-format');
		if (format === 'bold') wrapSelection('**', '**', 'bold words');
		if (format === 'italic') wrapSelection('*', '*', 'italic words');
		if (format === 'heading') markParagraph('## ');
		if (format === 'quote') markParagraph('> ');
		if (format === 'link') {
			var url = window.prompt('Link address (starting with https://)', 'https://');
			if (!url || !/^https?:\/\/\S+$/.test(url)) return;
			wrapSelection('[', '](' + url + ')', 'link text');
		}
		renderPreview();
	});

	/* ---------- Editing an existing story ---------- */

	function startEditing(match) {
		var query = sb.from('articles').select('*');
		query = match.id ? query.eq('id', match.id) : query.eq('slug', match.slug);
		query.maybeSingle().then(function (res) {
			if (res.error || !res.data) return setStatus(statusEl, 'That story could not be found.', 'error');
			resetForm();
			editing = res.data;
			fields.title.value = editing.title;
			fields.section.value = editing.section;
			fields.teaser.value = editing.teaser;
			fields.coverAlt.value = editing.cover_alt;
			fields.body.value = editing.body;
			$('cover-current').hidden = false;
			$('desk-eyebrow').textContent = 'Editing a published story';
			$('desk-title').textContent = 'Edit the story.';
			$('publish').textContent = 'Save changes';
			$('cancel-edit').hidden = false;
			setStatus(statusEl, '');
			renderPreview();
			$('editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	}

	function stopEditing() {
		editing = null;
		$('cover-current').hidden = true;
		$('desk-eyebrow').textContent = 'New journal entry';
		$('desk-title').textContent = 'Write a story.';
		$('publish').textContent = 'Publish story';
		$('cancel-edit').hidden = true;
		if (/[?&]edit=/.test(location.search)) history.replaceState(null, '', location.pathname);
		resetForm();
	}

	$('cancel-edit').addEventListener('click', function () {
		stopEditing();
		setStatus(statusEl, '');
	});

	/* ---------- Saving ---------- */

	// Shrinks large phone photos before uploading
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

	function uploadPhoto(path, file) {
		return preparePhoto(file).then(function (blob) {
			return sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
		}).then(function (res) {
			if (res.error) throw new Error('A photo could not be uploaded (' + res.error.message + ').');
			return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
		});
	}

	// Finds a web address for the story that is not taken yet
	function freeSlug(title) {
		var base = TBG.slugify(title);
		return sb.from('articles').select('slug').like('slug', base + '%').then(function (res) {
			if (res.error) throw new Error(res.error.message);
			var taken = {};
			res.data.forEach(function (r) { taken[r.slug] = true; });
			var slug = base, n = 2;
			while (taken[slug]) slug = base + '-' + n++;
			return slug;
		});
	}

	function resetForm() {
		$('editor').reset();
		extraPhotos = [];
		Object.keys(previewUrls).forEach(function (k) { objectUrl(k, null); });
		$('photo-list').textContent = '';
		renderPreview();
	}

	$('editor').addEventListener('submit', function (e) {
		e.preventDefault();
		var missing = Object.keys(fields).filter(function (k) {
			if (k === 'cover') return !editing && !fields.cover.files.length;
			return !fields[k].value.trim();
		});
		if (missing.length) {
			setStatus(statusEl, 'Fill in every field before publishing.', 'error');
			fields[missing[0]].focus();
			return;
		}

		var wasEditing = editing;
		var story = {
			title: fields.title.value.trim(),
			section: fields.section.value,
			teaser: fields.teaser.value.trim(),
			cover_alt: fields.coverAlt.value.trim(),
			body: fields.body.value.trim()
		};
		var newCover = fields.cover.files[0];
		$('publish').disabled = true;
		setStatus(statusEl, 'Uploading photos…');

		// An edited story keeps its web address so existing links still work
		var slugReady = wasEditing ? Promise.resolve(wasEditing.slug) : freeSlug(story.title);
		slugReady.then(function (slug) {
			story.slug = slug;
			var folder = slug + '-' + Date.now();
			var uploads = [newCover ? uploadPhoto(folder + '/cover.jpg', newCover) : Promise.resolve(wasEditing.cover_url)];
			return Promise.all(uploads.concat(extraPhotos.map(function (p, i) {
				return uploadPhoto(folder + '/photo-' + (i + 1) + '.jpg', p.file).then(function (url) { p.url = url; });
			})));
		}).then(function (urls) {
			story.cover_url = urls[0];
			// Swap the photo names in the text for their web addresses
			extraPhotos.forEach(function (p) {
				story.body = story.body.split('[photo: ' + p.name + ' ').join('[photo: ' + p.url + ' ')
					.split('[photo: ' + p.name + ']').join('[photo: ' + p.url + ']');
			});
			setStatus(statusEl, wasEditing ? 'Saving…' : 'Publishing…');
			return wasEditing
				? sb.from('articles').update(story).eq('id', wasEditing.id)
				: sb.from('articles').insert(story);
		}).then(function (res) {
			if (res.error) throw new Error(res.error.message);
			var url = TBG.storyUrl(story);
			if (wasEditing) stopEditing(); else resetForm();
			statusEl.className = 'editor-status editor-status--ok';
			statusEl.innerHTML = (wasEditing ? 'Saved. ' : 'Published. ') + '<a href="' + url + '">Read “' + TBG.esc(TBG.typeset(story.title)) + '”</a>';
			loadMyStories();
		}).catch(function (err) {
			setStatus(statusEl, (wasEditing ? 'Not saved: ' : 'Not published: ') + err.message, 'error');
		}).then(function () {
			$('publish').disabled = false;
		});
	});
})();

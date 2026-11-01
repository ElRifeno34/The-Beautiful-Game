(function () {
	var toggle = document.querySelector('.nav-toggle');
	var list = document.getElementById('nav-list');
	toggle.addEventListener('click', function () {
		var open = list.classList.toggle('is-open');
		toggle.setAttribute('aria-expanded', open);
		toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
	});
})();

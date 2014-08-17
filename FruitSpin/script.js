(function (win, doc, body) {
	/**
	 * Helper for calling callbacks
	 * @param callback
	 * @param err
	 */
	function try_callback(callback, err /*, response */) {
		var response = arguments[2];

		try {
			setTimeout(function () {
				callback(err, response);
			}, 0);
		} catch (e) {}
	}

	/**
	 * Preload images in base_path dir
	 * @param base_path
	 * @param images
	 * @param callback (err, [img1, img2,.. ])
	 */
	function preload_images(base_path, images, callback) {
		if (images.length === 0) {
			try_callback(callback, 'no images');
			return;
		}

		var times = 0,
			image_objs = [];

		function hold_horses(e) {
			if (e.type === 'error') {
				try_callback(callback, e);
			} else if (++times === images.length) {
				try_callback(callback, null, image_objs);
			}
		}

		images.forEach(function (v) {
			var img = new Image();

			img.addEventListener('error', hold_horses);
			img.addEventListener('load', hold_horses);
			image_objs.push(img);

			// not using dataset because of ie
			img.setAttribute('data-name', v);

			img.src = base_path + v;
		});
	}

	/**
	 * Loads json file
	 * @param url
	 * @param callback (err, obj)
	 */
	function request_json (url, callback) {
		var xhq = new XMLHttpRequest();

		xhq.addEventListener('load', function () {
			try {
				try_callback(callback, null, JSON.parse(xhq.responseText));
			} catch (e) {
				try_callback(callback, 'invalid');
			}
		}, false);

		xhq.addEventListener('error', function () {
			try_callback(callback, 'error')
		}, false);

		xhq.addEventListener('abort', function () {
			try_callback(callback, 'abort')
		}, false);

		xhq.open('get', url, true);
		xhq.send();
	}

	/**
	 * Run callback when DOM is ready
	 * @param callback
	 */
	function when_dom_ready(callback) {
		if (document.readyState === 'complete' ||
			document.readyState === 'interactive') {
			try_callback(callback, null);
		} else {
			document.addEventListener("DOMContentLoaded", function () {
				try_callback(callback, null);
			});
		}
	}

	/**
	 * Fill spinner and selector, bind events. Synchronous
	 * @param names
	 * @param images
	 */
	function build_page(names, images) {
		var spinner = doc.getElementById('spinner'),
			selector = doc.getElementById('selector'),
			statuses = doc.getElementById('statuses'),
			play_button = doc.getElementById('play-button');

		images.forEach(function (v, i) {
			spinner.appendChild(v);

			var option = doc.createElement('option');
			option.text = names[i];
			option.value = v.getAttribute('data-name');

			selector.add(option);
		});

		// display first image (default)
		images[0].classList.add('shown');

		var delay_timeout = null;

		function check_result(image) {
			var result = image.getAttribute('data-name') === selector.value;

			set_state(result ? 'win' : 'fail');

			// ? delayed state change
			//delay_timeout = setTimeout(function () {
			//	set_state('choose');
			//}, 10000);
		}

		function set_status(status) {
			statuses.querySelector('div.shown').classList.remove('shown');
			var new_status = statuses.querySelector('#status-' + status);

			new_status.classList.add('shown');

			if (status == 'win' || status == 'fail') {
				new_status.classList.remove('animated');
				// ! required to reflow element so we can rerun animation
				new_status.offsetWidth = new_status.offsetWidth;
				new_status.classList.add('animated');
			}
		}

		function set_state(state) {
			set_status(state);

			switch (state) {
				case 'choose':
				case 'win':
				case 'fail':
					selector.disabled = false;
					play_button.disabled = false;
					break;
				case 'spin':
					clearTimeout(delay_timeout);
					selector.disabled = true;
					play_button.disabled = true;
					break;
			}
		}

		play_button.addEventListener('click', function () {
			set_state('spin');

			var current_visible = spinner.querySelector('img.shown'),
				time = 1000 * (Math.random() * 3 + 2), // in ms
				spent = 0,
				round_time = 100;

			// spinning images
			setTimeout(function spin_round() {
				current_visible.classList.remove('shown');
				current_visible = current_visible.nextSibling || spinner.firstChild;
				current_visible.classList.add('shown');

				spent += round_time;

				if (spent > time) {
					check_result(current_visible);
					return;
				}

				setTimeout(spin_round, round_time += 100);
			}, round_time);
		});

		play_button.disabled = false;
	}
	///////////// START

	request_json('/files.json', function (error, images_hash) {
		if (error) {
			// @TODO handle error
			return;
		}

		var names = Object.keys(images_hash),
			values = names.map(function (k) { return images_hash[k]; });

		preload_images('/img/', values, function (err, images) {
			if (error) {
				// @TODO handle error
				return;
			}

			when_dom_ready(function () {
				build_page(names, images);
			});
		});
	});
})(window, document, document.body);

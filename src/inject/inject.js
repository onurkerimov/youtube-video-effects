/*
 * Copyright 2019 Onur Kerimov
 * Released under the MIT license
 */

"use strict";

chrome.extension.sendMessage({}, function (response) {
	var readyStateCheckInterval = setInterval(function () {
		if (document.readyState === "complete") {
			clearInterval(readyStateCheckInterval);
			// ----------------------------------------------------------
			// This part of the script triggers when page is done loading
			main()
			// ----------------------------------------------------------
		}
	}, 10);
})

// # Main Flags
let enabled = false // Effect is disabled by default
let warningState = false // Warning is false by default

// # DOM Elements
let video, videoParent // Video element and its parent
let canvas, context  // WebGL canvas and the rendering context
let texture // Texture object that GLFX uses
let menu // default YouTube menu, under the video
let button // 'FX' button near the three dots
let button_enabledColor = '#33b033'
let button_disabledColor = '#909090'
let button_hoverColor = '#333333'
let FX_panel // FX panel (opens below the button)
let FX_panel_wrapper // FX panel wrapper
let footnote, warning // small things

// # Dimensions
let w, h, w_dpi, h_dpi, dpi = devicePixelRatio
let video_x, video_y

// # Functions
// Main filter function. Empty, fulfilled dynamically
let filterUpdateFunction = () => { }
// Sets the warning, used as listener on pause or play
let warnAndDisable = () => {
	if (enabled) {
		destroy()
		button.style.color = button_disabledColor
		insertWarning()
	}
}

// # First things that are going to be done:
// Appending the FX button
// Check location whether to give a warning
// Get video and videoParent
// Inject CSS Rules
// Add Resize Listener
function main() {
	// Try appending the 'FX' button continuously
	{
		setInterval(() => {
			let el = document.querySelector('#yt-fx-button')
			if (!el) tryAppendingButton()
		}, 500)
	}

	// Check the location continuously, if changed, disable the effect with a message
	{
		let prevUrl
		setInterval(() => {
			let url = window.location.search
			if (enabled && prevUrl !== url) {
				destroy()
				button.style.color = button_disabledColor
				insertWarning()
			}
			prevUrl = url
		}, 100)
	}

	// Get video element. If missing, repeatedly try finding it
	{
		let interval = setInterval(() => {
			video = document.querySelector('video')
			if (video) {
				clearInterval(interval)
				parent = video.parentNode
			}
		}, 100)
	}

	// Inject CSS Rules
	injectCSS()

	// Resize Listener
	{
		let to
		window.addEventListener('resize', () => {
			if (to !== undefined) clearTimeout(to)
			to = setTimeout(resizeAfter, 600)
		})
		function resizeAfter() {
			video_x = video.clientLeft
			video_y = video.clientTop
			if (enabled) {
				destroy()
				init()
			}
		}
	}
}

function injectCSS() {
	let css = `
	.html5-video-container {
		width: 100%;
		height: 100%;
	}

	.html5-video-container > canvas {
		position: absolute;
		top: 50%;
		transform: translate(0, -50%);
	}

	ytd-sentiment-bar-renderer {
		padding-bottom: 0 !important;
	}

	#yt-fx-panel-wrapper {
		border-bottom: 1px solid #e5e5e5;
		padding-bottom: 4px;
	}

	#yt-fx-panel {
		display: flex;
		user-select: none;
		padding: 3px;
	}

	#yt-fx-filters {
		margin: 5px;
		margin-right: 15px;
	}

	.yt-fx-slider-wrapper {
		display: inline-block;
	}

	.yt-fx-name {
		float: left;
		line-height: 32px;
		height: 32px;
    	text-align: right;
	}

	.yt-fx-warning {
		background: #ffd;
		font-size: 12px;
		border-bottom: 1px solid #00000021;
		padding-top: 3px;
		padding-bottom: 2px;
	}

	.yt-fx-reset {
		font-weight: bold;
		color: black;
		text-decoration: underline;
		cursor: pointer;
	}

	input[type=range] {
		font-size: 12px;
		-webkit-appearance: none;
		width: 180px;
		outline: none;
		border-radius: 0.3em;
		background: linear-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0));
		box-shadow: 0 0.07em 0.1em -0.1em rgba(255, 255, 255, 0.9) inset;
		padding: 0.8em;
		margin: 0.08em;
	  }
	  
	  input[type=range]::-webkit-slider-thumb {
		-webkit-appearance: none;
		margin-top: -0.5em;
		border: none;
		cursor: pointer;
		width: 0.6em;
		height: 1.6em;
		border-radius: 0.3em;
		background: linear-gradient(white 10%, rgba(255, 255, 255, 0.3));
		box-shadow: 0 0.1em 0.15em -0.05em rgba(255, 255, 255, 0.9) inset, 0 0.2em 0.8em -0.2em rgba(0, 0, 0, 0.9);
	  }
	  
	  input[type=range]::-webkit-slider-runnable-track {
		border-radius: 0.2em;
		height: 0.5em;
		background: rgba(0, 0, 0, 0.04);
		box-shadow: inset 0 0.1em 0.2em rgba(0, 0, 0, 0.5);
		cursor: pointer;
		transition: all 0.3s;
	  }
	  
	  input[type=range]::-webkit-slider-thumb:hover {
		background: linear-gradient(white 10%, rgba(255, 255, 255, 0.8));
	  }
	  
	  input[type=range]::-webkit-slider-runnable-track:hover {
		background: rgba(0, 0, 0, 0.1);
	  }`

	var style = document.createElement("style")
	style.appendChild(document.createTextNode(css))
	document.head.appendChild(style)
}

// Main init function
function init() {
	if (enabled === false) {
		enabled = true

		// Get all both player and video dimensions, also generate _dpi versions
		w = video.clientWidth
		h = video.clientHeight
		video_x = video.clientLeft
		video_y = video.clientTop
		w_dpi = w * dpi
		h_dpi = h * dpi

		// Create and append canvas
		canvas = fx.canvas()

		// Set canvas dimensions accordingly
		canvas.style.width = w + 'px'
		canvas.style.height = h + 'px'
		canvas.width = w_dpi
		canvas.height = h_dpi
		parent.appendChild(canvas)
		context = canvas.getContext('2d')

		// Hide original video
		video.style.opacity = 0
		video.style.display = 'none'

		// Add texture once, then initiate animationFrames
		texture = canvas.texture(video)
		requestAnimationFrame(draw)

		// Listeners
		video.addEventListener('pause', warnAndDisable)
		video.addEventListener('play', warnAndDisable)

	}
}

// Main destroy function
function destroy() {
	if (enabled === true) {
		// Prepare for re-initialization, also prevent heavy requestAnimationFrame task
		enabled = false
		// remove canvas
		parent.removeChild(canvas)
		// Show original video, by removing the hidden status
		video.style.opacity = null
		video.style.display = null
		
		// Remove listeners
		video.removeEventListener('pause', warnAndDisable)
		video.removeEventListener('play', warnAndDisable)
	}
}

// Draw loop, runs 60 times per second, ideally.
function draw() {
	try {
		texture.loadContentsOf(video)
		filterUpdateFunction()
		if (enabled) { requestAnimationFrame(draw) }

	} catch (err) {
		destroy()
		init()
	}
}

function tryAppendingButton() {
	let interval = setInterval(() => {
		menu = document.querySelector('#menu-container #menu')
		if (menu) {
			clearInterval(interval)
			appendButton()
		}
	}, 100)
}

// Appends the 'FX' button, adds listeners to it.
function appendButton() {

	menu.style.left = '-32px'

	button = document.createElement('DIV')

	button.id = 'yt-fx-button'
	button.style.position = 'absolute'
	button.style.top = '10px'
	button.style.right = '-24px'
	button.style.fontSize = '13px'
	button.style.fontFamily = 'Roboto'
	button.style.fontWeight = '500'
	button.style.color = button_disabledColor
	button.style.cursor = 'pointer'
	button.innerHTML = 'FX'

	menu.appendChild(button)

	button.addEventListener('mouseenter', () => {
		button.style.color = button_hoverColor
	})

	button.addEventListener('mouseleave', () => {
		if (enabled) {
			button.style.color = button_enabledColor
		} else {
			button.style.color = button_disabledColor
		}
	})

	button.addEventListener('click', () => {
		if (enabled && !warningState) {
			destroy()
			button.style.color = button_disabledColor
			removePanel()
		} else if (!enabled && !warningState) {
			init()
			button.style.color = button_enabledColor
			appendPanel()
		} else if (warningState) {
			destroy()
			warningState = false
			removeWarning()
			removePanel()
		}
	})
}

// Appends FX control panel
function appendPanel() {
	let meta = document.querySelector('#meta-contents')
	console.log(meta)

	FX_panel_wrapper = document.createElement('DIV'), FX_panel_wrapper.id = 'yt-fx-panel-wrapper'
	FX_panel = document.createElement('DIV'), FX_panel.id = 'yt-fx-panel'
	footnote = document.createElement('DIV'), footnote.id = 'yt-fx-footnote'

	// Create the filter selector
	var html = '';
	for (var category in filters) {
		var list = filters[category];
		html += '<option disabled="true">---- ' + category + ' -----</option>';
		for (var i = 0; i < list.length; i++) {
			html += '<option>' + list[i].name + '</option>';
		}
	}

	FX_panel.innerHTML = '<div class="yt-fx-name">Effect</div><select id="yt-fx-filters">' +
		html + '</select><div id="yt-fx-selected"></div>'

	// Call use() on the currently selected filter when the selection is changed
	let select = FX_panel.querySelector('#yt-fx-filters')
	let FX_selected = FX_panel.querySelector('#yt-fx-selected')

	function switchToFilter(index) {
		if (select.selectedIndex != index) select.selectedIndex = index;
		for (var category in filters) {
			index--;
			var list = filters[category];
			for (var i = 0; i < list.length; i++) {
				if (index-- == 0) list[i].use(FX_selected);
			}
		}
	}
	select.addEventListener('change', function () {
		switchToFilter(select.selectedIndex);
	});
	switchToFilter(1);


	meta.parentNode.insertBefore(FX_panel_wrapper, meta)
	FX_panel_wrapper.appendChild(FX_panel)
	FX_panel_wrapper.appendChild(footnote)
}

// Removes FX control panel
function removePanel() {
	let parent = FX_panel_wrapper.parentNode
	if (parent) parent.removeChild(FX_panel_wrapper)
}

// Removes FX control panel slowly
function insertWarning() {
	if (!warningState) {
		warningState = true
		FX_panel_wrapper.style.background = '#ff000017'
		warning = document.createElement('div')
		warning.className = 'yt-fx-warning'
		warning.innerHTML = 'The effect is disabled because the video is played, paused or stopped buffering. '

		let reset = document.createElement('a')
		reset.className = 'yt-fx-reset'
		reset.innerHTML = 'Click to re-enable'
		reset.addEventListener('click', () => {
			warningState = false
			FX_panel_wrapper.style.background = null
			removeWarning()
			init()
			button.style.color = button_enabledColor
		})

		warning.appendChild(reset)
		FX_panel_wrapper.parentNode.insertBefore(warning, FX_panel_wrapper)
	}
}

function removeWarning() {
	FX_panel_wrapper.parentNode.removeChild(warning)
}
/*
 * Most of the following code is taken from glfx.js demo on http://evanw.github.io/glfx.js/demo/ 
 */

 function createElement(str) {
    let el = document.createElement('div')
    el.innerHTML = str
    return el.children[0]
}

let previousListener

class Filter {
    constructor(name, func, init, update) {
        this.name = name;
        this.func = func;
        this.update = update;
        this.sliders = [];
        this.nubs = [];
        init.call(this);
    }

    addNub(name, x, y) {
        this.nubs.push({ name, x, y });
    }

    addSlider(name, label, min, max, value, step) {
        this.sliders.push({ name, label, min, max, value, step });
    }

    use(FX_selected) {

        FX_selected.innerHTML = ''
        footnote.innerHTML = ''

        if(this.nubs.length > 0) {
            footnote.innerHTML = '<b>This effect lets you use your mouse.</b> <br/>'
        }
        for (var i = 0; i < this.nubs.length; i++) {
            let nub = this.nubs[i];
            // Set default values as the initial
            this[nub.name] = {
                x: nub.x,
                y: nub.y
            }
        }

        // Add a row for each slider
        for (var i = 0; i < this.sliders.length; i++) {
            let slider = this.sliders[i];

            let name = createElement(`<div class="yt-fx-name">${slider.label}</div>`)
            let sliderElem = createElement(`<input
                type="range" 
                name="${slider.name}" 
                min="${slider.min}" 
                max="${slider.max}" 
                step="${slider.step}" 
                value="${slider.value}" 
            ></input>`)

            // Set default values as the initial
            this[slider.name] = slider.value
            // Get values
            let self = this
            sliderElem.addEventListener('input', function() {
                self[this.name] = parseFloat(this.value)
            })

            let listener = (e) => {
                self.center = {}
                self.center.x = (e.clientX - video_x) * dpi
                self.center.y = (e.clientY - video_y) * dpi
            }

            window.addEventListener('mousemove', listener)
            if(previousListener) window.removeEventListener('mousemove', previousListener)
            previousListener = listener

            let sliderWrapper =  createElement(`<div class="yt-fx-slider-wrapper"></div>`)
            sliderWrapper.appendChild(name)
            sliderWrapper.appendChild(sliderElem)
            FX_selected.appendChild(sliderWrapper)
        }

        // Provide a link to the documentation
        footnote.innerHTML += `See the documentation for 
        <a  target="_blank" href="http://evanw.github.io/glfx.js/docs/#${this.func}">${this.func}()</a>
         for more information.`
        
        FX_panel_wrapper.appendChild(footnote)

        // Finally provide the ypdate function
        filterUpdateFunction = this.update.bind(this)
    }
}

let filters = {
    'Adjust': [
        new Filter('Brightness / Contrast', 'brightnessContrast', function () {
            this.addSlider('brightness', 'Brightness', -1, 1, 0, 0.01);
            this.addSlider('contrast', 'Contrast', -1, 1, 1, 0.01);
        }, function () {
            canvas.draw(texture).brightnessContrast(this.brightness, this.contrast).update()
        }),

        new Filter('Hue / Saturation', 'hueSaturation', function () {
            this.addSlider('hue', 'Hue', -1, 1, 0, 0.01);
            this.addSlider('saturation', 'Saturation', -1, 1, 0, 0.01);
        }, function () {
            canvas.draw(texture).hueSaturation(this.hue, this.saturation).update()
        }),

        new Filter('Vibrance', 'vibrance', function () {
            this.addSlider('amount', 'Amount', -1, 1, 0.5, 0.01);
        }, function () {
            canvas.draw(texture).vibrance(this.amount).update()
        }),

        new Filter('Denoise', 'denoise', function () {
            this.addSlider('exponent', 'Exponent', 0, 50, 20, 1);
        }, function () {
            canvas.draw(texture).denoise(this.exponent).update()
        }),

        new Filter('Unsharp Mask', 'unsharpMask', function () {
            this.addSlider('radius', 'Radius', 0, 200, 20, 1);
            this.addSlider('strength', 'Strength', 0, 5, 2, 0.01);
        }, function () {
            canvas.draw(texture).unsharpMask(this.radius, this.strength).update()
        }),

        new Filter('Noise', 'noise', function () {
            this.addSlider('amount', 'Amount', 0, 1, 0.5, 0.01);
        }, function () {
            canvas.draw(texture).noise(this.amount).update()
        }),

        new Filter('Sepia', 'sepia', function () {
            this.addSlider('amount', 'Amount', 0, 1, 1, 0.01);
        }, function () {
            canvas.draw(texture).sepia(this.amount).update()
        }),

        new Filter('Vignette', 'vignette', function () {
            this.addSlider('size', 'Size', 0, 1, 0.5, 0.01);
            this.addSlider('amount', 'Amount', 0, 1, 0.5, 0.01);
        }, function () {
            canvas.draw(texture).vignette(this.size, this.amount).update()
        })
    ],
    'Blur': [
        new Filter('Zoom Blur', 'zoomBlur', function () {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('strength', 'Strength', 0, 1, 0.3, 0.01);
        }, function () {
            canvas.draw(texture).zoomBlur(this.center.x, this.center.y, this.strength).update()
        }),

        new Filter('Triangle Blur', 'triangleBlur', function () {
            this.addSlider('radius', 'Radius', 0, 200, 50, 1);
        }, function () {
            canvas.draw(texture).triangleBlur(this.radius).update()
        }),

        /*new Filter('Tilt Shift', 'tiltShift', function () {
            this.addNub('start', 0.15, 0.75);
            this.addNub('end', 0.75, 0.6);
            this.addSlider('blurRadius', 'Blur Radius', 0, 50, 15, 1);
            this.addSlider('gradientRadius', 'Gradient Radius', 0, 400, 200, 1);
        }, function () {
            canvas.draw(texture).tiltShift(this.start.x, this.start.y, this.end.x, this.end.y, this.blurRadius, this.gradientRadius).update()
        }),*/

        new Filter('Lens Blur', 'lensBlur', function () {
            this.addSlider('radius', 'Radius', 0, 50, 10, 1);
            this.addSlider('brightness', 'Brightness', -1, 1, 0.75, 0.01);
            this.addSlider('angle', 'Angle', -Math.PI, Math.PI, 0, 0.01);
        }, function () {
            canvas.draw(texture).lensBlur(this.radius, this.brightness, this.angle).update()
        })
    ],
    'Warp': [
        new Filter('Swirl', 'swirl', function () {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('angle', 'Angle', -25, 25, 3, 0.1);
            this.addSlider('radius', 'Radius', 0, 600, 200, 1);
        }, function () {
            canvas.draw(texture).swirl(this.center.x, this.center.y, this.radius, this.angle).update()
        }),
        
        new Filter('Bulge / Pinch', 'bulgePinch', function () {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('strength', 'Strength', -1, 1, 0.5, 0.01);
            this.addSlider('radius', 'Radius', 0, 600, 200, 1);
        }, function () {
            canvas.draw(texture).bulgePinch(this.center.x, this.center.y, this.radius, this.strength).update()
        }),
    ],
    'Fun': [
        new Filter('Ink', 'ink', function () {
            this.addSlider('strength', 'Strength', 0, 1, 0.25, 0.01);
        }, function () {
            canvas.draw(texture).ink(this.strength).update()
        }),
        new Filter('Edge Work', 'edgeWork', function () {
            this.addSlider('radius', 'Radius', 0, 200, 10, 1);
        }, function () {
            canvas.draw(texture).edgeWork(this.radius).update()
        }),
        new Filter('Hexagonal Pixelate', 'hexagonalPixelate', function () {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('scale', 'Scale', 10, 100, 20, 1);
        }, function () {
            canvas.draw(texture).hexagonalPixelate(this.center.x, this.center.y, this.scale).update()
        }),
        new Filter('Dot Screen', 'dotScreen', function () {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('angle', 'Angle', 0, Math.PI / 2, 1.1, 0.01);
            this.addSlider('size', 'Size', 3, 20, 3, 0.01);
        }, function () {
            canvas.draw(texture).dotScreen(this.center.x, this.center.y, this.angle, this.size).update()
        }),
        new Filter('Color Halftone', 'colorHalftone', function () {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('angle', 'Angle', 0, Math.PI / 2, 0.25, 0.01);
            this.addSlider('size', 'Size', 3, 20, 4, 0.01);
        }, function () {
            canvas.draw(texture).colorHalftone(this.center.x, this.center.y, this.angle, this.size).update()
        })
    ]
};
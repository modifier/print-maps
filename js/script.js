/*
 * Print Maps - High-resolution maps in the browser, for printing
 * Copyright (c) 2015-2020 Matthew Petroff
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const sizes = {
    'a0': [1189, 841],
    'a1': [841, 595],
    'a2': [595, 420],
    'a3': [420, 297],
    'a4': [297, 210],
    'a5': [210, 148],
}
 
mapboxgl.accessToken = '';

var form = document.getElementById('config');

if (!mapboxgl.accessToken || mapboxgl.accessToken.length < 10) {
    // Don't use Mapbox style without access token
    for (var i = form.styleSelect.length - 1; i >= 0; i--) {
        if (form.styleSelect[i].value.indexOf('mapbox') >= 0) {
            form.styleSelect.remove(i);
        }
    }
}

// Show attribution requirement of initial style
if (form.styleSelect.value.indexOf('mapbox') >= 0)
    document.getElementById('mapbox-attribution').style.display = 'block';
else
    document.getElementById('stadiamaps-attribution').style.display = 'block';


//
// Interactive map
//

function updateLocationInputs() {
    var center = map.getCenter().toArray();

    var zoom = parseFloat(map.getZoom()).toFixed(2),
        lat = parseFloat(center[1]).toFixed(4),
        lon = parseFloat(center[0]).toFixed(4);

    form.zoomInput.value = zoom;
    form.latInput.value = lat;
    form.lonInput.value = lon;
    updateLocationStorage();
}

function updateLocationStorage() {
    let zoom = form.zoomInput.value;
    let lat = form.latInput.value;
    let lon = form.lonInput.value;
    localStorage.setItem('location', JSON.stringify({ zoom, lat, lon }));
}

function updateFromLocationStorage() {
    const storage = localStorage.getItem('location');
    try {
        const { zoom, lat, lon } = JSON.parse(storage);
        form.zoomInput.value = zoom;
        form.latInput.value = lat;
        form.lonInput.value = lon;
        map.setCenter([lon, lat]);
        map.setZoom(zoom);
    } catch (e) {}
}

var map;
try {
    var style = form.styleSelect.value;
    map = new mapboxgl.Map({
        container: 'map',
        center: [0, 0],
        zoom: 0.5,
        pitch: 0,
        style: style
    });
    map.addControl(new mapboxgl.NavigationControl());
    map.on('moveend', updateLocationInputs).on('zoomend', updateLocationInputs);
    updateFromLocationStorage();
    setTimeout(() => {
        form.widthInput.dispatchEvent(new Event('change'));
        form.heightInput.dispatchEvent(new Event('change'));
    });
} catch (e) {
    var mapContainer = document.getElementById('map');
    mapContainer.parentNode.removeChild(mapContainer);
    document.getElementById('config-fields').setAttribute('disabled', 'yes');
    openErrorModal('This site requires WebGL, but your browser doesn\'t seem' +
        ' to support it: ' + e.message);
}



//
// Geolocation
//

if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(function(position) {
        'use strict';
        map.flyTo({center: [position.coords.longitude,
            position.coords.latitude], zoom: 10});
    });
}



//
// Errors
//

var maxSize;
if (map) {
    var canvas = map.getCanvas();
    var gl = canvas.getContext('experimental-webgl');
    maxSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
}

var errors = {
    width: {
        state: false,
        msg: 'Width must be a positive number!',
        grp: 'widthGroup'
    },
    height: {
        state: false,
        grp: 'heightGroup'
    },
    dpi: {
        state: false,
        msg: 'DPI must be a positive number!',
        grp: 'dpiGroup'
    }
};

function handleErrors() {
    'use strict';
    var errorMsgElem = document.getElementById('error-message');
    var anError = false;
    var errorMsg;
    for (var e in errors) {
        e = errors[e];
        if (e.state) {
            if (anError) {
                errorMsg += ' ' + e.msg;
            } else {
                errorMsg = e.msg;
                anError = true;
            }
            document.getElementById(e.grp).classList.add('has-error');
        } else {
            document.getElementById(e.grp).classList.remove('has-error');
        }
    }
    if (anError) {
        errorMsgElem.innerHTML = errorMsg;
        errorMsgElem.style.display = 'block';
    } else {
        errorMsgElem.style.display = 'none';
    }
}

function isError() {
    'use strict';
    for (var e in errors) {
        if (errors[e].state) {
            return true;
        }
    }
    return false;
}



//
// Configuration changes / validation
//

form.widthInput.addEventListener('change', function(e) {
    'use strict';
    var val = Number(e.target.value / 25.4);
    var dpi = Number(form.dpiInput.value);
    if (val > 0) {
        if (val * dpi > maxSize) {
            errors.width.state = true;
            errors.width.msg = 'The maximum image dimension is ' + maxSize +
                'px, but the width entered is ' + (val * dpi) + 'px.';
        } else if (val * window.devicePixelRatio * 96 > maxSize) {
            errors.width.state = true;
            errors.width.msg = 'The width is unreasonably big!';
        } else {
            errors.width.state = false;
            val *= 25.4;
            document.getElementById('map').style.width = toPixels(val);
            map.resize();
        }
    } else {
        errors.width.state = true;
        errors.height.msg = 'Width must be a positive number!';
    }
    handleErrors();
});

form.heightInput.addEventListener('change', function(e) {
    'use strict';
    var val = Number(e.target.value / 25.4);
    var dpi = Number(form.dpiInput.value);
    if (val > 0) {
        if (val * dpi > maxSize) {
            errors.height.state = true;
            errors.height.msg = 'The maximum image dimension is ' + maxSize +
                'px, but the height entered is ' + (val * dpi) + 'px.';
        } else if (val * window.devicePixelRatio * 96 > maxSize) {
            errors.height.state = true;
            errors.height.msg = 'The height is unreasonably big!';
        } else {
            errors.height.state = false;
            val *= 25.4;
            document.getElementById('map').style.height = toPixels(val);
            map.resize();
        }
    } else {
        errors.height.state = true;
        errors.height.msg = 'Height must be a positive number!';
    }
    handleErrors();
});

form.dpiInput.addEventListener('change', function(e) {
    'use strict';
    var val = Number(e.target.value);
    if (val > 0) {
        errors.dpi.state = false;
        var event = document.createEvent('HTMLEvents');
        event.initEvent('change', true, true);
        form.widthInput.dispatchEvent(event);
        form.heightInput.dispatchEvent(event);
    } else {
        errors.dpi.state = true;
    }
    handleErrors();
});

form.styleSelect.addEventListener('change', function() {
    'use strict';
    try {
        var style = form.styleSelect.value;
        map.setStyle(style);
    } catch (e) {
        openErrorModal("Error changing style: " + e.message);
    }
    // Update attribution requirements
    if (form.styleSelect.value.indexOf('mapbox') >= 0) {
        document.getElementById('mapbox-attribution').style.display = 'block';
        document.getElementById('stadiamaps-attribution').style.display = 'none';
    } else {
        document.getElementById('mapbox-attribution').style.display = 'none';
        document.getElementById('stadiamaps-attribution').style.display = 'block';
    }
});

form.latInput.addEventListener('change', function() {
    'use strict';
    map.setCenter([form.lonInput.value, form.latInput.value]);
    updateLocationStorage();
});

form.lonInput.addEventListener('change', function() {
    'use strict';
    map.setCenter([form.lonInput.value, form.latInput.value]);
    updateLocationStorage();
});

form.zoomInput.addEventListener('change', function(e) {
    'use strict';
    map.setZoom(e.target.value);
    updateLocationStorage();
});


//
// Error modal
//

var origBodyPaddingRight;

function openErrorModal(msg) {
    'use strict';
    var modal = document.getElementById('errorModal');
    document.getElementById('modal-error-text').innerHTML = msg;
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
    document.getElementById('modalBackdrop').style.height =
        modal.scrollHeight + 'px';
    document.getElementById('modalBackdrop').style.display = 'block';

    if (document.body.scrollHeight > document.documentElement.clientHeight) {
        origBodyPaddingRight = document.body.style.paddingRight;
        var padding = parseInt((document.body.style.paddingRight || 0), 10);
        document.body.style.paddingRight = padding + measureScrollbar() + 'px';
    }
}

function closeErrorModal() {
    'use strict';
    document.getElementById('errorModal').style.display = 'none';
    document.getElementById('modalBackdrop').style.display = 'none';
    document.body.classList.remove('modal-open');
    document.body.style.paddingRight = origBodyPaddingRight;
}

function measureScrollbar() {
    'use strict';
    var scrollDiv = document.createElement('div');
    scrollDiv.className = 'modal-scrollbar-measure';
    document.body.appendChild(scrollDiv);
    var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    document.body.removeChild(scrollDiv);
    return scrollbarWidth;
}



//
// Helper functions
//

function toPixels(length) {
    'use strict';
    var conversionFactor = 96 / 25.4;

    return conversionFactor * length + 'px';
}

function updateSize(sizeKey) {
    const size = sizes[sizeKey];
    form.widthInput.value = size[0];
    form.heightInput.value = size[1];
    form.widthInput.dispatchEvent(new Event('change'));
    form.heightInput.dispatchEvent(new Event('change'));
}

function initializeSizeButtons() {
    for (const size of Object.keys(sizes)) {
        document.getElementById('size-' + size).addEventListener('click', () => updateSize(size));
    }
}

function initializeScale() {
    const map = document.getElementById('map');
    document.getElementById('scale').addEventListener('input', function(e) {
        const value = 2 ** (e.target.value - 4);

        map.style.zoom = value;
    });
}

initializeSizeButtons();
initializeScale();

document.getElementById('swap').addEventListener('click', swapSizes);

function swapSizes() {
    const width = form.widthInput.value;
    form.widthInput.value = form.heightInput.value;
    form.heightInput.value = width;
    form.widthInput.dispatchEvent(new Event('change'));
    form.heightInput.dispatchEvent(new Event('change'));
}

//
// High-res map rendering
//

document.getElementById('generate-btn').addEventListener('click', generateMap);

function generateMap() {
    'use strict';

    if (isError()) {
        openErrorModal('The current configuration is invalid! Please ' +
            'correct the errors and try again.');
        return;
    }

    document.getElementById('spinner').style.display = 'inline-block';
    document.getElementById('generate-btn').classList.add('disabled');

    var width = Number(form.widthInput.value);
    var height = Number(form.heightInput.value);

    var dpi = Number(form.dpiInput.value);

    var format = form.outputOptions[0].checked ? 'png' : 'pdf';

    var style = form.styleSelect.value;

    var zoom = map.getZoom();
    var center = map.getCenter();
    var bearing = map.getBearing();
    var pitch = map.getPitch();

    createPrintMap(width, height, dpi, format, zoom, center,
        bearing, style, pitch);
}

function createPrintMap(width, height, dpi, format, zoom, center,
    bearing, style, pitch) {
    'use strict';

    // Calculate pixel ratio
    var actualPixelRatio = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', {
        get: function() {return dpi / 96}
    });

    // Create map container
    var hidden = document.createElement('div');
    hidden.className = 'hidden-map';
    document.body.appendChild(hidden);
    var container = document.createElement('div');
    container.style.width = toPixels(width);
    container.style.height = toPixels(height);
    hidden.appendChild(container);

    // Render map
    var renderMap = new mapboxgl.Map({
        container: container,
        center: center,
        zoom: zoom,
        style: style,
        bearing: bearing,
        pitch: pitch,
        interactive: false,
        preserveDrawingBuffer: true,
        fadeDuration: 0,
        attributionControl: false
    });
    renderMap.once('idle', function() {
        if (format == 'png') {
            renderMap.getCanvas().toBlob(function(blob) {
                saveAs(blob, 'map.png');
            });
        } else {
            var pdf = new jsPDF({
                orientation: width > height ? 'l' : 'p',
                unit: 'mm',
                format: [width, height],
                compress: true
            });

            pdf.addImage(renderMap.getCanvas().toDataURL('image/png'),
                'png', 0, 0, width, height, null, 'FAST');

            var title = map.getStyle().name,
                subject = "center: [" + form.lonInput.value  + ", " + form.latInput.value + ", " + form.zoomInput.value + "]",
                attribution = '(c) ' +
                    (form.styleSelect.value.indexOf('mapbox') >= 0 ? 'Mapbox' : 'Stadia Maps') +
                    ', (c) OpenStreetMap';

            pdf.setProperties({
                title: title,
                subject: subject,
                creator: 'Print Maps',
                author: attribution
            })

            pdf.save('map.pdf');
        }

        renderMap.remove();
        hidden.parentNode.removeChild(hidden);
        Object.defineProperty(window, 'devicePixelRatio', {
            get: function() {return actualPixelRatio}
        });
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('generate-btn').classList.remove('disabled');
    });
}

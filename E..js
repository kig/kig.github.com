E = function(name) {
    var el = document.createElement(name);
    for (var i=1; i<arguments.length; i++) {
        var params = arguments[i];
        if (typeof(params) === 'string') {
            el.innerHTML += params;
        } else if (params.DOCUMENT_NODE) {
            el.appendChild(params);
        } else if (params.length) {
            for (var j=0; j<params.length; j++) {
                var p = params[j];
                if (params.DOCUMENT_NODE)
                    el.appendChild(p);
                else
                    el.innerHTML += p;
            }
        } else {
            if (params.style) {
                var style = params.style;
                delete params.style;
                var nparams = E.clone(params);
                params.style = style;
                params = nparams;
                for (var prop in style) {
                    try {
                        E.css(el, prop, style[prop]);
                    } catch(e) {}
                }
            }
            if (params.content) {
                if (typeof(params.content) === 'string') {
                    el.appendChild(E.T(params.content));
                } else {
                    var a = params.content;
                    if (!a.length) a = [a];
                    a.forEach(function(p){ el.appendChild(p); });
                }
                params = E.clone(params);
                delete params.content;
            }
            E.extend(el, params);
        }
    }
    return el;
};

E.id = function(id) {
    return document.getElementById(id);
};

E.tag = function(tagName, opt_elem) {
    return (opt_elem || document).getElementsByTagName(tagName);
};

E.q = function(query, opt_elem) {
    return (opt_elem || document).querySelector(query);
};

E.qAll = function(query, opt_elem) {
    return (opt_elem || document).querySelectorAll(query);
};

E.T = function(text) {
    return document.createTextNode(text);
};

E.toArray = function(obj) {
    var a;
    if (obj.length !== undefined) {
        a = new Array(obj.length);
        for (var i=0; i<obj.length; i++) {
            a[i] = obj[i];
        }
    } else if (typeof obj === 'object') {
        a = [];
        for (var name in obj) {
            a.push({property: name, value: obj[name]});
        }
    } else {
        a = [obj];
    }
    return a;
};

(function() {
    // find vendor prefix and existing style properties 
    E.vendorPrefix = '';
    E.styleProperties = {};
    E.vendorProperties = {};
    var regex = /^(webkit|Moz|ms|O|Webkit|Khtml|Icab)([A-Z])/;
    var d = document.createElement('div');
    var found = false;
    for (var i in d.style) {
        E.styleProperties[i] = true;
        if (regex.test(i)) {
            if (!found) {
                E.vendorPrefix = i.match(regex)[0];
                found = true;
            }
            // cache vendor-prefixed property for fast access in E.css
            E.vendorProperties[i.replace(regex, function(s, p1, p2) { 
                return p2.toLowerCase();
            })] = i;
        }
    }
})();

E.css = function(elem, property, value) {
    if (value !== undefined) {
        if (E.styleProperties[property] || !E.vendorProperties[property]) {
            elem.style[property] = value;
        } else {
            elem.style[E.vendorProperties[property]] = value;
        }
    } else {
        for (var i in property) {
            E.css(elem, i, property[i]);
        }
    }
};

E.on = function(elem, eventName, eventListener, bubble) {
    bubble = bubble || false;
    elem.addEventListener(eventName, eventListener, bubble);
    return eventListener;
};

E.off = function(elem, eventName, eventListener, bubble) {
    bubble = bubble || false;
    elem.removeEventListener(eventName, eventListener, bubble);
    return eventListener;
};

E.replace = function(elem, replacement) {
    elem.parentNode.insertBefore(replacement, elem);
    elem.parentNode.removeChild(elem);
};


// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel
( function () {
    var lastTime = 0;
    var vendors = [ 'ms', 'moz', 'webkit', 'o' ];
    for ( var x = 0; x < vendors.length && !window.requestAnimationFrame; ++ x ) {
        E.requestAnimationFrame = window[ vendors[ x ] + 'RequestAnimationFrame' ];
        E.cancelAnimationFrame = window[ vendors[ x ] + 'CancelAnimationFrame' ] || window[ vendors[ x ] + 'CancelRequestAnimationFrame' ];
    }

    if ( E.requestAnimationFrame === undefined ) {
        E.requestAnimationFrame = function ( callback ) {
            var currTime = Date.now(), timeToCall = Math.max( 0, 16 - ( currTime - lastTime ) );
            var id = window.setTimeout( function() { callback( currTime + timeToCall ); }, timeToCall );
            lastTime = currTime + timeToCall;
            return id;
        };
    }
    E.cancelAnimationFrame = E.cancelAnimationFrame || function ( id ) { window.clearTimeout( id ); };

    E.requestAnimationFrame = E.requestAnimationFrame.bind(window);
    E.cancelAnimationFrame = E.cancelAnimationFrame.bind(window);
}() );

E.sharedAnimationFrameCallbacks = [];
E.requestSharedAnimationFrame = function(callback) {
    if (E.sharedAnimationFrameCallbacks.length == 0) {
        E.requestAnimationFrame(E.onSharedAnimationFrame);
    }
    E.sharedAnimationFrameCallbacks.push(callback);
};

E.__currentSAFCBs = [];
E.onSharedAnimationFrame = function(t) {
    var a = E.__currentSAFCBs;
    var b = E.sharedAnimationFrameCallbacks;
    a.splice(b.length);
    for (var i=0; i<b.length; i++) {
        a[i] = b[i];
    }
    E.sharedAnimationFrameCallbacks.splice(0);
    for (i=0; i<a.length; i++) {
        a[i](t);
    }
};

E.sz = function(elem, w, h) {
    if (h == undefined) {
        if (w.style) {
            h = w.style.height || w.height;
            w = w.style.width || w.width;
        } else {
            h = w.height;
            w = w.width;
        }
    }
    if (typeof w === 'number') {
        w = w + 'px';
    }
    if (typeof h === 'number') {
        h = h + 'px';
    }
    elem.style.width = w;
    elem.style.height = h;
};

E.xy = function(elem, x, y) {
    if (y == undefined) {
        if (x.style) {
            y = x.style.height || x.height;
            x = x.style.width || x.width;
        } else {
            y = x.height;
            x = x.width;
        }
    }
    if (typeof x === 'number') {
        x = x + 'px';
    }
    if (typeof y === 'number') {
        y = y + 'px';
    }
    elem.style.left = x;
    elem.style.top = y;
};

E.remove = function(elem) {
    if (elem.parentNode) {
        elem.parentNode.removeChild(elem);
    }
};

E.extend = function(dst, src) {
    for (var i in src) {
        try{ dst[i] = src[i]; } catch(e) {}
    }
    return dst;
};

E.clone = function(src) {
    if (src === false || src === true || src === null || src === undefined) {
        return src;
    }
    switch (typeof(src)) {
    case 'string':
        return E.extend(src+'', src);
        break;
    case 'number':
        return src;
        break;
    case 'function':
        var obj = eval(src.toSource());
        return E.extend(obj, src);
        break;
    case 'object':
        if (src instanceof Array) {
            return E.extend([], src);
        } else {
            return E.extend({}, src);
        }
        break;
    }
    return null;
};

E.defer = function(f) {
    setTimeout(f, 0);
};

E.deferStyle = function(elem, name, value) {
    E.defer(function() {
        E.css(elem, name, value);
    });
};

E.fadeOut = function(elem, duration, onComplete) {
    duration = duration || 500;
    E.css(elem, 'transition', (duration/1000)+'s');
    E.deferStyle(elem, 'opacity', 0);
    setTimeout(function() {
        if (onComplete) {
            onComplete.call(elem, elem);
        }
        elem.parentNode.removeChild(elem);
    }, duration);
};

E.fadeIn = function(elem, duration, onComplete) {
    duration = duration || 500;
    E.css(elem, 'transition', (duration/1000)+'s');
    elem.style.opacity = 0;
    E.deferStyle(elem, 'opacity', 1);
    setTimeout(function() {
        if (onComplete) {
            onComplete.call(elem, elem);
        }
    }, duration);
};

E.fadeInImage = function(src, rotation, jitter, onload) {
    var img = E('img');
    E.css(img, 'transition', '0.5s');
    E.css(img, 'opacity', 0);
    E.css(img, 'transform', 'rotate('+rotation+'deg) scale(1.2)');
    img.onload = function() {
        if (onload) {
            onload.call(img);
        }
        setTimeout((function() {
            E.css(this, 'opacity', 1);
            E.css(this, 'transform', 'rotate(0deg) scale(1)');
        }).bind(this), 10+Math.random()*(jitter || 200));
    };
    img.src = src;
    return img;
};

E.loadCSSButton = function(src, width, height, normal, hover, down) {
    var e = E('div', {style: {
        background: 'url('+src+')',
        display: 'inline-block',
        opacity: 0,
        width: width + 'px',
        height: height + 'px'
    }});
    var loader = E('img', {
        src: src,
        onload: function() {
            E.fadeIn(e);
        },
        onerror: function() {
            E.fadeOut(e);
        }
    });
    return E.CSSButton(e, normal, hover, down);
};

E.CSSButton = function(btn, normal, hover, down) {
    if (btn.CSSButtonEventListeners) {
        E.CSSButton.removeEventListeners(btn);
    }
    E.css(btn, 'backgroundRepeat', 'no-repeat');
    E.css(btn, 'cursor', 'pointer');
    var c = btn.CSSButtonEventListeners = {};
    c.showNormal = function() {
        if (this.eatWindowEvent) { 
            this.eatWindowEvent = false;
        } else {
            this.down = false;
            E.css(this, 'backgroundPosition', '0px '+(-normal)+'px');
        }
    };
    c.showDown = function() {
        this.down = E;
        this.css(this, 'backgroundPosition', '0px '+(-down)+'px');
    };
    c.showHover = function() {
        if (!this.down) { 
            E.css(this, 'backgroundPosition', '0px '+(-hover)+'px');
        }
    };
    c.showUp = function() {
        this.down = false;
        this.eatWindowEvent = true;
    };
    c.removed = function() {
        E.CSSButton.removeEventListeners(this);
    };
    c.windowMousemove = function(ev) { if (ev.target != this) { c.showNormal.call(this); } };
    c.windowBlur = function(ev) { c.showNormal.call(this); };
    btn.addEventListener('mouseup', c.showUp, false);
    btn.addEventListener('mouseout', c.showNormal, false);
    btn.addEventListener('mouseover', c.showHover, false);
    btn.addEventListener('mousedown', c.showDown, false);
    btn.addEventListener('DOMNodeRemovedFromDocument', c.removed, false);
    E.onDocument.add(btn, 'mousemove', c.windowMousemove, false);
    E.onDocument.add(btn, 'blur', c.windowBlur, false);
    E.onDocument.add(btn, 'mouseup', c.showNormal, false);
    c.showNormal.call(btn);
    return btn;
};

E.CSSButton.removeEventListeners = function(btn) {
    var c = btn.CSSButtonEventListeners;
    if (!c) {
        return;
    }
    btn.removeEventListener('mouseup', c.showUp, false);
    btn.removeEventListener('mouseout', c.showNormal, false);
    btn.removeEventListener('mouseover', c.showHover, false);
    btn.removeEventListener('mousedown', c.showDown, false);
    btn.removeEventListener('DOMNodeRemovedFromDocument', c.removed, false);
    E.onDocument.remove(btn, 'mousemove', c.windowMousemove, false);
    E.onDocument.remove(btn, 'blur', c.windowBlur, false);
    E.onDocument.remove(btn, 'mouseup', c.showNormal, false);
};

E.Listener = function(object) {
    this.listeners = {};
    this.object = object;
};

E.Listener.prototype = {
    add: function(context, eventName, callback, bubble) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = {true: [], false: []};
        }
        if (this.listeners[eventName][bubble].length === 0) {
            this.listeners[eventName][bubble].listener = (function(evt) {
                var a = this.listeners[eventName][bubble];
                for (var i=0; i<a.length; i++) {
                    var el = a[i];
                    if (el.context && !el.context.parentNode) {
                        a.splice(i, 1);
                        i--;
                    } else {
                        var ok = el.callback.call(el.context || this.object, evt);
                        if (ok === false) {
                            return false;
                        }
                    }
                }
                return true;
            }).bind(this);
            this.object.addEventListener(eventName, this.listeners[eventName][bubble].listener, bubble);
        }
        this.listeners[eventName][bubble].push({context: context, callback: callback});
    },

    remove: function(context, eventName, callback, bubble) {
        if (this.listeners[eventName]) {
            var b = this.listeners[eventName][bubble];
            for (var i=0; i<b.length; i++) {
                if (b[i].context === context && b[i].callback === callback) {
                    b.splice(i, 1);
                    break;
                }
            }
            if (b.length === 0) {
                this.object.removeEventListener(eventName, b.listener, bubble);
                delete b.listener;
            }
        }
    }
};

E.onDocument = new E.Listener(document);
E.onWindow = new E.Listener(window);


E.Spinner = {
    create : function(container, duration, opts) {
        var color, size, left, top, lineWidth;
        if (opts != undefined) {
            color = opts.color;
            size = opts.size;
            left = opts.left;
            top = opts.top;
            lineWidth = opts.lineWidth;
        }
        if (color == undefined) { color = '#000000'; }
        if (size == undefined) { size = 50; }
        var halfSize = size / 2;
        if (left == undefined) { left = '50%'; }
        if (top == undefined) { top = '50%'; }
        if (lineWidth == undefined) { lineWidth = 4; }
        var spinner = E('div');
        spinner.lineWidth = lineWidth;
        spinner.color = color;
        spinner.className = 'spinner-bringIn';
        spinner.scale = 0.0;
        spinner.startTime = 0;
        spinner.style.position = 'absolute';
        spinner.style.marginLeft = -halfSize + 'px';
        spinner.style.marginTop = -halfSize + 'px';
        spinner.style.left = left;
        spinner.style.top = top;
        spinner.duration = duration || 1000;
        var canvas = E('canvas');
        canvas.className = 'spinner';
        canvas.width = canvas.height = size;
        spinner.canvas = canvas;
        spinner.appendChild(canvas);
        spinner.tick = this.tick.bind(spinner);
        spinner.exit = false;
        spinner.enter = true;
        container.appendChild(spinner);
        spinner.tick();
        return spinner;
    },

    tick : function() {
        var t = Date.now();
        this.startTime = this.startTime || t;
        var elapsed = t - this.startTime;
        if (this.exit) {
            this.scale = Math.max(0, Math.min(1, 1-(elapsed/this.duration)));
            this.scale = 0.5 - 0.5 * Math.cos(this.scale*Math.PI);
            if (this.scale <= 0.01) {
                this.parentNode.removeChild(this);
                if (this.callback) {
                    this.callback();
                }
                return;
            }
        } else if (this.enter) {
            this.scale = Math.max(0, Math.min(1, (elapsed/this.duration)));
            this.scale = 0.5 - 0.5 * Math.cos(this.scale*Math.PI);
        }
        var scale = this.scale;
        var canvas = this.canvas;
        var ctx = canvas.getContext('2d');
        var w = canvas.width;
        var h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        {
            ctx.globalAlpha = scale;
            ctx.strokeStyle = this.color;
            ctx.translate(w/2, h/2);
            ctx.scale(scale, scale);
            ctx.rotate((t / 300) % (Math.PI*2));
            ctx.lineWidth = this.lineWidth;
            ctx.lineCap = 'round';
            var third = Math.PI*2 / 3;
            for (var i=0; i<3; i++) {
                ctx.beginPath();
                ctx.arc(0, 0, w*0.4, i*third, i*third+Math.PI/2, false);
                ctx.stroke();
            }
        }
        ctx.restore();
        E.requestSharedAnimationFrame(this.tick);
    },

    remove : function(spinner, callback) {
        spinner.className = 'spinner-bringOut';
        spinner.exit = true;
        spinner.enter = false;
        spinner.startTime = 0;
        spinner.callback = callback;
    },

    loadImageElem : function(img, onload) {
        var t0, spinner;
        var imgCont = E('span');
        E.css(img, 'opacity', 0);
        E.css(img, 'transition', '0.25s');
        window.setTimeout(function() {
            if (img.complete) {
                img.onload();
            } else {
                E.sz(imgCont, img);
                E.xy(imgCont, img.offsetLeft, img.offsetTop);
                imgCont.style.display = 'inline-block';
                imgCont.style.position = 'absolute';
                imgCont.style.overflow = 'hidden';
                var p = img.parentNode;
                if (p) {
                    p.insertBefore(imgCont, img);
                }
                spinner = E.Spinner.create(imgCont, 250);
                t0 = Date.now();
            }
        }, 50);
        var fired = false;
        img.loaded = function() {
            if (fired) {
                return;
            }
            fired = true;
            E.css(img, 'opacity', 1);
            E.remove(imgCont);
            if (onload) {
                onload.call(img, imgCont);
            }
        };
        img.onload = function() {
            if (spinner) {
                var elapsed = Date.now() - t0;
                window.setTimeout(function() {
                    E.Spinner.remove(spinner, img.loaded);
                }, Math.max(0, 250-elapsed));
            } else {
                img.loaded();
            }
        };
        img.onerror = function() {
            var elapsed = Date.now() - t0;
            window.setTimeout(function() {
                E.Spinner.remove(spinner, function() {
                    E.remove(imgCont);
                });
            }, Math.max(0, 250-elapsed));
        };
        if (img.complete) {
            img.onload();
        }
        return imgCont;
    },

    loadImage : function(src, w, h, onload) {
        var img = E('img');
        img.width = w;
        img.height = h;
        img.src = src;
        return E.Spinner.loadImageElem(img, onload);
    },

    loadAllImages: function() {
        var imgs = E.toArray(E.tag('img'));
        for (var i=0; i<imgs.length; i++) {
            var img = imgs[i];
            E.Spinner.loadImageElem(img);
        }
    }
};




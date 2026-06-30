// rainmap.js — Hong Kong Rain Radar Map with Optical Flow Prediction
//
// Fetches HKO 64km radar KML, parses GroundOverlay frames, detects rain-coloured
// pixels, animates recent frames, and uses dense pyramidal Lucas-Kanade optical
// flow to predict the next hour of rainfall.  Shows a text prediction at the
// user's location.
//
// Only activates when the user is within the Hong Kong region
// (lat 21–23, lon 112–115).

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Constants                                                          */
  /* ------------------------------------------------------------------ */

  const REFRESH_INTERVAL = 6 * 60 * 1000;
  const FRAME_MS = 500;
  const RADAR_SIZE = 800;
  const FLOW_SCALE = 8;        // downscale factor for optical flow
  const FLOW_SIZE = RADAR_SIZE / FLOW_SCALE;  // 100
  const PREDICT_STEPS = 10;    // 10 × 6 min = 1 hour
  const FLOW_SPEED = 0.5;      // scale factor for flow displacement
  const PYR_LEVELS = 4;        // handles up to ~12px displacement at 100px flow res
  const LK_WIN = 5;            // larger window for sparse rain masks

  function detectProxy() {
    var host = '';
    try { host = window.location.hostname || ''; } catch (e) {}
    return 'https://radar.fhtr.net/hko/';
  }

  var BOUNDS = {
    north: 22.87890, south: 21.72777,
    east: 114.79378, west: 113.54956,
  };

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  function project(lat, lon, w, h) {
    var x = ((lon - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * w;
    var y = ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * h;
    return [x, y];
  }

  function isRainPixel(r, g, b, a) {
    if (a === 0) return false;
    if (r > 240 && g > 240 && b > 240) return false;
    if (r < 20 && g < 20 && b < 20) return false;
    return true;
  }

  /** Build a Float32Array rain mask (downscaled) from ImageData. */
  function makeRainMask(imgData) {
    var d = imgData.data, srcW = imgData.width, srcH = imgData.height;
    var mask = new Float32Array(FLOW_SIZE * FLOW_SIZE);
    var sx = srcW / FLOW_SIZE, sy = srcH / FLOW_SIZE;
    for (var y = 0; y < FLOW_SIZE; y++) {
      for (var x = 0; x < FLOW_SIZE; x++) {
        var sum = 0, n = 0, black = 0;
        var x0 = Math.floor(x * sx), y0 = Math.floor(y * sy);
        var x1 = Math.min(srcW - 1, Math.floor((x + 1) * sx));
        var y1 = Math.min(srcH - 1, Math.floor((y + 1) * sy));
        for (var syy = y0; syy <= y1; syy++) {
          for (var sxx = x0; sxx <= x1; sxx++) {
            var i = (syy * srcW + sxx) * 4;
            var r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
            if (r < 20 && g < 20 && b < 20 && a > 0) { black++; n++; continue; }
            if (isRainPixel(r, g, b, a)) sum++;
            n++;
          }
        }
        mask[y * FLOW_SIZE + x] = (n > 0 && black < n * 0.5) ? sum / n : 0;
      }
    }
    return blurMask(mask, FLOW_SIZE, FLOW_SIZE);
  }

  /** 3x3 Gaussian blur on a Float32Array mask. */
  function blurMask(mask, w, h) {
    var out = new Float32Array(w * h);
    var kernel = [1/16, 2/16, 1/16, 2/16, 4/16, 2/16, 1/16, 2/16, 1/16];
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var sum = 0;
        for (var ky = -1; ky <= 1; ky++)
          for (var kx = -1; kx <= 1; kx++)
            sum += mask[(y+ky)*w + (x+kx)] * kernel[(ky+1)*3 + (kx+1)];
        out[y*w + x] = sum;
      }
    }
    return out;
  }

  /** Convert an RGB radar pixel to a [0,1] intensity based on hue.
   *  Blue/cyan=light → green → yellow → orange → red → magenta=heavy.
   *  Mapping calibrated from HKO 64km radar legend. */
  function rgbToIntensity(r, g, b) {
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max === 0) return 0;
    var h = 0, delta = max - min;
    if (delta > 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
    }
    h = Math.round(h * 60); if (h < 0) h += 360;
    if (h >= 200 && h <= 220) return (h - 200) / 20 * 0.08;
    if (h >= 120 && h < 200) return 0.08 + (200 - h) / 80 * 0.18;
    if (h >= 56 && h < 120) return 0.26 + (120 - h) / 64 * 0.18;
    if (h >= 30 && h < 56) return 0.44 + (56 - h) / 26 * 0.19;
    if (h >= 0 && h < 30) return 0.63 + (30 - h) / 30 * 0.19;
    if (h >= 300 && h <= 345) return 0.82 + (345 - h) / 45 * 0.18;
    return 0;
  }

  /** Build an intensity mask from ImageData — averages hue-derived
   *  intensity of rain pixels per flow cell, blurred. */
  function makeIntensityMask(imgData) {
    var d = imgData.data, srcW = imgData.width, srcH = imgData.height;
    var mask = new Float32Array(FLOW_SIZE * FLOW_SIZE);
    var sx = srcW / FLOW_SIZE, sy = srcH / FLOW_SIZE;
    for (var y = 0; y < FLOW_SIZE; y++) {
      for (var x = 0; x < FLOW_SIZE; x++) {
        var sum = 0, n = 0;
        var x0 = Math.floor(x * sx), y0 = Math.floor(y * sy);
        var x1 = Math.min(srcW - 1, Math.floor((x + 1) * sx));
        var y1 = Math.min(srcH - 1, Math.floor((y + 1) * sy));
        for (var syy = y0; syy <= y1; syy++) {
          for (var sxx = x0; sxx <= x1; sxx++) {
            var i = (syy * srcW + sxx) * 4;
            if (isRainPixel(d[i], d[i+1], d[i+2], d[i+3])) {
              sum += rgbToIntensity(d[i], d[i+1], d[i+2]); n++;
            }
          }
        }
        mask[y * FLOW_SIZE + x] = n > 0 ? sum / n : 0;
      }
    }
    return mask;  // nearest-neighbour — no blur on intensity
  }

  /* ================================================================ */
  /*  Dense Pyramidal Lucas-Kanade Optical Flow                       */
  /* ================================================================ */

  function buildPyramid(data, w, h, levels) {
    var pyr = [{ data: data, w: w, h: h }];
    for (var l = 1; l < levels; l++) {
      var prev = pyr[l-1], nw = prev.w>>1, nh = prev.h>>1;
      var nd = new Float32Array(nw*nh);
      for (var y=0; y<nh; y++) for (var x=0; x<nw; x++) {
        var i = (y<<1)*prev.w + (x<<1);
        nd[y*nw+x] = 0.25*(prev.data[i]+prev.data[i+1]+prev.data[i+prev.w]+prev.data[i+prev.w+1]);
      }
      pyr.push({ data: nd, w: nw, h: nh });
    }
    return pyr;
  }

  function lkLevel(I1, I2, w, h, winR) {
    var sz = w*h, u = new Float32Array(sz), v = new Float32Array(sz);
    var Ix = new Float32Array(sz), Iy = new Float32Array(sz), It = new Float32Array(sz);
    for (var y=1; y<h-1; y++) for (var x=1; x<w-1; x++) {
      var i = y*w+x;
      Ix[i]=0.5*(I1[i+1]-I1[i-1]); Iy[i]=0.5*(I1[i+w]-I1[i-w]); It[i]=I2[i]-I1[i];
    }
    for (var y=winR; y<h-winR; y++) for (var x=winR; x<w-winR; x++) {
      var A11=0,A12=0,A22=0,b1=0,b2=0;
      for (var wy=-winR; wy<=winR; wy++) for (var wx=-winR; wx<=winR; wx++) {
        var i = (y+wy)*w+(x+wx), ix=Ix[i], iy=Iy[i], it=It[i];
        A11+=ix*ix; A12+=ix*iy; A22+=iy*iy; b1+=ix*it; b2+=iy*it;
      }
      var det = A11*A22 - A12*A12, i = y*w+x;
      if (Math.abs(det)>1e-8) { u[i]=-(A22*b1-A12*b2)/det; v[i]=-(-A12*b1+A11*b2)/det; }
    }
    return { u:u, v:v, w:w, h:h };
  }

  function upsampleFlow(flow, nw, nh) {
    var s = nw/flow.w, nu = new Float32Array(nw*nh), nv = new Float32Array(nw*nh);
    for (var y=0; y<nh; y++) for (var x=0; x<nw; x++) {
      var sx=x/s, sy=y/s, ix0=Math.floor(sx), iy0=Math.floor(sy);
      var ix1=Math.min(flow.w-1,ix0+1), iy1=Math.min(flow.h-1,iy0+1);
      var fx=sx-ix0, fy=sy-iy0;
      var i00=iy0*flow.w+ix0, i10=iy0*flow.w+ix1, i01=iy1*flow.w+ix0, i11=iy1*flow.w+ix1;
      nu[y*nw+x]=s*((1-fx)*(1-fy)*flow.u[i00]+fx*(1-fy)*flow.u[i10]+(1-fx)*fy*flow.u[i01]+fx*fy*flow.u[i11]);
      nv[y*nw+x]=s*((1-fx)*(1-fy)*flow.v[i00]+fx*(1-fy)*flow.v[i10]+(1-fx)*fy*flow.v[i01]+fx*fy*flow.v[i11]);
    }
    return { u:nu, v:nv, w:nw, h:nh };
  }

  function warpImage(src, sw, sh, flow) {
    var dst = new Float32Array(flow.w*flow.h);
    for (var y=0; y<flow.h; y++) for (var x=0; x<flow.w; x++) {
      var sx = x - flow.u[y*flow.w+x], sy = y - flow.v[y*flow.w+x];
      var ix0=Math.max(0,Math.min(sw-1,Math.floor(sx))), iy0=Math.max(0,Math.min(sh-1,Math.floor(sy)));
      var ix1=Math.min(sw-1,ix0+1), iy1=Math.min(sh-1,iy0+1);
      var fx=sx-ix0, fy=sy-iy0;
      dst[y*flow.w+x]=(1-fx)*(1-fy)*src[iy0*sw+ix0]+fx*(1-fy)*src[iy0*sw+ix1]+(1-fx)*fy*src[iy1*sw+ix0]+fx*fy*src[iy1*sw+ix1];
    }
    return dst;
  }

  function pyramidalLK(prev, next, w, h, levels, winR) {
    var p1=buildPyramid(prev,w,h,levels), p2=buildPyramid(next,w,h,levels);
    var flow = null;
    for (var l=levels-1; l>=0; l--) {
      var lw=p1[l].w, lh=p1[l].h, I2w=p2[l].data;
      if (flow) {
        // Upsample the coarser flow to this level first, then warp
        flow = upsampleFlow(flow, lw, lh);
        I2w = warpImage(p2[l].data, lw, lh, flow);
      }
      var f = lkLevel(p1[l].data, I2w, lw, lh, winR);
      if (flow) { for (var i=0;i<lw*lh;i++) { f.u[i]+=flow.u[i]; f.v[i]+=flow.v[i]; } }
      flow = f;
    }
    return flow;
  }

  /* ================================================================ */
  /*  RainMap class                                                    */
  /* ================================================================ */

  function RainMap() {
    this.wrapper = null; this.container = null; this.canvas = null; this.ctx = null;
    this.frames = [];
    this.hasRain = false;
    this.animStart = 0;
    this.animPhase = 'loading';
    this.paused = false;
    this.playedOnce = false;
    this.pausedFrameIdx = 0;
    this.userLat = null; this.userLon = null;
    this.pinPulseStart = 0;

    // Optical flow & prediction
    this.masks = null;              // Float32Array[] rain masks per historical frame
    this.predictedMasks = null;     // Float32Array[] predicted rain masks (1 hr)
    this.allMasks = null;           // concatenated historical + predicted
    this.predictionText = '';       // text label

    // UI
    this.scrubberFill = null;
    this.timestampEl = null;
    this.predictionEl = null;

    this.refreshTimer = null;
    this.lastRefresh = 0;
    this.proxy = detectProxy();

    this.landImg = null;
    this.landStrokeImg = null;
  }

  RainMap.prototype.init = function (containerEl) {
    var self = this;
    var wrapper = document.getElementById('rain-map-wrapper');
    var container = containerEl;
    if (!wrapper || !container) return;
    this.wrapper = wrapper;
    this.container = container;

    this.scrubberFill = wrapper.querySelector('#rain-map-scrubber-fill');
    this.timestampEl = wrapper.querySelector('#rain-map-timestamp');
    this.predictionEl = wrapper.querySelector('#rain-map-prediction');
    this.playBtn = wrapper.querySelector('#rain-map-playpause');

    this.canvas = document.createElement('canvas');
    this.canvas.width = RADAR_SIZE;
    this.canvas.height = RADAR_SIZE;
    this.ctx = this.canvas.getContext('2d');
    container.appendChild(this.canvas);

    // Tap canvas to replay animation from present into prediction
    this.canvas.style.cursor = 'pointer';
    this.canvas.addEventListener('click', function () {
      self.paused = false;
      self.animStart = performance.now();
      if (self.playBtn) self.playBtn.textContent = '❚❚';
    });

    // Play/pause button
    if (this.playBtn) {
      this.playBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        self.paused = !self.paused;
        if (!self.paused) self.animStart = performance.now();
        self.playBtn.textContent = self.paused ? '▶' : '❚❚';
      });
    }

    this.landImg = new Image();
    this.landImg.src = 'landmasses_hk.svg';
    this.landStrokeImg = new Image();
    this.landStrokeImg.src = 'landmasses_stroke_hk.svg';

    this.pinPulseStart = performance.now();
    this.startRefreshLoop();
  };

  /* ---------- data fetching ---------- */

  RainMap.prototype.startRefreshLoop = function () {
    var self = this;
    this.fetchAndProcess();
    this.refreshTimer = setInterval(function () { self.fetchAndProcess(); }, REFRESH_INTERVAL);
  };

  RainMap.prototype.fetchAndProcess = function () {
    var self = this;
    var now = Date.now();
    // Throttle: only fetch every 30s, prevent concurrent fetches
    if (this._fetching) return;
    if (now - this.lastRefresh < 30000) return;
    this._fetching = true;
    this.lastRefresh = now;

    this.fetchKML().then(function (frames) {
      if (!frames || frames.length < 3) { self.hide(); self._fetching = false; return; }
      return self.loadFrames(frames).then(function (loaded) {
        if (loaded.length < 3) { self.hide(); self._fetching = false; return; }
        self.frames = loaded;
        self.hasRain = loaded.some(function (f) { return f.hasRain; });
        if (!self.hasRain) { self.hide(); self._fetching = false; return; }

        self.show();
        self.computeFlowAndPredict();
        self.animStart = performance.now();
        self.paused = false;
        self.animPhase = 'animating';
        self._fetching = false;
      });
    }).catch(function () { self.hide(); self._fetching = false; });
  };

  RainMap.prototype.fetchKML = function () {
    var self = this;
    return fetch(self.proxy + 'server_Radar_064k.kml?_=' + Math.floor(Date.now() / 360000))
      .then(function (r) { return r.text(); })
      .then(function (text) {
        var xml = (new DOMParser()).parseFromString(text, 'text/xml');
        var overlays = xml.querySelectorAll('GroundOverlay');
        var seen = {}, frames = [];
        overlays.forEach(function (ov) {
          var icon = ov.querySelector('Icon > href');
          if (!icon) return;
          var url = icon.textContent.trim();
          var m = url.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})_rad_064k\.png$/);
          if (!m || seen[url]) return;
          seen[url] = true;
          var time = Date.UTC(+m[1], +m[2]-1, +m[3], +m[4]-8, +m[5], +m[6]);
          frames.push({ url: self.proxy + url, time: time });
        });
        frames.sort(function (a, b) { return a.time - b.time; });
        return frames;
      });
  };

  RainMap.prototype.loadFrames = function (list) {
    var self = this;
    return Promise.all(list.map(function (f) {
      return self.loadImage(f.url).then(function (r) { r.url=f.url; r.time=f.time; return r; }).catch(function () { return null; });
    })).then(function (r) { return r.filter(function (x) { return x !== null; }); });
  };

  RainMap.prototype.loadImage = function (url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        var hasRain = true;
        try {
          var c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
          var ctx=c.getContext('2d'); ctx.drawImage(img,0,0);
          var d=ctx.getImageData(0,0,img.width,img.height).data;
          var rc=0, step=16;
          for (var i=0; i<d.length; i+=step) if (isRainPixel(d[i],d[i+1],d[i+2],d[i+3])) rc++;
          hasRain = (rc/(d.length/step)) > 0.005;
        } catch(e) {}
        resolve({ img:img, hasRain:hasRain });
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  /* ---------- optical flow & prediction ------------------------------ */

  RainMap.prototype.computeFlowAndPredict = function () {
    var frames = this.frames;
    var masks = [], intMasks = [];
    for (var i = 0; i < frames.length; i++) {
      var f = frames[i];
      if (!f.img) { masks.push(null); intMasks.push(null); continue; }
      try {
        var c = document.createElement('canvas'); c.width = f.img.width; c.height = f.img.height;
        var ctx = c.getContext('2d'); ctx.drawImage(f.img, 0, 0);
        var imgData = ctx.getImageData(0, 0, c.width, c.height);
        masks.push(makeRainMask(imgData));
        intMasks.push(makeIntensityMask(imgData));
      } catch(e) { masks.push(null); intMasks.push(null); }
    }
    this.masks = masks;

    // Flow computed from coverage masks (where rain is / where it's moving)
    var valid = masks.filter(function (m) { return m !== null; });
    var flow = null;
    for (var i = valid.length - 1; i >= 1; i--) {
      flow = pyramidalLK(valid[i-1], valid[i], FLOW_SIZE, FLOW_SIZE, PYR_LEVELS, LK_WIN);
      var hasMotion = false;
      for (var j = 0; j < flow.u.length; j++) {
        if (Math.abs(flow.u[j]) > 0.01 || Math.abs(flow.v[j]) > 0.01) { hasMotion = true; break; }
      }
      if (hasMotion) break;
    }

    if (!flow) { this.predictedMasks = null; this.allMasks = masks; this.predictionText = ''; return; }

    // Advect the last valid INTENSITY mask forward (keeps actual radar colours)
    var validInt = intMasks.filter(function (m) { return m !== null; });
    var lastInt = validInt[validInt.length - 1];
    var predMasks = [];
    var cur = new Float32Array(lastInt);
    for (var s = 0; s < PREDICT_STEPS; s++) {
      // Slight random perturbation to flow each step for natural evolution
      var noiseU = (Math.random() - 0.5) * 0.6;
      var noiseV = (Math.random() - 0.5) * 0.6;
      var nx = new Float32Array(FLOW_SIZE*FLOW_SIZE);
      for (var y = 0; y < FLOW_SIZE; y++) for (var x = 0; x < FLOW_SIZE; x++) {
        var idx = y*FLOW_SIZE + x;
        var sx = x - (flow.u[idx] + noiseU) * FLOW_SPEED,
            sy = y - (flow.v[idx] + noiseV) * FLOW_SPEED;
        if (sx < 0 || sx >= FLOW_SIZE || sy < 0 || sy >= FLOW_SIZE) continue;
        // Nearest-neighbour — crisp, no damping, no spreading
        var px = Math.round(sx), py = Math.round(sy);
        px = Math.max(0, Math.min(FLOW_SIZE - 1, px));
        py = Math.max(0, Math.min(FLOW_SIZE - 1, py));
        nx[idx] = cur[py * FLOW_SIZE + px];
      }
      cur = nx;
      predMasks.push(new Float32Array(cur));
    }
    this.predictedMasks = predMasks;
    // allMasks keeps coverage for prediction-text timeline
    this.allMasks = masks.concat(predMasks);
    this.computePredictionText();
  };

  /* ---------- prediction text ----------------------------------------- */

  /**
   * Build a rain/no-rain timeline at the user's pin and generate a
   * text prediction like "started raining 20 min ago, stopping in 15 min".
   */
  RainMap.prototype.computePredictionText = function () {
    if (this.userLat == null || this.userLon == null) { this.predictionText = ''; return; }
    var all = this.allMasks;
    if (!all || all.length === 0) { this.predictionText = ''; return; }

    // Pin position in flow grid
    var pt = project(this.userLat, this.userLon, FLOW_SIZE, FLOW_SIZE);
    var px = Math.round(pt[0]), py = Math.round(pt[1]);
    px = Math.max(0, Math.min(FLOW_SIZE-1, px));
    py = Math.max(0, Math.min(FLOW_SIZE-1, py));

    var idx = py * FLOW_SIZE + px;
    var histCount = this.masks ? this.masks.filter(function(m){return m!==null;}).length : 0;

    // Build timeline: for each mask, is it raining at the pin?
    var timeline = [];  // [{ raining: bool, offsetMin: int }]
    for (var i = 0; i < all.length; i++) {
      var m = all[i];
      if (!m) continue;
      var rain = m[idx] > 0.05;
      var offset = (i - histCount + 1) * 6;  // minutes from now: -past, +future
      timeline.push({ raining: rain, offset: offset });
    }

    if (timeline.length === 0) { this.predictionText = ''; return; }

    // Find the current state and the next transition
    var nowIdx = -1, nowRaining = false;
    for (i = 0; i < timeline.length; i++) {
      if (timeline[i].offset >= 0) { nowRaining = timeline[i].raining; nowIdx = i; break; }
    }
    if (nowIdx < 0) { nowRaining = timeline[timeline.length-1].raining; nowIdx = timeline.length-1; }

    // Find next state change (future)
    var nextChange = null;
    for (i = nowIdx + 1; i < timeline.length; i++) {
      if (timeline[i].raining !== nowRaining) { nextChange = timeline[i]; break; }
    }

    // Find when current state started (past)
    var stateStart = timeline[0];
    for (i = nowIdx - 1; i >= 0; i--) {
      if (timeline[i].raining !== nowRaining) { stateStart = timeline[i+1]; break; }
    }

    // Generate text
    var text = '';

    function fmtMin(n) {
      return n >= 60 ? Math.round(n/60) + 'h' : n + ' min';
    }

    if (nowRaining) {
      text = 'Raining';
      var absStart = Math.abs(stateStart.offset);
      if (absStart > 0) text += ' · started ' + fmtMin(absStart) + ' ago';
      if (nextChange) {
        var until = nextChange.offset;
        if (until > 0) text += ' · stopping in ' + fmtMin(until);
      }
    } else {
      var wasRainingBefore = false, stoppedWhen = 0;
      for (i = nowIdx - 1; i >= 0; i--) {
        if (timeline[i].raining) { wasRainingBefore = true; stoppedWhen = timeline[i+1].offset; break; }
      }
      if (wasRainingBefore) {
        text = Math.abs(stoppedWhen) > 0 ? 'Rain stopped ' + fmtMin(Math.abs(stoppedWhen)) + ' ago' : 'Rain stopped';
      }
      if (nextChange && nextChange.raining) {
        var willStart = nextChange.offset;
        // Find when this rain spell ends
        var endTime = nextChange.offset;
        for (i = nowIdx + 1; i < timeline.length; i++) {
          if (timeline[i].offset > nextChange.offset && !timeline[i].raining) { endTime = timeline[i].offset; break; }
        }
        var dur = endTime - nextChange.offset;
        if (willStart === 0) {
          text += (text ? ' · ' : '') + 'Rain for ' + fmtMin(dur);
        } else if (dur === 0) {
          text += (text ? ' · ' : '') + 'May rain in ' + fmtMin(willStart);
        } else {
          text += (text ? ' · ' : '') + 'rain in ' + fmtMin(willStart) + ' for ' + fmtMin(dur);
        }
      }
    }
    this.predictionText = text;
  };

  /* ---------- visibility ---------------------------------------------- */

  RainMap.prototype.show = function () {
    if (this.wrapper) this.wrapper.classList.add('visible');
  };
  RainMap.prototype.hide = function () {
    if (this.wrapper) this.wrapper.classList.remove('visible');
    this.animPhase = 'idle';
  };
  RainMap.prototype.stop = function () {
    if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null; }
    this.hide();
    this.frames = []; this.masks = null; this.predictedMasks = null; this.allMasks = null;
    this.hasRain = false; this.predictionText = '';
    this.animPhase = 'idle';
  };

  RainMap.prototype.setUserLocation = function (lat, lon) {
    this.userLat = lat;
    this.userLon = lon;
  };

  /* ---------- rendering ----------------------------------------------- */

  RainMap.prototype.render = function (timestamp) {
    if (!this.ctx || this.animPhase === 'idle') return;
    if (this.wrapper && !this.wrapper.classList.contains('visible')) return;

    var ctx = this.ctx;
    ctx.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);
    this.drawLand(ctx);
    this.drawRadarOverlay(ctx, timestamp);
    this.drawLandOutlines(ctx);
    this.drawUserPin(ctx, timestamp);
    this.updateUI(timestamp);
  };

  RainMap.prototype.drawLand = function (ctx) {
    if (this.landImg && this.landImg.complete && this.landImg.naturalWidth > 0) {
      ctx.save();
      ctx.drawImage(this.landImg, 0, 0, RADAR_SIZE, RADAR_SIZE);
      ctx.restore();
    }
  };

  RainMap.prototype.drawRadarOverlay = function (ctx, timestamp) {
    var frames = this.frames;
    var preds = this.predictedMasks;
    var total = frames.length + (preds ? preds.length : 0);
    if (total === 0) return;

    var elapsed = (timestamp - this.animStart) % (total * FRAME_MS);
    var idx = Math.floor(elapsed / FRAME_MS);

    if (this.paused) {
      idx = Math.min(idx, frames.length - 1);
    }

    if (idx < frames.length) {
      // Historical frame
      var frame = frames[idx];
      if (frame && frame.img) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.drawImage(frame.img, 0, 0, RADAR_SIZE, RADAR_SIZE);
        ctx.restore();
      }
    } else if (preds) {
      var pidx = idx - frames.length;
      if (pidx < preds.length) {
        this.drawPredictedMask(ctx, preds[pidx]);
      }
    }
  };

  RainMap.prototype.drawPredictedMask = function (ctx, mask) {
    // Render to a temp canvas so drawImage respects alpha compositing
    // (putImageData on the main canvas would overwrite the land background).
    if (!this._predCanvas) {
      this._predCanvas = document.createElement('canvas');
      this._predCanvas.width = RADAR_SIZE;
      this._predCanvas.height = RADAR_SIZE;
      this._predCtx = this._predCanvas.getContext('2d');
    }
    var pctx = this._predCtx;
    pctx.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);

    // HKO 64km radar legend colours (light → heavy), sampled from actual images:
    // blue → cyan → teal → green → lime → yellow → orange → red → magenta
    var legend = [
      [ 59,150,255], [  0,144,244], [  0,201,253], [  0,116,100],
      [  0,128, 69], [  0,208,  0], [  0,250,  7], [148,255,  0],
      [224,208,  0], [238,129,  0], [240,  0,  1], [240,  1,240]
    ];

    var imgData = pctx.createImageData(RADAR_SIZE, RADAR_SIZE);
    var d = imgData.data, s = RADAR_SIZE / FLOW_SIZE;
    for (var y = 0; y < RADAR_SIZE; y++) {
      for (var x = 0; x < RADAR_SIZE; x++) {
        var mx = Math.floor(x / s), my = Math.floor(y / s);
        var val = mask[Math.min(FLOW_SIZE-1, my) * FLOW_SIZE + Math.min(FLOW_SIZE-1, mx)];
        if (val > 0.03) {
          // Map intensity val [0,1] → legend index [0, 11]
          var t = Math.min(1, val) * (legend.length - 1);
          var idx = Math.floor(t);
          var frac = t - idx;
          idx = Math.min(legend.length - 2, Math.max(0, idx));
          var c0 = legend[idx], c1 = legend[idx + 1];
          var cr = Math.round(c0[0] + (c1[0] - c0[0]) * frac);
          var cg = Math.round(c0[1] + (c1[1] - c0[1]) * frac);
          var cb = Math.round(c0[2] + (c1[2] - c0[2]) * frac);
          var ca = 255;  // full opacity for crisp predicted rain
          var i = (y * RADAR_SIZE + x) * 4;
          d[i]=cr; d[i+1]=cg; d[i+2]=cb; d[i+3]=ca;
        }
      }
    }
    // Drop shadow: draw non-transparent pixels as black, shifted (2,2)
    var shadow = pctx.createImageData(RADAR_SIZE, RADAR_SIZE);
    for (var i = 0; i < d.length; i += 4) {
      if (d[i+3] > 0) { shadow.data[i+3] = Math.round(d[i+3] * 0.35); }
    }
    pctx.putImageData(shadow, 2, 2);
    pctx.putImageData(imgData, 0, 0);
    // Composite onto the main canvas (respects alpha — land shows through)
    ctx.drawImage(this._predCanvas, 0, 0);
  };

  RainMap.prototype.drawLandOutlines = function (ctx) {
    if (this.landStrokeImg && this.landStrokeImg.complete && this.landStrokeImg.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.drawImage(this.landStrokeImg, 0, 0, RADAR_SIZE, RADAR_SIZE);
      ctx.restore();
    }
  };

  RainMap.prototype.drawUserPin = function (ctx, timestamp) {
    if (this.userLat == null || this.userLon == null) return;
    var pt = project(this.userLat, this.userLon, RADAR_SIZE, RADAR_SIZE);
    var px = pt[0], py = pt[1];
    if (px < -20 || px > RADAR_SIZE+20 || py < -20 || py > RADAR_SIZE+20) return;

    var elapsed = (timestamp - this.pinPulseStart) % 2000;
    var phase = elapsed / 2000;
    var dotO = phase < 0.1 ? phase/0.1 : 1-(phase-0.1)/0.9;
    dotO = Math.max(0, Math.min(1, dotO));
    var ringR = 16 + phase*88;
    var ringO = phase < 0.1 ? phase/0.1 : 1-(phase-0.1)/0.9;
    ringO = Math.max(0, Math.min(1, ringO));

    ctx.save();
    if (ringO > 0.01) {
      ctx.beginPath(); ctx.arc(px, py, ringR, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(0,122,255,' + (ringO*0.5) + ')'; ctx.lineWidth = 6; ctx.stroke();
    }
    if (dotO > 0.01) {
      ctx.beginPath(); ctx.arc(px, py, 20, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,122,255,' + (dotO*0.8) + ')'; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,' + (dotO*0.85) + ')'; ctx.fill();
    }
    ctx.restore();
  };

  RainMap.prototype.updateUI = function (timestamp) {
    var frames = this.frames;
    var preds = this.predictedMasks;
    var total = frames.length + (preds ? preds.length : 0);
    if (total === 0) return;

    var idx;
    if (this.paused) {
      idx = frames.length - 1;  // paused at last historical frame
    } else {
      var elapsed = (timestamp - this.animStart) % (total * FRAME_MS);
      idx = Math.floor(elapsed / FRAME_MS);
    }

    var progress = idx / total;
    if (this.scrubberFill) this.scrubberFill.style.width = (progress * 100).toFixed(1) + '%';

    var keepPredicting = (idx >= frames.length && this.wrapper);
    if (keepPredicting) this.wrapper.classList.add('predicting');
    else if (this.wrapper) this.wrapper.classList.remove('predicting');

    // Timestamp
    if (idx < frames.length) {
      var frame = frames[idx];
      if (this.timestampEl && frame) {
        var d = new Date(frame.time);
        var hh = ('0' + ((d.getUTCHours() + 8) % 24)).slice(-2);
        var mm = ('0' + d.getUTCMinutes()).slice(-2);
        var a = Math.round((Date.now() - frame.time) / 60000);
        var ah = Math.floor(a/60), am = a%60;
        this.timestampEl.textContent = hh + ':' + mm + ' (' + (ah>0?ah+'h ':'') + am + 'm ago)';
      }
    } else if (preds) {
      var pidx = idx - frames.length;
      if (this.timestampEl) {
        var fd = new Date(frames[frames.length-1].time);
        var fm = Math.round((Date.now() - fd.getTime()) / 60000) - (pidx+1)*6;
        this.timestampEl.textContent = (Math.sign(fm) === -1 ? "+" : "") + (-fm) + ' min (predicted)';
      }
    }
    if (this.predictionEl) this.predictionEl.textContent = this.predictionText || '';
    if (this.playBtn) this.playBtn.textContent = this.paused ? '▶' : '❚❚';
  };

  /* ------------------------------------------------------------------ */
  /*  Global integration                                                 */
  /* ------------------------------------------------------------------ */

  window.RainMap = RainMap;

  window.initRainMap = function (containerId, lat, lon) {
    var rm = window._rainMapInstance;
    if (!rm) {
      var container = document.getElementById(containerId);
      if (!container) return;
      rm = new RainMap();
      rm.init(container);
      window._rainMapInstance = rm;
    }
    rm.setUserLocation(lat, lon);
    rm.fetchAndProcess();
    return rm;
  };

  window.renderRainMap = function (timestamp) {
    var rm = window._rainMapInstance;
    if (rm) rm.render(timestamp);
  };
})();

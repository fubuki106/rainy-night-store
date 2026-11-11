(function () {
  "use strict";

  const W = 1050;
  const H = 750;
  const LIMIT = 2.8;
  const START = 1.45;
  const END = 2.08;
  const SANS = '"PingFang SC","Hiragino Sans GB",Arial,sans-serif';
  const MONO = '"SFMono-Regular",Menlo,Consolas,monospace';

  function text(g, value, x, y, size, weight, color, mono) {
    g.fillStyle = color;
    g.font = weight + " " + size + "px " + (mono ? MONO : SANS);
    g.fillText(value, x, y);
  }

  function fitText(g, value, x, y, width, startSize, weight, color) {
    let size = startSize;
    g.font = weight + " " + size + "px " + SANS;
    while (size > 16 && g.measureText(value).width > width) {
      g.font = weight + " " + (--size) + "px " + SANS;
    }
    if (g.measureText(value).width > width) {
      let shortened = value;
      while (shortened.length && g.measureText(shortened + "…").width > width) {
        shortened = shortened.slice(0, -1);
      }
      value = shortened + "…";
    }
    g.fillStyle = color;
    g.fillText(value, x, y);
  }

  function newCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function makePaper() {
    const paper = newCanvas(W, H);
    const g = paper.getContext("2d");
    g.fillStyle = "#f3ead4";
    g.fillRect(0, 0, W, H);
    let seed = 327;
    const random = function () {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    g.fillStyle = "rgba(84,55,35,.09)";
    for (let i = 0; i < 17500; i++) g.fillRect(random() * W, random() * H, 1.2, 1);
    const rule = (x, y, w) => { g.fillStyle = "#766f5e"; g.fillRect(x, y, w, 1); };
    text(g, "雨夜双联", 43, 72, 49, 750, "#28291f");
    text(g, "RAINY NIGHT STORE", 266, 48, 15, 650, "#484639", true);
    text(g, "DOUBLE FEATURE", 266, 69, 15, 450, "#484639", true);
    g.textAlign = "right";
    text(g, "BUS STOP EDITION", 1007, 55, 17, 650, "#7f4934", true);
    g.textAlign = "left";
    rule(43, 92, 964);
    rule(43, 700, 964);
    text(g, "末班放映", 43, 727, 16, 600, "#404138");
    text(g, "35 MM", 857, 727, 13, 550, "#625e50", true);
    text(g, "02 FR.", 955, 727, 13, 550, "#625e50", true);
    return paper;
  }

  // Reproduce the entire photographed frame, including its original composition.
  function developFrame(image, bias) {
    if (!image || !image.width || !image.height) return null;
    const scale = Math.min(1, 820 / image.width, 560 / image.height);
    const frame = newCanvas(Math.max(1, Math.round(image.width * scale)), Math.max(1, Math.round(image.height * scale)));
    const g = frame.getContext("2d", { willReadFrequently: true });
    g.drawImage(image, 0, 0, frame.width, frame.height);
    let pixels;
    try { pixels = g.getImageData(0, 0, frame.width, frame.height); }
    catch (_) { return frame; }
    const lut = [];
    const power = 0.89 + bias;
    for (let i = 0; i < 256; i++) {
      const v = i / 255;
      lut[i] = 5 + 245 * Math.pow(v, power);
    }
    const a = pixels.data;
    for (let i = 0; i < a.length; i += 4) {
      const y = (a[i] * 0.24 + a[i + 1] * 0.62 + a[i + 2] * 0.14) / 255;
      const warm = y * y;
      const shadow = (1 - y) * (1 - y);
      a[i] = lut[a[i]] + warm * 3.5;
      a[i + 1] = lut[a[i + 1]] + warm * 0.8;
      a[i + 2] = lut[a[i + 2]] + shadow * 3.5 - warm * 4;
    }
    g.putImageData(pixels, 0, 0);
    return frame;
  }

  function pasteFrame(g, frame, left, top, width, height, alignRight) {
    g.fillStyle = "#262925";
    if (!frame) {
      g.fillRect(left, top, width, height);
      g.strokeStyle = "#596155";
      g.lineWidth = 1;
      g.strokeRect(left + 14.5, top + 14.5, width - 29, height - 29);
      const d = 12, cx = left + width / 2, cy = top + height / 2;
      g.beginPath(); g.moveTo(cx - d, cy); g.lineTo(cx + d, cy);
      g.moveTo(cx, cy - d); g.lineTo(cx, cy + d); g.stroke();
      return;
    }
    const scale = Math.min((width - 9) / frame.width, (height - 9) / frame.height);
    const fw = Math.round(frame.width * scale), fh = Math.round(frame.height * scale);
    const fx = alignRight ? left + width - fw - 8 : left;
    const fy = top + Math.round((height - fh - 8) / 2);
    g.fillRect(fx, fy, fw + 8, fh + 8);
    g.drawImage(frame, fx + 4, fy + 4, fw, fh);
  }

  function makeSpread(paper, ordered, getFrame) {
    const canvas = newCanvas(W, H);
    const g = canvas.getContext("2d");
    g.drawImage(paper, 0, 0);
    const inks = { dark: "#2e3028", muted: "#6d6a5d", rust: "#985539" };
    function caption(shot, index, x, y) {
      text(g, index ? "02   后片" : "01   前片", x, y, 18, 650, inks.rust);
      g.fillStyle = "#99917a"; g.fillRect(x, y + 12, 272, 1);
      fitText(g, shot ? shot.title : "待选底片", x, y + 58, 280, 31, 700, inks.dark);
      if (shot && shot.time) text(g, String(shot.time).slice(0, 22), x, y + 91, 18, 500, inks.muted, true);
    }
    pasteFrame(g, ordered[0] && getFrame(ordered[0]), 43, 112, 481, 326);
    caption(ordered[0], 0, 575, 207);
    pasteFrame(g, ordered[1] && getFrame(ordered[1]), 526, 356, 481, 326, true);
    caption(ordered[1], 1, 62, 536);
    return canvas;
  }

  window.createContactPrinter = function createContactPrinter(options) {
    options = options || {};
    const panel = document.createElement("div");
    panel.className = "cp-room";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "雨夜冲印台");
    panel.innerHTML = `
      <div class="cp-shell">
        <header class="cp-top">
          <div class="cp-brand"><i class="cp-light" aria-hidden="true"></i><div><small>RAINY NIGHT STORE</small><h1>雨夜冲印台</h1></div></div>
          <button class="cp-exit" type="button" aria-label="收起冲印台，保留底片">收起 <b aria-hidden="true">×</b></button>
        </header>
        <div class="cp-work">
          <section class="cp-easel" aria-label="双联印相预览">
            <div class="cp-ruler" aria-hidden="true"></div>
            <div class="cp-print"><canvas width="1050" height="750" aria-label="由两张实拍组成的双联印相预览"></canvas></div>
            <div class="cp-easel-foot"><span>双联相纸</span><span>7 × 5</span></div>
          </section>
          <div class="cp-tools">
            <section class="cp-film">
              <div class="cp-section-head"><h2>装入底片</h2><button type="button" class="cp-swap" disabled title="交换前后片（R）">⇄ 换序</button></div>
              <p>按放映顺序点两张。</p>
              <div class="cp-strip" role="group" aria-label="实拍底片"></div>
            </section>
            <section class="cp-timer">
              <div class="cp-section-head"><h2>曝光</h2><output class="cp-readout" aria-hidden="true">0.00 <small>s</small></output></div>
              <div class="cp-meter" role="meter" aria-label="曝光时间，目标 1.45 至 2.08 秒" aria-valuemin="0" aria-valuemax="2.80" aria-valuenow="0"><i class="cp-band"></i><i class="cp-needle"></i></div>
              <div class="cp-graduations" aria-hidden="true"><span>0</span><span>1</span><b>适曝</b><span>2.8 s</span></div>
              <p class="cp-status" role="status" aria-live="polite"></p>
              <button type="button" class="cp-action" disabled></button>
              <div class="cp-keys"><span><kbd>1–3</kbd> 选片</span><span><kbd>R</kbd> 换序</span><span><kbd>E</kbd> 曝光 / 确认</span></div>
            </section>
          </div>
        </div>
      </div>`;
    const q = (s) => panel.querySelector(s);
    const strip = q(".cp-strip"), action = q(".cp-action"), swap = q(".cp-swap");
    const readout = q(".cp-readout"), meter = q(".cp-meter"), status = q(".cp-status");
    const preview = q(".cp-print canvas"), needle = q(".cp-needle");
    const paper = makePaper();
    let shots = [], chosen = [], buttons = [], stage = "choose";
    let started = 0, animation = 0, spread = null, returnFocus = null;
    let cache = new Map();

    function getFrame(shot, bias) {
      const key = shots.indexOf(shot) + "/" + bias.toFixed(2);
      if (!cache.has(key)) cache.set(key, developFrame(shot.image, bias));
      return cache.get(key);
    }
    function draw(bias) {
      spread = makeSpread(paper, chosen.map(i => shots[i]), shot => getFrame(shot, bias));
      preview.getContext("2d").drawImage(spread, 0, 0);
    }
    function resetNeedle(time) {
      time = Math.max(0, Math.min(LIMIT, time));
      needle.style.left = (100 * time / LIMIT) + "%";
      const rounded = time.toFixed(2);
      readout.firstChild.nodeValue = rounded + " ";
      meter.setAttribute("aria-valuenow", rounded);
    }
    function controls(message) {
      panel.dataset.state = stage;
      buttons.forEach((b, i) => {
        const n = chosen.indexOf(i);
        b.disabled = stage === "timing";
        b.setAttribute("aria-pressed", String(n >= 0));
        b.setAttribute("aria-label", (i + 1) + "号底片，" + shots[i].title + (n >= 0 ? (n === 0 ? "，前片" : "，后片") : ""));
        b.querySelector(".cp-tag").textContent = n >= 0 ? (n === 0 ? "前片" : "后片") : "＋";
      });
      swap.disabled = chosen.length !== 2 || stage === "timing";
      action.disabled = chosen.length !== 2;
      action.textContent = { choose: "开始曝光", timing: "停光", failed: "重新曝光", ready: "把印相送上灯箱  ↗" }[stage];
      if (message) status.textContent = message;
    }
    function resetSelection() {
      cancelAnimationFrame(animation); stage = "choose"; resetNeedle(0); draw(0);
      controls(chosen.length === 2 ? "开始后，指针进入浅色区时停光。" : "选好前片和后片，就能开灯曝光。");
    }
    function choose(index) {
      if (stage === "timing" || index < 0 || index >= shots.length) return;
      const prior = chosen.indexOf(index);
      if (prior >= 0) chosen.splice(prior, 1);
      else if (chosen.length === 2) chosen[1] = index;
      else chosen.push(index);
      resetSelection();
    }
    function exchange() {
      if (swap.disabled) return;
      chosen.reverse(); resetSelection();
    }
    function stopTiming(time) {
      if (stage !== "timing") return;
      cancelAnimationFrame(animation); resetNeedle(time);
      if (time >= START && time <= END) {
        stage = "ready"; draw((time - (START + END) / 2) * 0.19);
        controls("曝光正好。双联印相已定影。");
      } else {
        stage = "failed";
        const early = time < START;
        draw(early ? -0.30 : 0.38);
        controls(early ? "相纸偏浅，刚才停得早了。可以重试。" : "相纸偏深，下一次早点停光。");
      }
    }
    function tick(now) {
      if (stage !== "timing") return;
      const elapsed = (now - started) / 1000;
      if (elapsed >= LIMIT) { stopTiming(elapsed); return; }
      resetNeedle(elapsed); animation = requestAnimationFrame(tick);
    }
    function expose() {
      if (action.disabled || panel.hidden) return;
      if (stage === "ready") {
        const order = chosen.slice();
        const result = { canvas: spread, order, title: order.map(i => shots[i].title).join(" / ") };
        close(); if (typeof options.onPrint === "function") options.onPrint(result);
      } else if (stage === "timing") stopTiming((performance.now() - started) / 1000);
      else {
        draw(0); resetNeedle(0); stage = "timing"; started = performance.now();
        action.focus({ preventScroll: true });
        controls("指针进入浅色区，按「停光」。"); animation = requestAnimationFrame(tick);
      }
    }
    function escape() {
      close(); if (typeof options.onClose === "function") options.onClose();
    }
    function close() {
      if (panel.hidden) return;
      cancelAnimationFrame(animation); panel.hidden = true; panel.remove();
      stage = "choose"; shots = []; chosen = []; buttons = []; cache.clear(); spread = null;
      if (returnFocus && returnFocus.isConnected && returnFocus.focus) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    }
    function open(input) {
      if (!Array.isArray(input) || input.length < 2 || input.length > 3) throw new RangeError("冲印需要两张或三张底片");
      if (!input.every(s => s && s.image && s.image.width > 0 && s.image.height > 0)) throw new TypeError("底片缺少画面");
      if (!panel.hidden) close();
      returnFocus = document.activeElement;
      shots = input.slice(); chosen = []; cache = new Map(); strip.replaceChildren(); buttons = [];
      shots.forEach((shot, i) => {
        const b = document.createElement("button"); b.type = "button"; b.className = "cp-frame";
        const thumb = newCanvas(224, 140);
        const t = thumb.getContext("2d");
        t.fillStyle = "#262723"; t.fillRect(0, 0, 224, 140);
        const k = Math.min(224 / shot.image.width, 140 / shot.image.height);
        const w = shot.image.width * k, h = shot.image.height * k;
        t.drawImage(shot.image, (224 - w) / 2, (140 - h) / 2, w, h);
        const tag = document.createElement("span"); tag.className = "cp-tag";
        const name = document.createElement("span"); name.className = "cp-name"; name.textContent = shot.title;
        const idx = document.createElement("small"); idx.textContent = String(i + 1).padStart(2, "0");
        b.append(thumb, tag, idx, name); strip.append(b); buttons.push(b);
        b.addEventListener("click", () => choose(i));
      });
      if (!panel.isConnected) document.body.append(panel);
      panel.hidden = false; resetSelection(); buttons[0].focus({ preventScroll: true });
    }
    action.addEventListener("click", expose); swap.addEventListener("click", exchange);
    q(".cp-exit").addEventListener("click", escape);
    panel.addEventListener("keydown", function (e) {
      e.stopPropagation();
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Tab") {
        const all = Array.from(panel.querySelectorAll("button:not(:disabled)"));
        const current = document.activeElement;
        if ((e.shiftKey && current === all[0]) || (!e.shiftKey && current === all[all.length - 1])) {
          e.preventDefault(); all[e.shiftKey ? all.length - 1 : 0].focus();
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "escape" || /^[123]$/.test(k) || k === "r" || k === "e") {
        e.preventDefault(); if (e.repeat || e.isComposing) return;
        if (k === "escape") escape();
        else if (k === "r") exchange();
        else if (k === "e") expose();
        else choose(Number(k) - 1);
      }
    });
    panel.addEventListener("keyup", e => e.stopPropagation());
    panel.addEventListener("pointerdown", e => e.stopPropagation());
    panel.addEventListener("pointerup", e => e.stopPropagation());
    panel.addEventListener("click", e => e.stopPropagation());
    panel.addEventListener("wheel", e => e.stopPropagation(), { passive: true });
    action.title = "E 开始、停光或送去展示";
    strip.title = "数字键选片，R 调换顺序";
    return { open, close };
  };
})();

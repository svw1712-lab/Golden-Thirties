// Leinwand: Fotoshow + „Sophie oder Anne?“ live
(() => {
  "use strict";
  const stage = document.getElementById("stage");
  const SLIDE_MS = 7000;
  let mode = "";          // "off" | "duel" | "show"
  let duelKey = "";
  let uploads = [];       // neueste zuerst
  let seen = new Set();
  let queue = [];         // neu angekommene Fotos, die zuerst gezeigt werden
  let idx = 0;
  let slideTimer = null;
  let lastUploadStamp = "";

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else el.setAttribute(k, v);
    }
    for (const c of children.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  async function get(path) {
    const r = await fetch("/api/" + path, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  // ---------- Fotoshow ----------
  async function loadUploads() {
    try {
      const data = await get("uploads");
      const list = data.uploads || [];
      const first = seen.size === 0;
      for (const u of list) {
        if (!seen.has(u.id)) {
          seen.add(u.id);
          if (!first) queue.push(u);
        }
      }
      uploads = list;
    } catch {}
  }

  function showSlide(u, isNew) {
    if (!u) {
      stage.replaceChildren(h("div", { class: "show-empty" },
        h("h1", { text: "Ladet eure Fotos hoch!" }),
        h("p", { text: "Beweisfotos und Schnappschüsse erscheinen hier auf der Leinwand." }),
        h("img", { src: "/img/qr-heute.svg", alt: "" })));
      return;
    }
    const tilt = (Math.random() * 5 - 2.5).toFixed(1) + "deg";
    const label = [u.guestName, u.card ? `Karte ${u.card}` : null].filter(Boolean).join(" · ");
    const fig = h("figure", { class: "show-photo", style: `--tilt:${tilt}` },
      h("img", { src: "/api/uploads/" + encodeURIComponent(u.id), alt: "" }),
      label || u.caption ? h("figcaption", {}, label || "", u.caption ? h("small", { text: u.caption }) : null) : null,
      isNew ? h("span", { class: "show-new", text: "Neu!" }) : null);
    stage.replaceChildren(h("div", { class: "show" }, fig));
    if (isNew && window.fireConfetti) window.fireConfetti();
    // nächstes Bild vorladen
    const next = uploads[(idx + 1) % Math.max(uploads.length, 1)];
    if (next) { const i = new Image(); i.src = "/api/uploads/" + encodeURIComponent(next.id); }
  }

  function nextSlide() {
    if (mode !== "show") return;
    if (queue.length) {
      const u = queue.shift();
      showSlide(u, true);
    } else if (uploads.length) {
      idx = (idx + 1) % uploads.length;
      showSlide(uploads[idx], false);
    } else {
      showSlide(null);
    }
  }

  function startShow() {
    if (mode === "show") return;
    mode = "show";
    duelKey = "";
    idx = -1;
    clearInterval(slideTimer);
    nextSlide();
    slideTimer = setInterval(nextSlide, SLIDE_MS);
  }

  // ---------- Sophie oder Anne ----------
  function renderDuel(live) {
    const c = live.counts || { sophie: 0, anne: 0, total: 0 };
    const key = live.question.id + "|" + live.status;
    if (mode !== "duel" || duelKey !== key) {
      mode = "duel";
      clearInterval(slideTimer);
      duelKey = key;
      stage.replaceChildren(h("div", { class: "duel" },
        h("p", { class: "duel-kicker", text: live.status === "open" ? "Jetzt abstimmen!" : "Das Ergebnis" }),
        h("h1", { class: "duel-q", text: live.question.text }),
        h("div", { class: "duel-cols" },
          h("div", { class: "duel-col", id: "col-sophie" }, h("div", { class: "duel-track" }, h("div", { class: "duel-bar", id: "bar-sophie" })), h("div", { class: "duel-name", text: "Sophie" })),
          h("div", { class: "duel-col", id: "col-anne" }, h("div", { class: "duel-track" }, h("div", { class: "duel-bar", id: "bar-anne" })), h("div", { class: "duel-name", text: "Anne" }))),
        h("p", { class: "duel-total", id: "duel-total" }),
        live.status === "open" ? h("p", { class: "duel-hint", text: "Handy raus: Abstimmen geht über den QR-Code unten rechts." }) : null));
      if (live.status === "closed" && window.fireConfetti) setTimeout(window.fireConfetti, 900);
    }
    const max = Math.max(c.sophie, c.anne, 1);
    const pct = (n) => (c.total ? Math.round((n / c.total) * 100) : 0);
    const show = live.status === "closed";
    for (const who of ["sophie", "anne"]) {
      const bar = document.getElementById("bar-" + who);
      const col = document.getElementById("col-" + who);
      // Während der Abstimmung wachsen die Balken anonym (ohne Prozent), beim Ergebnis mit Zahlen
      bar.style.height = Math.max(4, (c[who] / max) * 100) + "%";
      bar.textContent = show ? pct(c[who]) + " %" : "";
      col.classList.toggle("win", show && c[who] > c[who === "sophie" ? "anne" : "sophie"]);
      col.classList.toggle("lose", show && c[who] < c[who === "sophie" ? "anne" : "sophie"]);
    }
    document.getElementById("duel-total").textContent = c.total === 1 ? "1 Stimme" : `${c.total} Stimmen`;
  }

  // ---------- Steuerung ----------
  async function tick() {
    let live;
    try { live = await get("live"); } catch { return; }
    if (!live.active) {
      if (mode !== "off") {
        mode = "off";
        clearInterval(slideTimer);
        stage.replaceChildren(h("div", { class: "show-empty" },
          h("h1", { text: "Gleich geht's los" }),
          h("p", { text: "Der Abend-Modus ist noch ausgeschaltet. Ihr schaltet ihn auf der Planungsseite unter „Abend“ ein." })));
      }
      return;
    }
    if (live.uploads && live.uploads.last !== lastUploadStamp) {
      lastUploadStamp = live.uploads.last;
      await loadUploads();
      if (mode === "show" && queue.length && stage.querySelector(".show-empty")) nextSlide();
    }
    if (live.status !== "idle" && live.question) renderDuel(live);
    else startShow();
  }

  tick();
  setInterval(tick, 2000);

  const fs = document.getElementById("fs");
  fs.addEventListener("click", async () => {
    try { await document.documentElement.requestFullscreen(); } catch {}
  });
  document.addEventListener("fullscreenchange", () => fs.classList.toggle("hidden", !!document.fullscreenElement));
})();

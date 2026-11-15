// „Der Abend in Zahlen“ – Rückblick mit PDF (Drucken) und Foto-ZIP
(() => {
  "use strict";
  const root = document.getElementById("recap");
  const progress = document.getElementById("zip-progress");
  let data = null;

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

  async function load() {
    let r = await fetch("/api/recap", { cache: "no-store" });
    if (r.status === 403) {
      // Vorschau für euch: funktioniert, wenn ihr im selben Browser auf /admin angemeldet seid
      let pin = "";
      try { pin = sessionStorage.getItem("p30-pin") || ""; } catch {}
      if (pin) r = await fetch("/api/admin/recap", { headers: { "x-admin-pin": pin }, cache: "no-store" });
    }
    if (!r.ok) {
      root.replaceChildren(h("p", { class: "notice", text: "Der Rückblick ist noch nicht freigeschaltet. Schaut nach der Party noch einmal vorbei!" }));
      document.getElementById("pdf").disabled = true;
      document.getElementById("zip").disabled = true;
      return;
    }
    data = await r.json();
    render();
  }

  function countUp(el, target) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target < 2) { el.textContent = String(target); return; }
    const start = performance.now(), dur = 1400;
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function render() {
    const d = data;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(d.date || "")
      ? new Date(d.date + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }) : "";
    document.getElementById("recap-sub").textContent = [d.hosts ? `${d.hosts} werden 30` : "", date, d.venueName].filter(Boolean).join(" · ");

    const nums = [
      [d.guests, "Gäste"],
      [d.photos, d.photos === 1 ? "Foto" : "Fotos"],
      [d.missions, d.missions === 1 ? "erledigte Aufgabe" : "erledigte Aufgaben"],
      [d.votes, d.votes === 1 ? "Stimme" : "Stimmen"],
    ];
    const numEls = nums.map(([n, label]) => {
      const strong = h("strong", { text: "0" });
      return { n, el: h("div", { class: "number" }, strong, h("span", { text: label })), strong };
    });

    const sections = [h("div", { class: "numbers" }, numEls.map((x) => x.el))];

    if (d.questions.length) {
      const pct = (n, t) => (t ? Math.round((n / t) * 100) : 0);
      const leader = d.score.sophie > d.score.anne ? "Sophie" : d.score.anne > d.score.sophie ? "Anne" : "";
      sections.push(h("section", {},
        h("h2", { text: "Sophie oder Anne?" }),
        h("div", { class: "duel-score" },
          h("div", { class: "score", text: `Sophie ${d.score.sophie} : ${d.score.anne} Anne` }),
          h("p", { class: "muted", text: leader ? `${leader} hat die meisten Fragen „gewonnen“.` : "Unentschieden – wie es sich für beste Freundinnen gehört." })),
        d.questions.map((q) => {
          const win = q.sophie > q.anne ? "Sophie" : q.anne > q.sophie ? "Anne" : "Unentschieden";
          return h("div", { class: "q-result" },
            h("p", {}, q.text + " ", h("span", { class: "winner", text: "– " + win })),
            h("div", { class: "result-row" }, h("span", { class: "result-name", text: "Sophie" }),
              h("span", { class: "result-bar" }, h("span", { style: `width:${pct(q.sophie, q.total)}%` })),
              h("span", { class: "result-num", text: pct(q.sophie, q.total) + " %" })),
            h("div", { class: "result-row" }, h("span", { class: "result-name", text: "Anne" }),
              h("span", { class: "result-bar" }, h("span", { style: `width:${pct(q.anne, q.total)}%` })),
              h("span", { class: "result-num", text: pct(q.anne, q.total) + " %" })));
        })));
    }

    if (d.topPhotographers.length) {
      const medals = ["🥇", "🥈", "🥉"];
      sections.push(h("section", {},
        h("h2", { text: "Die fleißigsten Fotograf:innen" }),
        h("ol", { class: "podium" }, d.topPhotographers.map((p, i) =>
          h("li", { "data-medal": medals[i] || "" }, h("span", { text: p.name }), h("span", { text: p.n === 1 ? "1 Foto" : `${p.n} Fotos` }))))));
    }

    if (d.uploads.length) {
      sections.push(h("section", {},
        h("h2", { text: "Alle Fotos" }),
        h("div", { class: "recap-gallery" }, d.uploads.map((u) =>
          h("figure", {},
            h("img", { src: "/api/uploads/" + encodeURIComponent(u.id), alt: u.guestName ? "Foto von " + u.guestName : "Foto vom Abend", loading: "lazy" }),
            (u.guestName || u.card) ? h("figcaption", { text: [u.guestName, u.card ? `Karte ${u.card}` : ""].filter(Boolean).join(" · ") }) : null)))));
    } else {
      document.getElementById("zip").disabled = true;
    }

    root.replaceChildren(...sections);
    numEls.forEach((x) => countUp(x.strong, x.n));
    if (window.fireConfetti) setTimeout(window.fireConfetti, 400);
  }

  // ---------- PDF ----------
  document.getElementById("pdf").addEventListener("click", async () => {
    // alle Bilder laden, damit sie im PDF erscheinen
    const imgs = [...document.querySelectorAll(".recap-gallery img")];
    imgs.forEach((i) => i.removeAttribute("loading"));
    progress.textContent = imgs.length ? "Fotos werden für das PDF vorbereitet …" : "";
    await Promise.all(imgs.map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
    progress.textContent = "";
    window.print();
  });

  // ---------- ZIP (ohne Bibliothek, unkomprimiert – Fotos sind schon komprimiert) ----------
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function makeZip(files) {
    const enc = new TextEncoder();
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name);
      const crc = crc32(f.data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
      local.setUint16(8, 0, true); local.setUint16(10, dosTime, true); local.setUint16(12, dosDate, true);
      local.setUint32(14, crc, true); local.setUint32(18, f.data.length, true); local.setUint32(22, f.data.length, true);
      local.setUint16(26, name.length, true); local.setUint16(28, 0, true);
      parts.push(new Uint8Array(local.buffer), name, f.data);
      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
      cen.setUint16(10, 0, true); cen.setUint16(12, dosTime, true); cen.setUint16(14, dosDate, true);
      cen.setUint32(16, crc, true); cen.setUint32(20, f.data.length, true); cen.setUint32(24, f.data.length, true);
      cen.setUint16(28, name.length, true); cen.setUint32(42, offset, true);
      central.push(new Uint8Array(cen.buffer), name);
      offset += 30 + name.length + f.data.length;
    }
    const cenSize = central.reduce((s, p) => s + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cenSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
  }
  const safe = (s) => String(s || "").normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

  document.getElementById("zip").addEventListener("click", async (ev) => {
    if (!data || !data.uploads.length) return;
    const btn = ev.currentTarget;
    btn.disabled = true;
    const list = [...data.uploads].reverse(); // chronologisch
    const files = [];
    for (let i = 0; i < list.length; i++) {
      const u = list[i];
      progress.textContent = `Fotos werden gesammelt … ${i + 1} von ${list.length}`;
      try {
        const r = await fetch("/api/uploads/" + encodeURIComponent(u.id));
        if (!r.ok) continue;
        const type = r.headers.get("content-type") || "image/jpeg";
        const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
        const name = [String(i + 1).padStart(3, "0"), safe(u.guestName), u.card ? `karte-${u.card}` : ""].filter(Boolean).join("_") + "." + ext;
        files.push({ name, data: new Uint8Array(await r.arrayBuffer()) });
      } catch {}
    }
    const blob = makeZip(files);
    const a = h("a", { href: URL.createObjectURL(blob), download: "die-goldenen-dreissiger-fotos.zip" });
    document.body.append(a); a.click(); a.remove();
    progress.textContent = `${files.length} Fotos heruntergeladen.`;
    btn.disabled = false;
  });

  load().catch(() => root.replaceChildren(h("p", { class: "notice error", text: "Der Rückblick konnte nicht geladen werden. Bitte lade die Seite neu." })));
})();

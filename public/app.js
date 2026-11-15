(() => {
  "use strict";

  const app = document.getElementById("app");
  let state = { config: null, guests: [] };
  let lastGuestId = "";

  // ---------- kleine Helfer ----------
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "text") el.textContent = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  // Text mit klickbaren Links (für Übernachtung, Kontakt …)
  function rich(text, cls) {
    const p = h("p", { class: ("pre " + (cls || "")).trim() });
    const re = /(https?:\/\/[^\s]+)|([\w.+-]+@[\w-]+\.[\w.]+)|(\+?\d[\d \/-]{6,}\d)/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      p.append(text.slice(last, m.index));
      const href = m[1] ? m[1] : m[2] ? "mailto:" + m[2] : "tel:" + m[3].replace(/[^\d+]/g, "");
      p.append(h("a", { href, target: m[1] ? "_blank" : null, rel: m[1] ? "noopener" : null, text: m[0] }));
      last = m.index + m[0].length;
    }
    p.append(text.slice(last));
    return p;
  }

  const toastEl = document.getElementById("toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }

  function getTokens() {
    try { return JSON.parse(localStorage.getItem("p30-tokens") || "{}"); } catch { return {}; }
  }
  function setToken(id, token) {
    try {
      const t = getTokens();
      t[id] = token;
      localStorage.setItem("p30-tokens", JSON.stringify(t));
    } catch {}
  }

  async function api(path, opts = {}) {
    const res = await fetch("/api/" + path, {
      method: opts.method || "GET",
      headers: opts.body ? { "content-type": "application/json" } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data.error || "Das hat nicht geklappt. Bitte prüf deine Internetverbindung und versuch es noch einmal.");
    return data;
  }

  function parseDate(iso, time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return null;
    const [y, m, d] = iso.split("-").map(Number);
    const [hh, mm] = /^\d{1,2}:\d{2}/.test(time || "") ? time.split(":").map(Number) : [0, 0];
    return new Date(y, m - 1, d, hh, mm);
  }
  const fmtLong = (d) => d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtShort = (d) => d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

  // ---------- Kopfbereich ----------
  function renderNav(c) {
    const nav = document.querySelector(".hero nav");
    const again = document.getElementById("again");
    const links = c.eveningMode ? [["#heute", "Heute Abend"], ["#infos", "Infos"]] : [["#infos", "Infos"]];
    if (c.recapOpen) links.unshift(["/rueckblick", "Rückblick"]);
    if (c.flowNote || (c.schedule && c.schedule.length)) links.push(["#ablauf", "Ablauf"]);
    links.push(["#essen", c.courses.length ? "Essen wählen" : "Essen"]);

    nav.replaceChildren(...links.map(([href, t]) => h("a", { href, text: t })), again);
  }

  function renderHero(c) {
    renderNav(c);
    const title = c.title || "Die goldenen Dreißiger";
    document.title = title;
    document.getElementById("title").textContent = title;
    const it = document.getElementById("intro-title");
    if (it) it.textContent = title;
    const il = document.getElementById("intro-lead");
    if (il) il.textContent = c.hosts ? `${c.hosts} werden 30 – und ihr seid eingeladen.` : "Psst, ihr seid eingeladen.";
    document.getElementById("hosts").textContent = c.hosts ? `${c.hosts} werden 30` : "";
    const date = parseDate(c.date, c.time);
    const when = document.getElementById("when");
    const cd = document.getElementById("countdown");
    when.textContent = date ? fmtLong(date) + (c.time ? `, ab ${c.time} Uhr` : "") : "";
    if (date) {
      document.getElementById("strip-caption").textContent = fmtShort(date);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const day = new Date(date); day.setHours(0, 0, 0, 0);
      const diff = Math.round((day - today) / 86400000);
      cd.textContent = diff > 1 ? `Noch ${diff} Tage` : diff === 1 ? "Morgen ist es so weit" : diff === 0 ? "Heute ist es so weit" : "";
    }
  }

  // ---------- Infos ----------
  function renderInfos(c) {
    const out = [];
    const date = parseDate(c.date, c.time);
    const facts = h("dl", { class: "facts" });
    const add = (k, v) => { if (v) facts.append(h("dt", { text: k }), h("dd", { class: "pre", text: v })); };
    add("Datum", date ? fmtLong(date) : "");
    add("Beginn", c.time ? `${c.time} Uhr` : "");
    add("Ende", c.endTime);
    add("Adresse", c.address);
    add("Dresscode", c.dresscode);
    const mapsUrl = c.address
      ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([c.venueName, c.address].filter(Boolean).join(", "))
      : null;
    const hasAny = c.venueName || c.address || date;
    out.push(h("section", { id: "infos", "aria-labelledby": "infos-h" },
      h("h2", { id: "infos-h", text: "Wann und wo" }),
      hasAny ? null : h("p", { class: "muted", text: "Die Infos zur Location folgen hier in Kürze." }),
      c.venueName ? h("p", { class: "venue-name", text: c.venueName }) : null,
      facts.children.length ? facts : null,
      mapsUrl ? h("a", { class: "btn secondary", href: mapsUrl, target: "_blank", rel: "noopener" }, "Route in Google Maps öffnen") : null
    ));

    const hasSchedule = c.schedule && c.schedule.length;
    if (c.flowNote || hasSchedule) {
      out.push(h("section", { id: "ablauf", "aria-labelledby": "ablauf-h" },
        h("h2", { id: "ablauf-h", text: "Ablauf" }),
        c.flowNote ? rich(c.flowNote) : null,
        hasSchedule ? h("ol", { class: "schedule" }, c.schedule.map((r) =>
          h("li", {}, h("span", { class: "s-time", text: r.time || "" }), h("span", { class: "s-what", text: r.what })))) : null
      ));
    }
    if (c.venueNote || c.parking) {
      out.push(h("section", { id: "anreise", "aria-labelledby": "anreise-h" },
        h("h2", { id: "anreise-h", text: "Anreise und Parken" }),
        c.venueNote ? rich(c.venueNote) : null,
        c.parking ? h("h3", { text: "Parken" }) : null,
        c.parking ? rich(c.parking) : null
      ));
    }
    if (c.stay) {
      out.push(h("section", { id: "uebernachten", "aria-labelledby": "stay-h" },
        h("h2", { id: "stay-h", text: "Übernachten" }), rich(c.stay)));
    }
    return out;
  }

  function renderContact(c) {
    if (!c.contact) return null;
    return h("section", { id: "fragen", "aria-labelledby": "fragen-h" },
      h("h2", { id: "fragen-h", text: "Fragen?" }), rich(c.contact));
  }

  function renderMemories(c) {
    return h("section", { id: "statt-geschenken", "aria-labelledby": "gift-h" },
      h("div", { class: "memories" },
        h("img", { class: "mem-wide", src: "/img/wir-jubel.jpg", alt: "Die beiden Geburtstagskinder jubelnd im Schnee", loading: "lazy" }),
        h("figure", { class: "mem-polaroid" },
          h("img", { src: "/img/wir-2013.jpg", alt: "Die beiden Geburtstagskinder im Jahr 2013", loading: "lazy" }),
          h("figcaption", { text: "2013" })
        )
      ),
      h("h2", { id: "gift-h", text: "Statt Geschenken" }),
      h("p", { class: "pre", text: c.giftNote })
    );
  }

  // ---------- Namensauswahl (für Essen und Foto) ----------
  function nameField(id, labelText, onPick) {
    const c = state.config;
    const select = h("select", { id },
      h("option", { value: "", text: "Bitte auswählen" }),
      state.guests.map((g) => h("option", { value: g.id, text: g.name })),
      c.allowFreeName ? h("option", { value: "__new", text: "Mein Name fehlt in der Liste" }) : null
    );
    const extra = h("div");
    select.addEventListener("change", () => {
      extra.replaceChildren();
      if (select.value === "__new") {
        const input = h("input", { type: "text", id: id + "-new", autocomplete: "name", maxlength: "80" });
        const btn = h("button", { type: "button", class: "btn small" }, "Namen hinzufügen");
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          try {
            const res = await api("guests", { method: "POST", body: { name: input.value } });
            await reload();
            lastGuestId = res.id;
            render();
            document.getElementById(id)?.scrollIntoView({ block: "center" });
            toast("Name hinzugefügt");
          } catch (e) {
            extra.querySelector(".notice")?.remove();
            extra.append(h("p", { class: "notice error", text: e.message }));
          } finally { btn.disabled = false; }
        });
        extra.append(h("label", { for: id + "-new", text: "Dein Vor- und Nachname" }), input, h("p", {}, btn));
        input.focus();
        onPick(null);
      } else {
        lastGuestId = select.value;
        onPick(select.value || null);
      }
    });
    return { el: h("div", {}, h("label", { for: id, text: labelText }), select, extra), select };
  }

  function lockedNotice() {
    return h("p", { class: "notice", text: "Für diesen Namen wurde schon auf einem anderen Gerät gespeichert. Ändern kannst du es dort – oder sag uns kurz Bescheid, dann machen wir das." });
  }

  // ---------- Essensauswahl ----------
  function renderFood() {
    const c = state.config;
    const noMenu = !c.courses.length;
    const section = h("section", { id: "essen", "aria-labelledby": "essen-h" }, h("h2", { id: "essen-h", text: noMenu ? "Essen" : "Essen wählen" }));
    if (!c.foodOpen) {
      section.append(h("p", { class: "notice", text: "Die Essensauswahl ist abgeschlossen. Wenn du noch etwas ändern möchtest, melde dich bitte bei uns." }));
      return section;
    }
    if (c.foodIntro) section.append(h("p", { class: "pre", text: c.foodIntro }));
    if (noMenu) section.append(h("p", { class: "notice", text: "Das Menü steht noch nicht fest. Sagt uns aber schon jetzt, worauf die Küche bei euch achten soll. Euer Gericht wählt ihr dann hier aus – wir sagen Bescheid, sobald es so weit ist." }));
    const deadline = parseDate(c.foodDeadline);
    if (deadline) section.append(h("p", { class: "muted", text: `Bitte bis ${fmtShort(deadline)}.` }));

    const formArea = h("div");
    const field = nameField("food-name", "1. Wer bist du?", (gid) => showForm(gid));
    section.append(field.el, formArea);

    async function showForm(gid) {
      formArea.replaceChildren();
      if (!gid) return;
      const guest = state.guests.find((g) => g.id === gid);
      const token = getTokens()[gid];
      if (guest.locked && !token) { formArea.append(lockedNotice()); return; }

      let mine = null;
      if (token) {
        formArea.append(h("p", { class: "muted", text: "Deine bisherige Auswahl wird geladen …" }));
        try { mine = await api(`guests/${encodeURIComponent(gid)}?token=${encodeURIComponent(token)}`); } catch {}
        formArea.replaceChildren();
        if (mine && !mine.mine) mine = null;
      }

      const form = h("form", { novalidate: true });
      if (!noMenu) form.append(h("p", { class: "step", text: "2. Was möchtest du essen?" }));
      for (const course of c.courses) {
        const fs = h("fieldset", {}, h("legend", { text: course.name }));
        for (const o of course.options) {
          const checked = mine?.choices?.[course.id] === o.id;
          fs.append(h("label", { class: "choice" },
            h("input", { type: "radio", name: "c-" + course.id, value: o.id, checked, required: true }),
            h("span", {}, h("strong", { text: o.label }), o.desc ? h("small", { text: o.desc }) : null)
          ));
        }
        form.append(fs);
      }
      const diet = h("textarea", { id: "food-diet", maxlength: "500", rows: "2" });
      diet.value = mine?.diet || "";
      const tagBoxes = (c.dietOptions || []).map((t) => {
        const box = h("input", { type: "checkbox", value: t, checked: (mine?.dietTags || []).includes(t) });
        return { box, el: h("label", { class: "tick" }, box, h("span", { text: t })) };
      });
      const note = h("textarea", { id: "food-note", maxlength: "500" });
      note.value = mine?.note || "";
      const msg = h("div", { "aria-live": "polite" });
      const submit = h("button", { type: "submit", class: "btn wide" }, mine?.choices ? "Änderung speichern" : noMenu ? "Angaben speichern" : "Auswahl speichern");
      form.append(...[
        h("p", { class: "step", text: (noMenu ? "2" : "3") + ". Worauf soll die Küche achten?" }),
        h("p", { class: "hint", text: "Einfach antippen, was für dich gilt. Wenn nichts zutrifft, kannst du das überspringen." }),
        tagBoxes.length ? h("div", { class: "ticks" }, tagBoxes.map((t) => t.el)) : null,
        h("label", { for: "food-diet" }, "Andere Allergien oder Unverträglichkeiten ", h("span", { class: "hint", text: "(optional)" })),
        diet,
        h("label", { for: "food-note" }, "Noch etwas für uns? ", h("span", { class: "hint", text: "(optional)" })),
        note,
        msg,
        submit
      ].filter(Boolean));
      form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        msg.replaceChildren();
        const choices = {};
        for (const course of c.courses) {
          const picked = form.querySelector(`input[name="c-${CSS.escape(course.id)}"]:checked`);
          if (!picked) { msg.append(h("p", { class: "notice error", text: `Bitte wähle etwas beim Gang „${course.name}“ aus.` })); return; }
          choices[course.id] = picked.value;
        }
        submit.disabled = true;
        try {
          const res = await api(`guests/${encodeURIComponent(gid)}/choice`, {
            method: "POST", body: { token: getTokens()[gid], choices, dietTags: tagBoxes.filter((t) => t.box.checked).map((t) => t.box.value), diet: diet.value, note: note.value },
          });
          setToken(gid, res.token);
          guest.done = true; guest.locked = true;
          toast(noMenu ? "Angaben gespeichert" : "Auswahl gespeichert");
          const tags = tagBoxes.filter((t) => t.box.checked).map((t) => t.box.value);
          const summary = c.courses.map((co) => `${co.name}: ${co.options.find((o) => o.id === choices[co.id])?.label}`)
            .concat(tags.length ? ["Bitte beachten: " + tags.join(", ")] : [])
            .concat(diet.value.trim() ? [diet.value.trim()] : []).join("\n");
          const again = h("button", { type: "button", class: "btn secondary wide" }, "Für eine weitere Person wählen");
          again.addEventListener("click", () => {
            field.select.value = ""; lastGuestId = ""; formArea.replaceChildren(); field.select.focus();
          });
          formArea.replaceChildren(
            h("div", { class: "notice ok" },
              h("p", {}, h("strong", { text: `Danke${/^Begleitung/.test(guest.name) ? "" : ", " + guest.name.split(" ")[0]}! ${noMenu ? "Deine Angaben sind" : "Deine Auswahl ist"} gespeichert.` })),
              summary ? h("p", { class: "pre small", text: summary }) : h("p", { class: "small", text: "Keine besonderen Wünsche – alles klar!" }),
              h("p", { class: "small muted", text: noMenu ? "Sobald das Menü da ist, kannst du hier auf diesem Gerät dein Gericht ergänzen." : "Du kannst sie auf diesem Gerät jederzeit ändern, solange die Auswahl offen ist." })
            ),
            again
          );
        } catch (e) {
          msg.append(h("p", { class: "notice error", text: e.message }));
        } finally { submit.disabled = false; }
      });
      formArea.append(form);
    }

    if (lastGuestId && state.guests.some((g) => g.id === lastGuestId)) {
      field.select.value = lastGuestId;
      showForm(lastGuestId);
    }
    return section;
  }

  // ---------- Kindheitsfoto ----------
  async function compressImage(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Dieses Bild kann der Browser nicht öffnen. Bitte versuch es mit einem JPG- oder PNG-Foto."));
        i.src = url;
      });
      const max = 1000;
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      let q = 0.85, data = canvas.toDataURL("image/jpeg", q);
      while (data.length > 1_000_000 && q > 0.4) { q -= 0.1; data = canvas.toDataURL("image/jpeg", q); }
      return data;
    } finally { URL.revokeObjectURL(url); }
  }

  // ---------- Abend-Modus ----------
  const params = new URLSearchParams(location.search);
  const cardParam = parseInt(params.get("karte") || "", 10);
  function getMe() { try { return localStorage.getItem("p30-me") || ""; } catch { return ""; } }
  function setMe(id) { try { localStorage.setItem("p30-me", id); } catch {} }
  let voterId = "";
  try {
    voterId = localStorage.getItem("p30-voter") || "";
    if (!voterId) { voterId = crypto.randomUUID(); localStorage.setItem("p30-voter", voterId); }
  } catch { voterId = voterId || Math.random().toString(36).slice(2) + Date.now().toString(36); }
  let livePoll = null;

  function meSelect(id, label, required) {
    const select = h("select", { id, class: "me-select" },
      h("option", { value: "", text: required ? "Bitte auswählen" : "Ohne Namen" }),
      state.guests.map((g) => h("option", { value: g.id, text: g.name })));
    const me = getMe();
    if (me && state.guests.some((g) => g.id === me)) select.value = me;
    select.addEventListener("change", () => {
      if (!select.value) return;
      setMe(select.value);
      document.querySelectorAll(".me-select").forEach((o) => { if (o !== select) o.value = select.value; });
    });
    return { select, el: h("div", {}, h("label", { for: id, text: label }), select) };
  }

  function renderVoteBox() {
    const box = h("div", { class: "evening-card", id: "abstimmung", "aria-live": "polite" });
    let lastKey = "";
    async function tick() {
      let live;
      try { live = await api("live"); } catch { return; }
      if (!live.active) return;
      const key = JSON.stringify([live.status, live.question && live.question.id, live.status === "closed" ? live.counts : null]);
      if (key === lastKey && live.status !== "closed") return;
      lastKey = key;
      draw(live);
    }
    function myVote(qid) { try { return localStorage.getItem("p30-vote-" + qid) || ""; } catch { return ""; } }
    function draw(live) {
      box.replaceChildren(h("h3", { class: "evening-h", text: "Sophie oder Anne?" }));
      if (live.status === "idle" || !live.question) {
        box.append(h("p", { class: "muted", text: "Gleich geht's los. Sobald eine Frage auf der Leinwand erscheint, stimmst du hier ab." }));
        return;
      }
      const q = live.question;
      box.append(h("p", { class: "vote-q", text: q.text }));
      if (live.status === "open") {
        const mine = myVote(q.id);
        const btn = (choice, name) => {
          const b = h("button", { type: "button", class: "vote-btn" + (mine === choice ? " chosen" : ""), "aria-pressed": String(mine === choice) }, name);
          b.addEventListener("click", async () => {
            try {
              await api("vote", { method: "POST", body: { questionId: q.id, voter: voterId, choice } });
              try { localStorage.setItem("p30-vote-" + q.id, choice); } catch {}
              toast(`Stimme für ${name} gezählt`);
              lastKey = ""; draw(live);
            } catch (e) { toast(e.message); }
          });
          return b;
        };
        box.append(h("div", { class: "vote-btns" }, btn("sophie", "Sophie"), btn("anne", "Anne")));
        box.append(h("p", { class: "small muted", text: mine ? "Deine Stimme ist gezählt. Du kannst noch umentscheiden, bis das Ergebnis kommt." : "Tipp auf einen Namen." }));
      } else {
        const c = live.counts || { sophie: 0, anne: 0, total: 0 };
        const pct = (n) => (c.total ? Math.round((n / c.total) * 100) : 0);
        const row = (name, n) => h("div", { class: "result-row" },
          h("span", { class: "result-name", text: name }),
          h("span", { class: "result-bar" }, h("span", { style: `width:${pct(n)}%` })),
          h("span", { class: "result-num", text: `${pct(n)} %` }));
        box.append(row("Sophie", c.sophie), row("Anne", c.anne), h("p", { class: "small muted", text: `${c.total} Stimmen` }));
      }
    }
    tick();
    clearInterval(livePoll);
    livePoll = setInterval(tick, 3000);
    return box;
  }

  function uploadArea({ multiple, withCard }) {
    const area = h("div");
    const who = meSelect(withCard ? "proof-name" : "pics-name", "Wer bist du?", withCard);
    const cardInput = withCard ? h("input", { type: "number", id: "proof-card", inputmode: "numeric", min: "1", max: "999", placeholder: "z. B. 7" }) : null;
    if (cardInput && cardParam > 0) cardInput.value = String(cardParam);
    const caption = withCard ? h("input", { type: "text", id: "proof-caption", maxlength: "140", placeholder: "z. B. „Mission erfüllt!“" }) : null;
    const fileId = withCard ? "proof-file" : "pics-file";
    const file = h("input", { type: "file", id: fileId, accept: "image/*", multiple: multiple || null });
    const preview = h("div", { class: "upload-previews" });
    const msg = h("div", { "aria-live": "polite" });
    const btn = h("button", { type: "button", class: "btn wide", disabled: true }, multiple ? "Fotos hochladen" : "Beweisfoto hochladen");
    let datas = [];
    file.addEventListener("change", async () => {
      msg.replaceChildren(); preview.replaceChildren(); datas = []; btn.disabled = true;
      const files = [...file.files].slice(0, 20);
      if (file.files.length > 20) msg.append(h("p", { class: "notice", text: "Es werden die ersten 20 Fotos genommen. Den Rest einfach danach hochladen." }));
      for (const f of files) {
        try {
          const d = await compressImage(f);
          datas.push(d);
          preview.append(h("img", { src: d, alt: "" }));
        } catch (e) { msg.append(h("p", { class: "notice error", text: e.message })); }
      }
      btn.disabled = !datas.length;
      btn.textContent = multiple ? (datas.length === 1 ? "1 Foto hochladen" : `${datas.length} Fotos hochladen`) : "Beweisfoto hochladen";
    });
    btn.addEventListener("click", async () => {
      msg.replaceChildren();
      if (withCard && !who.select.value) { msg.append(h("p", { class: "notice error", text: "Bitte wähle aus, wer du bist." })); who.select.focus(); return; }
      if (withCard && !cardInput.value) { msg.append(h("p", { class: "notice error", text: "Bitte trag die Nummer von deiner Karte ein." })); cardInput.focus(); return; }
      btn.disabled = true;
      let done = 0;
      for (const d of datas) {
        btn.textContent = datas.length > 1 ? `Wird hochgeladen … ${done + 1} von ${datas.length}` : "Wird hochgeladen …";
        try {
          await api("uploads", { method: "POST", body: { guestId: who.select.value || null, card: cardInput ? cardInput.value : null, caption: caption ? caption.value : "", image: d } });
          done++;
        } catch (e) { msg.append(h("p", { class: "notice error", text: e.message })); break; }
      }
      if (done) {
        if (window.fireConfetti) window.fireConfetti();
        toast(done === 1 ? "Foto hochgeladen" : `${done} Fotos hochgeladen`);
        file.value = ""; preview.replaceChildren(); datas = [];
        if (caption) caption.value = "";
        if (cardInput) cardInput.value = "";
        msg.append(h("p", { class: "notice ok", text: withCard ? "Beweis angekommen! Gleich ist dein Foto auf der Leinwand." : (done === 1 ? "Danke! Dein Foto ist jetzt in der Sammlung und gleich auf der Leinwand." : `Danke! ${done} Fotos sind jetzt in der Sammlung und gleich auf der Leinwand.`) }));
        refreshGallery();
      }
      btn.textContent = multiple ? "Fotos hochladen" : "Beweisfoto hochladen";
      btn.disabled = true;
    });
    area.append(...[
      who.el,
      withCard ? h("label", { for: "proof-card", text: "Nummer auf deiner Karte" }) : null, cardInput,
      h("label", { for: fileId, text: multiple ? "Fotos auswählen (auch mehrere)" : "Foto aufnehmen oder auswählen" }), file,
      preview,
      withCard ? h("label", { for: "proof-caption" }, "Kurzer Kommentar ", h("span", { class: "hint", text: "(optional)" })) : null, caption,
      msg, btn,
    ].filter(Boolean));
    return area;
  }

  const gallery = h("div", { class: "mini-gallery" });
  async function refreshGallery() {
    try {
      const { uploads } = await api("uploads");
      gallery.replaceChildren(...uploads.slice(0, 12).map((u) =>
        h("img", { src: "/api/uploads/" + encodeURIComponent(u.id), alt: u.guestName ? "Foto von " + u.guestName : "Foto vom Abend", loading: "lazy" })));
    } catch {}
  }

  function renderTonight(c) {
    const sec = h("section", { id: "heute", class: "tonight", "aria-labelledby": "heute-h" },
      h("h2", { id: "heute-h", text: "Heute Abend" }),
      c.eveningNote ? h("p", { class: "pre", text: c.eveningNote }) : null,
      renderVoteBox(),
      h("div", { class: "evening-card", id: "beweis" },
        h("h3", { class: "evening-h", text: "Beweisfoto für deine Karte" }),
        h("p", { class: "muted small", text: "Aufgabe erledigt? Foto machen, Kartennummer eintragen, fertig." }),
        uploadArea({ multiple: false, withCard: true })),
      h("div", { class: "evening-card", id: "fotos" },
        h("h3", { class: "evening-h", text: "Fotos vom Abend" }),
        h("p", { class: "muted small", text: "Alle Schnappschüsse von heute – sie landen auf der Leinwand und später in eurer Erinnerung an den Abend." }),
        uploadArea({ multiple: true, withCard: false })),
      h("div", { class: "evening-card" },
        h("h3", { class: "evening-h", text: "Neueste Fotos" }), gallery)
    );
    refreshGallery();
    return sec;
  }

  function renderRecapBanner() {
    return h("section", { class: "recap-banner" },
      h("h2", { text: "Der Abend in Zahlen" }),
      h("p", { text: "Danke, dass ihr dabei wart! Hier gibt's alle Zahlen, Ergebnisse und Fotos zum Anschauen und Herunterladen." }),
      h("a", { class: "btn", href: "/rueckblick" }, "Rückblick öffnen"));
  }

  function render() {
    const c = state.config;
    renderHero(c);
    if (!c.eveningMode) clearInterval(livePoll);
    app.replaceChildren(
      c.recapOpen ? renderRecapBanner() : "",
      c.eveningMode ? renderTonight(c) : "",
      !c.eveningMode && cardParam > 0 ? h("p", { class: "notice", text: "Die Karten-Aktion startet am Abend der Party. Bis dann!" }) : "",
      ...renderInfos(c),
      renderMemories(c),
      renderFood(),
      renderContact(c) || ""
    );
  }

  async function reload() { state = await api("public"); }

  (async () => {
    try {
      await reload();
      render();
      if (cardParam > 0 && state.config.eveningMode) document.getElementById("beweis")?.scrollIntoView();
      else if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
    } catch (e) {
      app.replaceChildren(h("p", { class: "notice error", text: "Die Seite konnte nicht geladen werden. Bitte lade sie neu. (" + e.message + ")" }));
    }
  })();
})();

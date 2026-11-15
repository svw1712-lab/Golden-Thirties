(() => {
  "use strict";
  const root = document.getElementById("admin");
  const dlg = document.getElementById("dlg");
  let pin = "";
  try { pin = sessionStorage.getItem("p30-pin") || ""; } catch {}
  let state = null;
  let tab = "overview";

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
  const toastEl = document.getElementById("toast");
  let tt;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove("show"), 3000); }

  async function api(path, opts = {}) {
    const res = await fetch("/api/admin/" + path, {
      method: opts.method || "GET",
      headers: { "x-admin-pin": pin, ...(opts.body ? { "content-type": "application/json" } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (res.status === 401) { logout(); throw new Error(data.error || "Die PIN stimmt nicht."); }
    if (!res.ok) throw new Error(data.error || "Das hat nicht geklappt.");
    return data;
  }

  function logout() { pin = ""; try { sessionStorage.removeItem("p30-pin"); } catch {} }

  async function copy(text, done) {
    try { await navigator.clipboard.writeText(text); toast(done); }
    catch {
      openDialog("Zum Kopieren markieren", h("textarea", { style: "min-height:14rem" }, text));
    }
  }

  function openDialog(title, ...content) {
    dlg.replaceChildren(h("h2", { text: title }), ...content);
    const close = h("button", { type: "button", class: "btn secondary" }, "Schließen");
    close.addEventListener("click", () => dlg.close());
    dlg.append(h("p", {}, close));
    dlg.showModal();
  }

  const courseLabel = (course, optId) => course.options.find((o) => o.id === optId)?.label || (optId ? "(entfernte Option)" : "–");
  const hasMeal = (g) => state.config.courses.length > 0 && !!g.choices && state.config.courses.every((c) => g.choices[c.id]);
  const isDone = (g) => (state.config.courses.length ? hasMeal(g) : !!g.choices);
  const dietText = (g) => [...(g.dietTags || []), g.diet].filter(Boolean).join(", ");
  const choiceText = (g) => g.choices ? state.config.courses.map((c) => `${c.name}: ${courseLabel(c, g.choices[c.id])}`).join(", ") : "";

  // ---------- Login ----------
  function renderLogin(err) {
    const input = h("input", { type: "password", id: "pin", inputmode: "numeric", autocomplete: "current-password" });
    const form = h("form", {},
      h("h2", { text: "Anmelden" }),
      h("p", { class: "muted", text: "Gib die Admin-PIN ein, die ihr in Cloudflare festgelegt habt." }),
      h("label", { for: "pin", text: "PIN" }), input,
      err ? h("p", { class: "notice error", text: err }) : null,
      h("button", { class: "btn", type: "submit" }, "Anmelden")
    );
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      pin = input.value.trim();
      try {
        await load();
        try { sessionStorage.setItem("p30-pin", pin); } catch {}
        render();
      } catch (er) { renderLogin(er.message); }
    });
    root.replaceChildren(form);
    input.focus();
  }

  async function load() { state = await api("state"); }

  // ---------- Übersicht ----------
  function overview() {
    const { guests, config } = state;
    const noMenu = !config.courses.length;
    const done = guests.filter(isDone);
    const open = guests.filter((g) => !isDone(g));
    const wrap = h("section", {},
      noMenu ? h("p", { class: "notice", text: "Noch kein Menü eingetragen: Gäste können bisher nur Ernährung und Unverträglichkeiten angeben. Das Menü tragt ihr unter „Einstellungen“ → „Essen“ ein." }) : null,
      h("div", { class: "stats" },
        h("div", {}, h("strong", { text: guests.length }), "Gäste"),
        h("div", {}, h("strong", { text: done.length }), noMenu ? "haben Angaben gemacht" : "Essen gewählt"),
        h("div", {}, h("strong", { text: open.length }), "noch offen")
      )
    );

    for (const course of config.courses) {
      const rows = course.options.map((o) => {
        const who = guests.filter((g) => g.choices && g.choices[course.id] === o.id);
        return h("tr", {}, h("td", { text: o.label }), h("td", { text: who.length }), h("td", { class: "muted", text: who.map((g) => g.name).join(", ") }));
      });
      wrap.append(h("h3", { text: course.name }),
        h("div", { class: "table-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", { text: "Gericht" }), h("th", { text: "Anzahl" }), h("th", { text: "Wer" }))), h("tbody", {}, rows))));
    }

    const diets = guests.filter((g) => g.diet || (g.dietTags && g.dietTags.length));
    wrap.append(h("h3", { text: "Ernährung, Allergien und Unverträglichkeiten" }),
      diets.length ? h("ul", {}, diets.map((g) => h("li", {}, h("strong", { text: g.name + ": " }), dietText(g)))) : h("p", { class: "muted", text: "Bisher keine angegeben." }));
    const notes = guests.filter((g) => g.note);
    if (notes.length) wrap.append(h("h3", { text: "Nachrichten an euch" }), h("ul", {}, notes.map((g) => h("li", {}, h("strong", { text: g.name + ": " }), g.note))));

    wrap.append(h("h3", { text: noMenu ? "Noch keine Angaben" : "Haben noch kein Gericht gewählt" }),
      open.length ? h("p", { text: open.map((g) => g.name).join(", ") }) : h("p", { class: "muted", text: noMenu ? "Alle haben ihre Angaben gemacht." : "Alle haben gewählt." }));

    const sumBtn = h("button", { class: "btn" }, "Zusammenfassung fürs Restaurant kopieren");
    sumBtn.addEventListener("click", () => copy(restaurantSummary(), "Zusammenfassung kopiert"));
    const csvBtn = h("button", { class: "btn secondary" }, "Als Tabelle (CSV) herunterladen");
    csvBtn.addEventListener("click", downloadCsv);
    const remindBtn = h("button", { class: "btn secondary" }, "Erinnerung für Nachzügler kopieren");
    remindBtn.addEventListener("click", () => copy(
      `Kleine Erinnerung: Bitte tragt noch eure Essens-Angaben für unseren 30. ein – das geht ganz schnell hier: ${location.origin}/#essen\nNoch offen: ${open.map((g) => g.name).join(", ")}`,
      "Erinnerung kopiert"));
    wrap.append(h("div", { class: "row-actions" }, sumBtn, csvBtn, open.length ? remindBtn : null));
    return wrap;
  }

  function restaurantSummary() {
    const { guests, config } = state;
    const done = guests.filter(isDone);
    const lines = [`${config.title}${config.date ? " – " + config.date : ""}`, `Gäste: ${guests.length} (Angaben vorhanden: ${done.length})`, ""];
    for (const c of config.courses) {
      lines.push(c.name + ":");
      for (const o of c.options) lines.push(`  ${guests.filter((g) => g.choices && g.choices[c.id] === o.id).length} × ${o.label}`);
      lines.push("");
    }
    const tagCounts = {};
    guests.forEach((g) => (g.dietTags || []).forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    if (Object.keys(tagCounts).length) { lines.push("Ernährung:"); for (const [t, n] of Object.entries(tagCounts)) lines.push(`  ${n} × ${t}`); lines.push(""); }
    const diets = guests.filter((g) => g.diet || (g.dietTags && g.dietTags.length));
    if (diets.length) { lines.push("Allergien/Unverträglichkeiten pro Person:"); diets.forEach((g) => lines.push(`  ${g.name}: ${dietText(g)}`)); }
    return lines.join("\n");
  }

  function downloadCsv() {
    const { guests, config } = state;
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Name", ...config.courses.map((c) => c.name), "Ernährung", "Allergien/Sonstiges", "Nachricht"];
    const rows = guests.map((g) => [g.name, ...config.courses.map((c) => g.choices ? courseLabel(c, g.choices[c.id]) : ""), (g.dietTags || []).join(", "), g.diet, g.note]);
    const csv = "﻿" + [header, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
    const a = h("a", { href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), download: "essensauswahl.csv" });
    document.body.append(a); a.click(); a.remove();
  }

  // ---------- Gäste ----------
  function guestsTab() {
    const ta = h("textarea", { id: "new-names", placeholder: "Ein Name pro Zeile", style: "min-height:8rem" });
    const addBtn = h("button", { class: "btn" }, "Namen hinzufügen");
    addBtn.addEventListener("click", async () => {
      const names = ta.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      if (!names.length) return;
      addBtn.disabled = true;
      try {
        const r = await api("guests", { method: "POST", body: { names } });
        await load(); render();
        toast(`${r.added} ${r.added === 1 ? "Name" : "Namen"} hinzugefügt`);
      } catch (e) { toast(e.message); addBtn.disabled = false; }
    });

    const rows = state.guests.map((g) => {
      const edit = h("button", { class: "linkish" }, "Bearbeiten");
      edit.addEventListener("click", () => editGuest(g));
      const del = h("button", { class: "linkish danger" }, "Löschen");
      del.addEventListener("click", async () => {
        if (!confirm(`${g.name} mit Auswahl und Foto endgültig löschen?`)) return;
        await api("guests/" + encodeURIComponent(g.id), { method: "DELETE" });
        await load(); render(); toast("Gelöscht");
      });
      return h("tr", {},
        h("td", {}, g.name, g.selfAdded ? h("div", { class: "small muted", text: "selbst eingetragen" }) : null),
        h("td", {}, h("span", { class: "tag" + (isDone(g) ? " done" : ""), text: isDone(g) ? (state.config.courses.length ? "gewählt" : "Angaben da") : g.choices ? "nur Unverträglichkeiten" : "offen" })),
        h("td", { class: "small", text: choiceText(g) + (dietText(g) ? ` (${dietText(g)})` : "") }),
        h("td", {}, h("div", { class: "row-actions" }, edit, del))
      );
    });

    return h("section", {},
      h("h2", { text: "Gästeliste" }),
      h("p", { class: "muted", text: "Tragt hier alle Gäste ein. Sie wählen auf der Gästeseite ihren Namen aus und dann ihr Essen. Für jemanden ohne Handy könnt ihr die Auswahl über „Bearbeiten“ selbst eintragen." }),
      h("label", { for: "new-names", text: "Namen hinzufügen" }), ta, addBtn,
      h("h3", { text: `Alle Gäste (${state.guests.length})` }),
      state.guests.length
        ? h("div", { class: "table-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", { text: "Name" }), h("th", { text: "Status" }), h("th", { text: "Auswahl" }), h("th", { text: "" }))), h("tbody", {}, rows)))
        : h("p", { class: "muted", text: "Noch keine Gäste eingetragen. Füg oben die Namen ein." })
    );
  }

  function editGuest(g) {
    const config = state.config;
    const name = h("input", { type: "text", id: "e-name", value: g.name });
    const selects = config.courses.map((c) => {
      const s = h("select", { id: "e-" + c.id }, h("option", { value: "", text: "– noch nicht gewählt –" }),
        c.options.map((o) => h("option", { value: o.id, text: o.label })));
      s.value = g.choices?.[c.id] || "";
      return [h("label", { for: "e-" + c.id, text: c.name }), s];
    });
    const diet = h("textarea", { id: "e-diet" }); diet.value = g.diet;
    const tagBoxes = (config.dietOptions || []).map((t) => {
      const box = h("input", { type: "checkbox", value: t, checked: (g.dietTags || []).includes(t) });
      return { box, el: h("label", { class: "tick" }, box, h("span", { text: t })) };
    });
    const note = h("textarea", { id: "e-note" }); note.value = g.note;
    const msg = h("div");
    const save = h("button", { class: "btn" }, "Speichern");
    save.addEventListener("click", async () => {
      msg.replaceChildren();
      const choices = {};
      config.courses.forEach((c, i) => { choices[c.id] = selects[i][1].value; });
      const anyChosen = Object.values(choices).some(Boolean);
      const body = { name: name.value };
      if (anyChosen || !config.courses.length) Object.assign(body, { choices, dietTags: tagBoxes.filter((t) => t.box.checked).map((t) => t.box.value), diet: diet.value, note: note.value });
      try {
        await api("guests/" + encodeURIComponent(g.id), { method: "PATCH", body });
        dlg.close(); await load(); render(); toast("Gespeichert");
      } catch (e) { msg.append(h("p", { class: "notice error", text: e.message })); }
    });
    const extras = [];
    if (g.locked) {
      const unlock = h("button", { class: "linkish" }, "Gerätesperre aufheben");
      unlock.addEventListener("click", async () => {
        await api("guests/" + encodeURIComponent(g.id), { method: "PATCH", body: { unlock: true } });
        dlg.close(); await load(); render(); toast("Sperre aufgehoben – jetzt kann von jedem Gerät gewählt werden");
      });
      extras.push(h("p", { class: "small muted" }, "Die Auswahl wurde auf einem Gerät gespeichert und ist dort änderbar. ", unlock));
    }
    if (g.choices) {
      const clear = h("button", { class: "linkish danger" }, "Auswahl löschen");
      clear.addEventListener("click", async () => {
        await api("guests/" + encodeURIComponent(g.id), { method: "PATCH", body: { clearChoice: true } });
        dlg.close(); await load(); render(); toast("Auswahl gelöscht");
      });
      extras.push(h("p", { class: "small" }, clear));
    }
    openDialog(g.name,
      h("label", { for: "e-name", text: "Name" }), name,
      selects,
      tagBoxes.length ? h("div", { class: "ticks" }, tagBoxes.map((t) => t.el)) : null,
      h("label", { for: "e-diet", text: "Andere Allergien oder Unverträglichkeiten" }), diet,
      h("label", { for: "e-note", text: "Nachricht" }), note,
      msg, save, extras);
  }

  // ---------- Fotos vom Abend ----------
  async function adminImage(id) {
    const r = await fetch("/api/admin/uploads/" + encodeURIComponent(id), { headers: { "x-admin-pin": pin } });
    if (!r.ok) throw new Error();
    return URL.createObjectURL(await r.blob());
  }
  function photosTab() {
    const list = state.uploads || [];
    const grid = h("div", { class: "photo-grid" });
    for (const u of list) {
      const img = h("img", { alt: u.guestName ? "Foto von " + u.guestName : "Foto vom Abend", loading: "lazy" });
      const dl = h("a", { class: "small", text: "Speichern" });
      const del = h("button", { class: "linkish danger small" }, "Löschen");
      del.addEventListener("click", async () => {
        if (!confirm("Dieses Foto endgültig löschen? Es verschwindet auch von der Leinwand und aus dem Rückblick.")) return;
        await api("uploads/" + encodeURIComponent(u.id), { method: "DELETE" });
        await load(); render(); toast("Foto gelöscht");
      });
      const label = [u.guestName || "Ohne Namen", u.card ? `Karte ${u.card}` : null].filter(Boolean).join(" · ");
      grid.append(h("figure", {}, img,
        h("figcaption", {}, h("span", {}, label, u.caption ? h("div", { class: "small muted", text: u.caption }) : null), h("span", { class: "row-actions" }, dl, del))));
      adminImage(u.id).then((url) => { img.src = url; dl.href = url; dl.download = `foto-${u.id.slice(0, 8)}.jpg`; })
        .catch(() => { img.alt = "Foto konnte nicht geladen werden"; });
    }
    const proofs = list.filter((u) => u.card).length;
    return h("section", {},
      h("h2", { text: "Fotos vom Abend" }),
      h("p", { class: "muted", text: `${list.length} Fotos, davon ${proofs} Beweisfotos von Aufgaben-Karten. Hier könnt ihr unpassende Fotos löschen.` }),
      list.length ? grid : h("p", { class: "muted", text: "Noch keine Fotos. Sobald der Abend-Modus läuft, können Gäste hier hochladen." })
    );
  }

  // ---------- Abend (Steuerung) ----------
  async function saveConfigPatch(patch) {
    const c = { ...state.config, ...patch };
    await api("config", { method: "PUT", body: c });
    await load();
  }
  function eveningTab() {
    const c = state.config;
    const live = state.live || { status: "idle" };
    const totals = state.voteTotals || {};
    const switchRow = (key, label, hint) => {
      const box = h("input", { type: "checkbox", id: "ev-" + key, checked: !!c[key] });
      box.addEventListener("change", async () => {
        box.disabled = true;
        try {
          await saveConfigPatch({ [key]: box.checked });
          render(); toast(box.checked ? `${label}: an` : `${label}: aus`);
        } catch (e) { toast(e.message); box.checked = !box.checked; box.disabled = false; }
      });
      return h("div", { class: "switch-row" }, h("label", { class: "check big", for: "ev-" + key }, box, h("span", {}, h("strong", { text: label }), h("span", { class: "small muted", text: hint }))));
    };
    const setLive = async (questionId, status) => {
      try { await api("live", { method: "PUT", body: { questionId, status } }); await load(); render(); }
      catch (e) { toast(e.message); }
    };

    const liveQ = live.question ? live.question.text : "";
    const liveBox = h("div", { class: "notice" + (live.status !== "idle" ? " ok" : "") },
      live.status === "idle"
        ? "Auf der Leinwand läuft gerade die Fotoshow."
        : h("span", {}, live.status === "open" ? "Gerade wird abgestimmt: " : "Auf der Leinwand steht das Ergebnis: ", h("strong", { text: liveQ }),
            live.counts ? ` (${live.counts.total} Stimmen)` : ""));
    const backBtn = h("button", { type: "button", class: "btn secondary small" }, "Zurück zur Fotoshow");
    backBtn.addEventListener("click", () => setLive(null, "idle"));
    const refresh = h("button", { type: "button", class: "btn secondary small" }, "Aktualisieren");
    refresh.addEventListener("click", async () => { await load(); render(); });

    const rows = (c.soQuestions || []).map((q, i) => {
      const t = totals[q.id] || { sophie: 0, anne: 0, total: 0 };
      const isLive = live.question && live.question.id === q.id;
      const start = h("button", { type: "button", class: "btn small" + (isLive && live.status === "open" ? "" : " secondary") }, isLive && live.status === "open" ? "Läuft …" : "Abstimmung starten");
      start.addEventListener("click", () => setLive(q.id, "open"));
      const result = h("button", { type: "button", class: "btn small secondary" }, "Ergebnis zeigen");
      result.addEventListener("click", () => setLive(q.id, "closed"));
      const reset = h("button", { type: "button", class: "linkish small" }, "Stimmen löschen");
      reset.addEventListener("click", async () => {
        if (!confirm(`Alle Stimmen zu „${q.text}“ löschen?`)) return;
        await api("votes/" + encodeURIComponent(q.id), { method: "DELETE" }); await load(); render();
      });
      const remove = h("button", { type: "button", class: "linkish danger small" }, "Frage entfernen");
      remove.addEventListener("click", async () => {
        if (!confirm(`Frage „${q.text}“ entfernen?`)) return;
        await saveConfigPatch({ soQuestions: c.soQuestions.filter((x) => x.id !== q.id) }); render();
      });
      return h("li", { class: "q-row" + (isLive ? " live" : "") },
        h("div", {}, h("strong", { text: q.text }),
          h("div", { class: "small muted", text: t.total ? `Sophie ${t.sophie} · Anne ${t.anne}` : "Noch keine Stimmen" })),
        h("div", { class: "row-actions" }, start, result, t.total ? reset : null, remove));
    });

    const newQ = h("input", { type: "text", id: "new-q", placeholder: "z. B. Wer hat die schlimmeren Tanzmoves?", maxlength: "160" });
    const addQ = h("button", { type: "button", class: "btn small" }, "Frage hinzufügen");
    const add = async () => {
      if (!newQ.value.trim()) return;
      await saveConfigPatch({ soQuestions: [...(c.soQuestions || []), { id: "q" + Date.now().toString(36), text: newQ.value.trim() }] });
      render(); document.getElementById("new-q")?.focus();
    };
    addQ.addEventListener("click", add);
    newQ.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } });

    const note = h("textarea", { id: "ev-note" }); note.value = c.eveningNote || "";
    const saveNote = h("button", { type: "button", class: "btn small secondary" }, "Text speichern");
    saveNote.addEventListener("click", async () => { await saveConfigPatch({ eveningNote: note.value }); render(); toast("Gespeichert"); });

    return h("section", {},
      h("h2", { text: "Party-Abend" }),
      switchRow("eveningMode", "Abend-Modus", "Zeigt Gästen „Heute Abend“: Abstimmen, Beweisfotos, Fotos hochladen. Startet auch die Leinwand."),
      switchRow("recapOpen", "Der Abend in Zahlen", "Schaltet den Rückblick mit Zahlen, Ergebnissen und allen Fotos zum Herunterladen frei."),
      h("div", { class: "row-actions", style: "margin:1rem 0 2rem" },
        h("a", { class: "btn small", href: "/leinwand", target: "_blank" }, "Leinwand öffnen"),
        h("a", { class: "btn small secondary", href: "/rueckblick", target: "_blank" }, "Rückblick ansehen")),

      h("h3", { text: "Sophie oder Anne?" }),
      h("p", { class: "small muted", text: "„Abstimmung starten“ zeigt die Frage auf der Leinwand und auf allen Handys. „Ergebnis zeigen“ beendet die Abstimmung und zeigt die Prozente mit Konfetti. Die Fragen sehen Gäste erst, wenn ihr sie startet." }),
      liveBox,
      h("div", { class: "row-actions" }, live.status !== "idle" ? backBtn : null, refresh),
      h("ol", { class: "q-list" }, rows),
      h("div", { class: "add-q" }, newQ, addQ),

      h("h3", { text: "Begrüßungstext für den Abend", style: "margin-top:2rem" }),
      note, h("p", {}, saveNote)
    );
  }

  // ---------- Einstellungen ----------
  function settingsTab() {
    const c = JSON.parse(JSON.stringify(state.config));
    const form = h("form", {});
    const field = (key, label, type = "text", hint) => {
      const el = type === "textarea" ? h("textarea", { id: "s-" + key }) : h("input", { type, id: "s-" + key });
      el.value = c[key] || "";
      el.addEventListener("input", () => { c[key] = el.value; });
      return h("div", {}, h("label", { for: "s-" + key }, label, hint ? h("span", { class: "hint", text: " " + hint }) : null), el);
    };
    const check = (key, label) => {
      const el = h("input", { type: "checkbox", id: "s-" + key });
      el.checked = !!c[key];
      el.addEventListener("change", () => { c[key] = el.checked; });
      return h("label", { class: "check", for: "s-" + key }, el, label);
    };

    const courseArea = h("div");
    function drawCourses() {
      courseArea.replaceChildren();
      c.courses.forEach((course, ci) => {
        const name = h("input", { type: "text", value: course.name, "aria-label": "Name des Gangs" });
        name.addEventListener("input", () => { course.name = name.value; });
        const box = h("div", { class: "course-edit" }, h("label", { text: "Gang" }), name);
        course.options.forEach((o, oi) => {
          const label = h("input", { type: "text", value: o.label, placeholder: "Gericht", "aria-label": "Gericht" });
          label.addEventListener("input", () => { o.label = label.value; });
          const desc = h("input", { type: "text", value: o.desc || "", placeholder: "Kurze Beschreibung (optional)", "aria-label": "Beschreibung" });
          desc.addEventListener("input", () => { o.desc = desc.value; });
          const rm = h("button", { type: "button", class: "linkish danger" }, "Entfernen");
          rm.addEventListener("click", () => { course.options.splice(oi, 1); drawCourses(); });
          box.append(h("div", { class: "option-edit" }, label, desc, rm));
        });
        const addOpt = h("button", { type: "button", class: "btn secondary small", style: "margin-top:.75rem" }, "Gericht hinzufügen");
        addOpt.addEventListener("click", () => { course.options.push({ id: "o" + Date.now().toString(36), label: "", desc: "" }); drawCourses(); });
        const rmCourse = h("button", { type: "button", class: "linkish danger", style: "margin-left:1rem" }, "Gang entfernen");
        rmCourse.addEventListener("click", () => { if (confirm(`Gang „${course.name}“ entfernen?`)) { c.courses.splice(ci, 1); drawCourses(); } });
        box.append(h("p", {}, addOpt, rmCourse));
        courseArea.append(box);
      });
      const addCourse = h("button", { type: "button", class: "btn secondary small" }, "Gang hinzufügen");
      addCourse.addEventListener("click", () => {
        c.courses.push({ id: "g" + Date.now().toString(36), name: "", options: [{ id: "o" + Date.now().toString(36), label: "", desc: "" }] });
        drawCourses();
      });
      courseArea.append(addCourse);
    }
    drawCourses();

    const schedArea = h("div");
    function drawSchedule() {
      schedArea.replaceChildren();
      c.schedule.forEach((r, i) => {
        const t = h("input", { type: "text", value: r.time, placeholder: "18:30", "aria-label": "Uhrzeit" });
        t.addEventListener("input", () => { r.time = t.value; });
        const w = h("input", { type: "text", value: r.what, placeholder: "z. B. Sektempfang", "aria-label": "Programmpunkt" });
        w.addEventListener("input", () => { r.what = w.value; });
        const rm = h("button", { type: "button", class: "linkish danger" }, "Entfernen");
        rm.addEventListener("click", () => { c.schedule.splice(i, 1); drawSchedule(); });
        schedArea.append(h("div", { class: "sched-edit" }, t, w, rm));
      });
      const add = h("button", { type: "button", class: "btn secondary small", style: "margin-top:.6rem" }, "Programmpunkt hinzufügen");
      add.addEventListener("click", () => { c.schedule.push({ time: "", what: "" }); drawSchedule(); schedArea.querySelectorAll("input")[c.schedule.length * 2 - 2]?.focus(); });
      schedArea.append(add);
    }
    if (!Array.isArray(c.schedule)) c.schedule = [];
    drawSchedule();

    const dietInput = h("input", { type: "text", id: "s-dietOptions", value: (c.dietOptions || []).join(", ") });
    dietInput.addEventListener("input", () => { c.dietOptions = dietInput.value.split(",").map((x) => x.trim()).filter(Boolean); });

    const msg = h("div");
    const save = h("button", { type: "submit", class: "btn" }, "Einstellungen speichern");
    const group = (title, intro, ...kids) => h("fieldset", { class: "group" },
      h("legend", { text: title }), intro ? h("p", { class: "small muted", text: intro }) : null, ...kids);
    form.append(
      h("p", { class: "muted", text: "Alles, was ihr hier eintragt, erscheint sofort auf der Gästeseite. Leere Felder werden dort einfach nicht angezeigt." }),
      group("Wann und wo", null,
        h("div", { class: "grid2" },
          field("title", "Überschrift"),
          field("hosts", "Eure Namen", "text", "(z. B. „Anne & …“)"),
          field("date", "Datum", "date"),
          field("time", "Beginn", "time"),
          field("endTime", "Ende", "text", "(z. B. „gegen 2:00 Uhr“)")
        ),
        field("venueName", "Name der Location"),
        field("address", "Adresse", "textarea"),
        field("dresscode", "Dresscode", "text", "(optional)")
      ),
      group("Ablauf", "Ein kurzer Text reicht. Programmpunkte mit Uhrzeit sind optional.", field("flowNote", "So läuft der Abend", "textarea"), h("p", { class: "small muted", style: "margin-top:1rem", text: "Programmpunkte mit Uhrzeit (optional):" }), schedArea),
      group("Anreise, Parken, Übernachten", "Links, E-Mail-Adressen und Telefonnummern werden für Gäste automatisch anklickbar.",
        field("venueNote", "Anreise", "textarea", "(ÖPNV, Eingang …)"),
        field("parking", "Parken", "textarea"),
        field("stay", "Übernachtungsmöglichkeiten", "textarea", "(Hotels, Links, Sonderpreise …)")
      ),
      group("Statt Geschenken", null, field("giftNote", "Text", "textarea")),
      group("Essen", "Gerichte könnt ihr jederzeit umbenennen. Wenn ihr ein Gericht entfernt, das schon jemand gewählt hat, steht bei dieser Person „entfernte Option“.",
        check("foodOpen", "Essensauswahl ist offen"),
        check("allowFreeName", "Gäste dürfen ihren Namen selbst eintragen, wenn er fehlt"),
        field("foodIntro", "Einleitungstext", "textarea"),
        field("foodDeadline", "Wählen bis", "date", "(optional)"),
        courseArea,
        h("label", { for: "s-dietOptions" }, "Ankreuzfelder für Ernährung ", h("span", { class: "hint", text: "(mit Komma getrennt)" })),
        dietInput
      ),
      group("Kontakt", null, field("contact", "Bei Fragen", "textarea", "(z. B. „Schreibt uns: Anne 0170 …“)")),
      msg, save
    );
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msg.replaceChildren();
      for (const course of c.courses) {
        course.options = course.options.filter((o) => o.label.trim());
      }
      c.schedule = c.schedule.filter((r) => r.what.trim());
      for (const course of c.courses) {
        if (!course.name.trim()) { msg.append(h("p", { class: "notice error", text: "Jeder Gang braucht einen Namen." })); return; }
        if (!course.options.length) { msg.append(h("p", { class: "notice error", text: `Beim Gang „${course.name}“ fehlt noch ein Gericht.` })); return; }
      }
      save.disabled = true;
      try {
        await api("config", { method: "PUT", body: c });
        await load(); render(); toast("Einstellungen gespeichert");
      } catch (er) { msg.append(h("p", { class: "notice error", text: er.message })); save.disabled = false; }
    });
    return h("section", {}, form);
  }

  // ---------- Rahmen ----------
  const TABS = [["overview", "Übersicht", overview], ["guests", "Gäste", guestsTab], ["evening", "Abend", eveningTab], ["photos", "Fotos", photosTab], ["settings", "Einstellungen", settingsTab]];
  function render() {
    const tabs = h("div", { class: "tabs", role: "tablist" }, TABS.map(([id, label]) => {
      const b = h("button", { role: "tab", "aria-selected": String(tab === id) }, label);
      b.addEventListener("click", () => { tab = id; render(); });
      return b;
    }));
    const logoutBtn = h("button", { class: "linkish", style: "float:right;margin-top:1rem" }, "Abmelden");
    logoutBtn.addEventListener("click", () => { logout(); renderLogin(); });
    root.replaceChildren(logoutBtn, tabs, TABS.find(([id]) => id === tab)[2]());
  }

  (async () => {
    if (!pin) return renderLogin();
    try { await load(); render(); } catch (e) { renderLogin(e.message); }
  })();
})();

// Party-App API – Cloudflare Pages Function mit D1 (Binding "DB")
// Umgebungsvariable ADMIN_PIN schützt alle /api/admin/*-Routen.

const DEFAULT_CONFIG = {
  title: "Die goldenen Dreißiger",
  hosts: "Sophie & Anne",
  date: "2026-12-19", // JJJJ-MM-TT
  time: "18:00",
  endTime: "gegen 2:00 Uhr",
  venueName: "THE GRAEVENITZ",
  address: "Junghofstraße 9 (Innenhof)\n60315 Frankfurt",
  venueNote:
    "Am entspanntesten mit Bus und Bahn – es gibt ja Drinks 🥂\nS-Bahn S1–S6, S8 oder S9 bis „Taunusanlage“ oder „Hauptwache“ (dort halten auch viele U-Bahnen). Von beiden Stationen sind es etwa 6 Minuten zu Fuß. Vom Hauptbahnhof ist es mit der S-Bahn nur eine Station bis Taunusanlage.\nDer Eingang ist im Innenhof der Junghofstraße 9.",
  parking:
    "Die nächsten Parkhäuser:\n• Parkhaus Junghofstraße, Junghofstraße 16 – in derselben Straße, rund um die Uhr geöffnet, Einfahrtshöhe max. 2,00 m\n• Parkhaus Goetheplatz, Goetheplatz 2a\n• Parkhaus Am Theater, Willy-Brandt-Platz 5\nWir feiern bis etwa 2 Uhr – schaut bei den anderen Parkhäusern vorher kurz nach den Öffnungszeiten.",
  stay:
    "Direkt im selben Gebäudekomplex (FOUR Frankfurt): Kimpton Main Frankfurt, Junghofstraße 7\nTel. +49 69 589979879 · hello@kimptonmainfrankfurt.com\nOb es ein Zimmerkontingent für unsere Gäste gibt, klären wir gerade – Infos folgen hier.",
  flowNote:
    "Kein steifer Empfang – ab 18 Uhr geht es einfach los. Vorspeise und Hauptgang gibt es ganz klassisch am Tisch. Das Dessert kommt danach „fliegend“: Schnappt euch etwas Süßes, steht auf, mischt euch und lernt die anderen kennen. Danach wird gefeiert, bis gegen 2 Uhr.",
  contact: "",
  dresscode: "",
  schedule: [],      // [{ time, what }]
  giftNote:
    "Wir wünschen uns Erinnerungen: Es gibt eine Fotobox, die direkt druckt, und zwei Fotobücher, in die ihr eure Bilder einkleben und ein paar Zeilen dazuschreiben könnt.",
  foodIntro: "Damit die Küche gut planen kann, sagt uns hier, was ihr essen möchtet und worauf wir achten sollen.",
  foodDeadline: "",  // JJJJ-MM-TT
  foodOpen: true,
  allowFreeName: true,
  eveningMode: false, // Abend-Teil für Gäste sichtbar
  recapOpen: false,   // „Der Abend in Zahlen“ sichtbar
  eveningNote: "Schön, dass ihr da seid! Hier könnt ihr heute Abend abstimmen und eure Beweisfotos von den Aufgaben-Karten hochladen.",
  soQuestions: [
    { id: "q1", text: "Wer ist öfter zu spät?" },
    { id: "q2", text: "Wer verliert eher ihr Handy auf einer Party?" },
    { id: "q3", text: "Wer tanzt heute als Letzte noch?" },
    { id: "q4", text: "Wer weint eher bei Filmen?" },
    { id: "q5", text: "Wer kennt mehr Leute hier im Raum?" },
    { id: "q6", text: "Wer schläft heute zuerst ein?" },
  ],
  dietOptions: ["vegetarisch", "vegan", "glutenfrei", "laktosefrei", "Nussallergie", "kein Schweinefleisch"],
  courses: [],
};

// Gästeliste, die beim allerersten Start einmalig angelegt wird (danach über /admin pflegen)
const INITIAL_GUESTS = [
  "Moritz S.",
  "Atieno",
  "Tom",
  "Imani",
  "Jonathan",
  "Ole",
  "Hagen",
  "Moritz H.",
  "Begleitung von Moritz H.",
  "Louis",
  "Jannik",
  "Vivien",
  "Martin",
  "Chris",
  "Begleitung von Chris",
  "Nils",
  "Begleitung von Nils",
  "Henry",
  "Ferdinand",
  "Isabella",
  "Niko",
  "Faye",
  "Marlon",
  "Dorian",
  "Vanessa",
  "Paul (Begleitung von Vanessa)",
  "Alina",
  "Tobi",
  "Pauli",
  "Sebi",
  "Lukas",
  "Ulli",
  "Holger",
  "Lorenz"
];

// Einmalige Umbenennung: Nachnamen entfernen (betrifft nur Einträge, die noch genau so heißen)
// Zweite Umbenennung für Datenbanken, die schon die erste hatten
const RENAME_V2 = [["Ulrike", "Ulli"], ["Ulrike Wohlenberg", "Ulli"], ["Nikolaus", "Niko"], ["Nikolaus Wohlenberg", "Niko"]];

const RENAME_V1 = [["Moritz Graf von Saurma", "Moritz S."], ["Atieno Wolters", "Atieno"], ["Tom Heldt", "Tom"], ["Imani Wolters", "Imani"], ["Jonathan Hauff", "Jonathan"], ["Ole Lijun Zhu", "Ole"], ["Hagen Hoffmann", "Hagen"], ["Moritz Heilig", "Moritz H."], ["Begleitung von Moritz Heilig", "Begleitung von Moritz H."], ["Louis Golze", "Louis"], ["Jannik Lahn", "Jannik"], ["Vivien Gschwind", "Vivien"], ["Martin Kruppa", "Martin"], ["Chris Nagel", "Chris"], ["Begleitung von Chris Nagel", "Begleitung von Chris"], ["Nils Frilling", "Nils"], ["Begleitung von Nils Frilling", "Begleitung von Nils"], ["Henry Kirste", "Henry"], ["Ferdinand Wohlenberg", "Ferdinand"], ["Isabella Immhoff", "Isabella"], ["Nikolaus Wohlenberg", "Niko"], ["Faye Bremer", "Faye"], ["Marlon Jouhoff", "Marlon"], ["Dorian Jouhoff", "Dorian"], ["Vanessa Werner", "Vanessa"], ["Paul (Begleitung von Vanessa Werner)", "Paul (Begleitung von Vanessa)"], ["Alina König", "Alina"], ["Tobi König", "Tobi"], ["Pauli Sya", "Pauli"], ["Sebi Sya", "Sebi"], ["Lukas Göschel", "Lukas"], ["Ulrike Wohlenberg", "Ulli"], ["Holger Wohlenberg", "Holger"], ["Lorenz Werther", "Lorenz"]];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS guests (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        token TEXT,
        choices TEXT,
        diet TEXT,
        note TEXT,
        self_added INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT
      )`
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS uploads (
        id TEXT PRIMARY KEY,
        guest_id TEXT,
        card INTEGER,
        caption TEXT,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS votes (
        question_id TEXT NOT NULL,
        voter TEXT NOT NULL,
        choice TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (question_id, voter)
      )`
    ),
    db.prepare(`CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL)`),
  ]);
  try {
    await db.prepare("ALTER TABLE guests ADD COLUMN diet_tags TEXT").run();
  } catch {} // Spalte gibt es schon
  // Gästeliste einmalig anlegen
  const seeded = await db.prepare("SELECT value FROM config WHERE key = 'seeded'").first();
  if (!seeded) {
    const count = await db.prepare("SELECT COUNT(*) AS n FROM guests").first();
    const stmts = [];
    if (!count.n) {
      for (const name of INITIAL_GUESTS) {
        stmts.push(db.prepare("INSERT INTO guests (id, name, created_at) VALUES (?, ?, ?)").bind(crypto.randomUUID(), name, new Date().toISOString()));
      }
    }
    stmts.push(db.prepare("INSERT OR IGNORE INTO config (key, value) VALUES ('seeded', '1')"));
    await db.batch(stmts);
  }
  const renamed = await db.prepare("SELECT value FROM config WHERE key = 'renamed-v1'").first();
  if (!renamed) {
    const stmts = RENAME_V1.map(([oldName, newName]) =>
      db.prepare("UPDATE guests SET name = ? WHERE name = ? AND NOT EXISTS (SELECT 1 FROM guests WHERE name = ?)").bind(newName, oldName, newName)
    );
    stmts.push(db.prepare("INSERT OR IGNORE INTO config (key, value) VALUES ('renamed-v1', '1')"));
    await db.batch(stmts);
  }
  const renamed2 = await db.prepare("SELECT value FROM config WHERE key = 'renamed-v2'").first();
  if (!renamed2) {
    const stmts = RENAME_V2.map(([oldName, newName]) =>
      db.prepare("UPDATE guests SET name = ? WHERE name = ? AND NOT EXISTS (SELECT 1 FROM guests WHERE name = ?)").bind(newName, oldName, newName)
    );
    stmts.push(db.prepare("INSERT OR IGNORE INTO config (key, value) VALUES ('renamed-v2', '1')"));
    await db.batch(stmts);
  }
  schemaReady = true;
}

const now = () => new Date().toISOString();
const clean = (v, max) => String(v ?? "").trim().slice(0, max);

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Die Anfrage konnte nicht gelesen werden.");
  }
}

async function getConfig(db) {
  const row = await db.prepare("SELECT value FROM config WHERE key = 'main'").first();
  let stored = {};
  if (row) {
    try {
      stored = JSON.parse(row.value);
    } catch {}
  }
  return { ...DEFAULT_CONFIG, ...stored };
}

function parseChoices(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function getGuest(db, id) {
  const g = await db.prepare("SELECT * FROM guests WHERE id = ?").bind(id).first();
  if (!g) throw new HttpError(404, "Diesen Namen gibt es nicht mehr in der Gästeliste.");
  return g;
}

// Ein Gast "gehört" dem Gerät, das zuerst für ihn speichert. Danach braucht es dessen Token.
async function claim(db, guest, token) {
  if (!guest.token) {
    const t = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);
    await db.prepare("UPDATE guests SET token = ? WHERE id = ?").bind(t, guest.id).run();
    return t;
  }
  if (token && token === guest.token) return token;
  throw new HttpError(
    403,
    "Für diesen Namen wurde schon auf einem anderen Gerät gewählt. Ändern geht auf diesem Gerät – oder sag uns kurz Bescheid."
  );
}

function validateChoices(config, choices) {
  if (!choices || typeof choices !== "object") throw new HttpError(400, "Bitte wähle für jeden Gang etwas aus.");
  const out = {};
  for (const course of config.courses) {
    const pick = choices[course.id];
    if (!pick || !course.options.some((o) => o.id === pick)) {
      throw new HttpError(400, `Bitte wähle etwas beim Gang „${course.name}“ aus.`);
    }
    out[course.id] = pick;
  }
  return out;
}

function cleanTags(config, tags) {
  if (!Array.isArray(tags)) return null;
  const ok = tags.filter((t) => config.dietOptions.includes(t));
  return ok.length ? JSON.stringify(ok) : null;
}

async function checkAdmin(request, env) {
  const pin = request.headers.get("x-admin-pin") || "";
  if (!env.ADMIN_PIN) throw new HttpError(500, "ADMIN_PIN ist in Cloudflare noch nicht gesetzt.");
  if (pin !== String(env.ADMIN_PIN)) {
    await new Promise((r) => setTimeout(r, 600));
    throw new HttpError(401, "Die PIN stimmt nicht.");
  }
}

function sanitizeConfig(input) {
  const c = { ...DEFAULT_CONFIG };
  const textFields = {
    title: 80, hosts: 120, date: 10, time: 20, endTime: 40, venueName: 120, address: 300, venueNote: 1000,
    parking: 1000, stay: 1500, contact: 400, dresscode: 200, giftNote: 1000, foodIntro: 600,
    foodDeadline: 10, eveningNote: 600, flowNote: 1200,
  };
  for (const [k, max] of Object.entries(textFields)) if (k in input) c[k] = clean(input[k], max);
  for (const k of ["foodOpen", "allowFreeName", "eveningMode", "recapOpen"]) if (k in input) c[k] = !!input[k];
  if (Array.isArray(input.soQuestions)) {
    c.soQuestions = input.soQuestions.slice(0, 40)
      .map((q, i) => ({ id: clean(q.id, 40) || `q${Date.now().toString(36)}${i}`, text: clean(q.text, 160) }))
      .filter((q) => q.text);
  }
  if (Array.isArray(input.schedule)) {
    c.schedule = input.schedule.slice(0, 20)
      .map((r) => ({ time: clean(r.time, 20), what: clean(r.what, 200) }))
      .filter((r) => r.what);
  }
  if (Array.isArray(input.dietOptions)) {
    c.dietOptions = [...new Set(input.dietOptions.map((d) => clean(d, 40)).filter(Boolean))].slice(0, 12);
  }
  if (Array.isArray(input.courses)) {
    c.courses = input.courses.slice(0, 6).map((course, i) => ({
      id: clean(course.id, 40) || `gang${i + 1}`,
      name: clean(course.name, 60) || `Gang ${i + 1}`,
      options: (Array.isArray(course.options) ? course.options : []).slice(0, 12).map((o, j) => ({
        id: clean(o.id, 40) || `o${Date.now().toString(36)}${j}`,
        label: clean(o.label, 80) || `Option ${j + 1}`,
        desc: clean(o.desc, 200),
      })),
    })).filter((course) => course.options.length > 0);
  }
  return c;
}

async function publicState(db) {
  const config = await getConfig(db);
  const { results } = await db
    .prepare(
      `SELECT g.id, g.name, g.choices IS NOT NULL AS done, g.token IS NOT NULL AS locked
         FROM guests g ORDER BY g.name COLLATE NOCASE`
    )
    .all();
  const { soQuestions, ...publicConfig } = config; // Fragen bleiben bis zum Abend geheim
  return {
    config: publicConfig,
    guests: results.map((g) => ({ id: g.id, name: g.name, done: !!g.done, locked: !!g.locked })),
  };
}

// ---------- Abend-Helfer ----------
async function getLive(db) {
  const row = await db.prepare("SELECT value FROM config WHERE key = 'live'").first();
  try { return row ? JSON.parse(row.value) : { qid: null, status: "idle" }; } catch { return { qid: null, status: "idle" }; }
}

async function voteCounts(db, qid) {
  const { results } = await db.prepare("SELECT choice, COUNT(*) AS n FROM votes WHERE question_id = ? GROUP BY choice").bind(qid).all();
  const counts = { sophie: 0, anne: 0 };
  for (const r of results) counts[r.choice] = r.n;
  counts.total = counts.sophie + counts.anne;
  return counts;
}

async function allVoteCounts(db) {
  const { results } = await db.prepare("SELECT question_id AS q, choice, COUNT(*) AS n FROM votes GROUP BY question_id, choice").all();
  const out = {};
  for (const r of results) {
    out[r.q] = out[r.q] || { sophie: 0, anne: 0, total: 0 };
    out[r.q][r.choice] = r.n;
    out[r.q].total += r.n;
  }
  return out;
}

async function liveState(db, config) {
  const live = await getLive(db);
  const q = live.qid ? config.soQuestions.find((x) => x.id === live.qid) : null;
  const up = await db.prepare("SELECT COUNT(*) AS n, MAX(created_at) AS last FROM uploads").first();
  return {
    status: q ? live.status : "idle",
    question: q ? { id: q.id, text: q.text } : null,
    counts: q ? await voteCounts(db, q.id) : null,
    uploads: { count: up.n, last: up.last },
  };
}

async function listUploads(db) {
  const { results } = await db
    .prepare(
      `SELECT u.id, u.card, u.caption, u.created_at AS createdAt, g.name AS guestName
         FROM uploads u LEFT JOIN guests g ON g.id = u.guest_id
        ORDER BY u.created_at DESC`
    )
    .all();
  return results;
}

async function imageResponse(db, id) {
  const row = await db.prepare("SELECT data FROM uploads WHERE id = ?").bind(id).first();
  if (!row) throw new HttpError(404, "Dieses Foto gibt es nicht mehr.");
  const m = /^data:(image\/[a-z]+);base64,(.*)$/s.exec(row.data);
  if (!m) throw new HttpError(500, "Das Foto ist beschädigt.");
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, { headers: { "content-type": m[1], "cache-control": "public, max-age=86400" } });
}

async function recapData(db, config) {
  const guests = await db.prepare("SELECT COUNT(*) AS n FROM guests").first();
  const up = await db
    .prepare("SELECT COUNT(*) AS n, COUNT(DISTINCT card) AS cards, COUNT(DISTINCT guest_id) AS people FROM uploads")
    .first();
  const { results: top } = await db
    .prepare(
      `SELECT g.name AS name, COUNT(*) AS n FROM uploads u JOIN guests g ON g.id = u.guest_id
        GROUP BY u.guest_id ORDER BY n DESC, g.name LIMIT 3`
    )
    .all();
  const totals = await allVoteCounts(db);
  const votes = Object.values(totals).reduce((s, v) => s + v.total, 0);
  const questions = config.soQuestions
    .filter((q) => totals[q.id] && totals[q.id].total > 0)
    .map((q) => ({ text: q.text, ...totals[q.id] }));
  const score = questions.reduce((acc, q) => {
    if (q.sophie > q.anne) acc.sophie++;
    else if (q.anne > q.sophie) acc.anne++;
    return acc;
  }, { sophie: 0, anne: 0 });
  return {
    title: config.title, hosts: config.hosts, date: config.date, venueName: config.venueName,
    guests: guests.n, photos: up.n, missions: up.cards, photographers: up.people,
    topPhotographers: top, votes, questions, score,
    uploads: await listUploads(db),
  };
}

async function route(request, env, parts) {
  const db = env.DB;
  const method = request.method;
  const [a, b, c] = parts;

  // ---------- öffentlich ----------
  if (a === "public" && !b && method === "GET") return json(await publicState(db));

  if (a === "guests" && !b && method === "POST") {
    const config = await getConfig(db);
    if (!config.allowFreeName) throw new HttpError(403, "Bitte wähle deinen Namen aus der Liste.");
    const body = await readBody(request);
    const name = clean(body.name, 80);
    if (name.length < 2) throw new HttpError(400, "Bitte gib deinen Namen ein.");
    const exists = await db.prepare("SELECT id FROM guests WHERE lower(name) = lower(?)").bind(name).first();
    if (exists) return json({ id: exists.id, existed: true });
    const count = await db.prepare("SELECT COUNT(*) AS n FROM guests").first();
    if (count.n >= 200) throw new HttpError(403, "Die Gästeliste ist voll.");
    const id = crypto.randomUUID();
    await db
      .prepare("INSERT INTO guests (id, name, self_added, created_at) VALUES (?, ?, 1, ?)")
      .bind(id, name, now())
      .run();
    return json({ id });
  }

  if (a === "guests" && b && !c && method === "GET") {
    const guest = await getGuest(db, b);
    const token = new URL(request.url).searchParams.get("token");
    if (!guest.token || token !== guest.token) return json({ id: guest.id, name: guest.name, mine: false });
    return json({
      id: guest.id, name: guest.name, mine: true,
      choices: parseChoices(guest.choices), dietTags: parseChoices(guest.diet_tags) || [], diet: guest.diet || "", note: guest.note || "",
    });
  }

  if (a === "guests" && b && c === "choice" && method === "POST") {
    const config = await getConfig(db);
    if (!config.foodOpen) throw new HttpError(403, "Die Essensauswahl ist geschlossen. Melde dich bei uns, wenn du noch etwas ändern möchtest.");
    const body = await readBody(request);
    const guest = await getGuest(db, b);
    const choices = validateChoices(config, body.choices);
    const token = await claim(db, guest, body.token);
    await db
      .prepare("UPDATE guests SET choices = ?, diet_tags = ?, diet = ?, note = ?, updated_at = ? WHERE id = ?")
      .bind(JSON.stringify(choices), cleanTags(config, body.dietTags), clean(body.diet, 500), clean(body.note, 500), now(), b)
      .run();
    return json({ ok: true, token });
  }

  // ---------- Abend: Live-Abstimmung ----------
  if (a === "live" && !b && method === "GET") {
    const config = await getConfig(db);
    if (!config.eveningMode) return json({ active: false });
    return json({ active: true, ...(await liveState(db, config)) });
  }

  if (a === "vote" && !b && method === "POST") {
    const config = await getConfig(db);
    if (!config.eveningMode) throw new HttpError(403, "Die Abstimmung startet am Abend der Party.");
    const body = await readBody(request);
    const live = await getLive(db);
    if (!live.qid || live.qid !== body.questionId || live.status !== "open") {
      throw new HttpError(409, "Diese Abstimmung ist schon vorbei.");
    }
    const voter = clean(body.voter, 64);
    if (voter.length < 8) throw new HttpError(400, "Bitte lade die Seite neu und versuch es noch einmal.");
    if (!["sophie", "anne"].includes(body.choice)) throw new HttpError(400, "Bitte tippe auf einen der beiden Namen.");
    await db
      .prepare("INSERT INTO votes (question_id, voter, choice, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(question_id, voter) DO UPDATE SET choice = excluded.choice")
      .bind(live.qid, voter, body.choice, now())
      .run();
    return json({ ok: true, counts: await voteCounts(db, live.qid) });
  }

  // ---------- Abend: Beweisfotos ----------
  if (a === "uploads" && !b && method === "POST") {
    const config = await getConfig(db);
    if (!config.eveningMode) throw new HttpError(403, "Fotos könnt ihr ab dem Abend der Party hochladen.");
    const body = await readBody(request);
    const image = String(body.image || "");
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(image)) throw new HttpError(400, "Bitte wähle ein Foto (JPG oder PNG).");
    if (image.length > 1_400_000) throw new HttpError(413, "Das Foto ist zu groß. Bitte wähle ein kleineres.");
    let guestId = null;
    if (body.guestId) {
      const g = await db.prepare("SELECT id FROM guests WHERE id = ?").bind(String(body.guestId)).first();
      guestId = g ? g.id : null;
    }
    const cardNum = parseInt(body.card, 10);
    const card = Number.isFinite(cardNum) && cardNum > 0 && cardNum < 1000 ? cardNum : null;
    const count = await db.prepare("SELECT COUNT(*) AS n FROM uploads").first();
    if (count.n >= 1500) throw new HttpError(403, "Der Fotospeicher ist voll.");
    const id = crypto.randomUUID();
    await db
      .prepare("INSERT INTO uploads (id, guest_id, card, caption, data, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, guestId, card, clean(body.caption, 140), image, now())
      .run();
    return json({ ok: true, id });
  }

  if (a === "uploads" && !b && method === "GET") {
    const config = await getConfig(db);
    if (!config.eveningMode && !config.recapOpen) throw new HttpError(403, "Die Fotos gibt es ab dem Abend der Party.");
    return json({ uploads: await listUploads(db) });
  }

  if (a === "uploads" && b && method === "GET") {
    const config = await getConfig(db);
    if (!config.eveningMode && !config.recapOpen) throw new HttpError(403, "Die Fotos gibt es ab dem Abend der Party.");
    return imageResponse(db, b);
  }

  // ---------- Der Abend in Zahlen ----------
  if (a === "recap" && !b && method === "GET") {
    const config = await getConfig(db);
    if (!config.recapOpen) throw new HttpError(403, "Der Rückblick ist noch nicht freigeschaltet.");
    return json(await recapData(db, config));
  }

  // ---------- Admin ----------
  if (a === "admin") {
    await checkAdmin(request, env);

    if (b === "state" && method === "GET") {
      const config = await getConfig(db);
      const { results } = await db
        .prepare(
          `SELECT g.* FROM guests g ORDER BY g.name COLLATE NOCASE`
        )
        .all();
      return json({
        config,
        guests: results.map((g) => ({
          id: g.id, name: g.name, locked: !!g.token, choices: parseChoices(g.choices), dietTags: parseChoices(g.diet_tags) || [],
          diet: g.diet || "", note: g.note || "", selfAdded: !!g.self_added,
          updatedAt: g.updated_at,
        })),
        live: await liveState(db, config),
        voteTotals: await allVoteCounts(db),
        uploads: await listUploads(db),
      });
    }

    if (b === "config" && method === "PUT") {
      const config = sanitizeConfig(await readBody(request));
      await db
        .prepare("INSERT INTO config (key, value) VALUES ('main', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(JSON.stringify(config))
        .run();
      return json({ ok: true, config });
    }

    if (b === "guests" && !c && method === "POST") {
      const body = await readBody(request);
      const names = (Array.isArray(body.names) ? body.names : [])
        .map((n) => clean(n, 80))
        .filter((n) => n.length >= 2)
        .slice(0, 200);
      let added = 0;
      for (const name of names) {
        const exists = await db.prepare("SELECT 1 AS x FROM guests WHERE lower(name) = lower(?)").bind(name).first();
        if (exists) continue;
        await db.prepare("INSERT INTO guests (id, name, created_at) VALUES (?, ?, ?)").bind(crypto.randomUUID(), name, now()).run();
        added++;
      }
      return json({ ok: true, added });
    }

    if (b === "guests" && c && method === "PATCH") {
      const body = await readBody(request);
      const guest = await getGuest(db, c);
      if ("name" in body) {
        const name = clean(body.name, 80);
        if (name.length < 2) throw new HttpError(400, "Der Name ist zu kurz.");
        await db.prepare("UPDATE guests SET name = ? WHERE id = ?").bind(name, guest.id).run();
      }
      if (body.unlock) await db.prepare("UPDATE guests SET token = NULL WHERE id = ?").bind(guest.id).run();
      if (body.clearChoice) {
        await db.prepare("UPDATE guests SET choices = NULL, diet_tags = NULL, diet = NULL, note = NULL, updated_at = ? WHERE id = ?").bind(now(), guest.id).run();
      } else if (body.choices) {
        const config = await getConfig(db);
        const choices = validateChoices(config, body.choices);
        await db
          .prepare("UPDATE guests SET choices = ?, diet_tags = ?, diet = ?, note = ?, updated_at = ? WHERE id = ?")
          .bind(JSON.stringify(choices), cleanTags(config, body.dietTags), clean(body.diet, 500), clean(body.note, 500), now(), guest.id)
          .run();
      }
      return json({ ok: true });
    }

    if (b === "guests" && c && method === "DELETE") {
      await db.batch([
        db.prepare("UPDATE uploads SET guest_id = NULL WHERE guest_id = ?").bind(c),
        db.prepare("DELETE FROM guests WHERE id = ?").bind(c),
      ]);
      return json({ ok: true });
    }

    if (b === "live" && method === "PUT") {
      const body = await readBody(request);
      const config = await getConfig(db);
      const qid = body.questionId ? String(body.questionId) : null;
      if (qid && !config.soQuestions.some((q) => q.id === qid)) throw new HttpError(400, "Diese Frage gibt es nicht.");
      const status = ["open", "closed"].includes(body.status) && qid ? body.status : "idle";
      await db
        .prepare("INSERT INTO config (key, value) VALUES ('live', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(JSON.stringify({ qid: status === "idle" ? null : qid, status, at: now() }))
        .run();
      return json({ ok: true, live: await liveState(db, config) });
    }

    if (b === "votes" && c && method === "DELETE") {
      await db.prepare("DELETE FROM votes WHERE question_id = ?").bind(c).run();
      return json({ ok: true });
    }

    if (b === "uploads" && c && method === "GET") return imageResponse(db, c);

    if (b === "uploads" && c && method === "DELETE") {
      await db.prepare("DELETE FROM uploads WHERE id = ?").bind(c).run();
      return json({ ok: true });
    }

    if (b === "recap" && method === "GET") return json(await recapData(db, await getConfig(db)));
  }

  throw new HttpError(404, "Unbekannte Adresse.");
}

export async function onRequest({ request, env }) {
  if (!env.DB) return json({ error: "Die Datenbank ist nicht verbunden (D1-Binding „DB“ fehlt)." }, 500);
  try {
    await ensureSchema(env.DB);
    const parts = new URL(request.url).pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    return await route(request, env, parts);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Da ist auf dem Server etwas schiefgelaufen. Bitte versuch es gleich noch einmal." }, 500);
  }
}

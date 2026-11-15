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
  photosOpen: false,
  photosNote: "Schick uns ein Foto von dir als Kind – für eine kleine Überraschung am Abend. Bis dahin sehen es nur wir beide.",
  eveningNote: "",
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
      `CREATE TABLE IF NOT EXISTS photos (
        guest_id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
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
    foodDeadline: 10, eveningNote: 600, photosNote: 600, flowNote: 1200,
  };
  for (const [k, max] of Object.entries(textFields)) if (k in input) c[k] = clean(input[k], max);
  for (const k of ["foodOpen", "allowFreeName", "photosOpen"]) if (k in input) c[k] = !!input[k];
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
      `SELECT g.id, g.name, g.choices IS NOT NULL AS done, g.token IS NOT NULL AS locked,
              EXISTS(SELECT 1 FROM photos p WHERE p.guest_id = g.id) AS hasPhoto
         FROM guests g ORDER BY g.name COLLATE NOCASE`
    )
    .all();
  return {
    config,
    guests: results.map((g) => ({ id: g.id, name: g.name, done: !!g.done, locked: !!g.locked, hasPhoto: !!g.hasPhoto })),
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
    const photo = await db.prepare("SELECT 1 AS x FROM photos WHERE guest_id = ?").bind(b).first();
    return json({
      id: guest.id, name: guest.name, mine: true,
      choices: parseChoices(guest.choices), dietTags: parseChoices(guest.diet_tags) || [], diet: guest.diet || "", note: guest.note || "", hasPhoto: !!photo,
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

  if (a === "guests" && b && c === "photo" && method === "POST") {
    const config = await getConfig(db);
    if (!config.photosOpen) throw new HttpError(403, "Der Foto-Upload ist geschlossen.");
    const body = await readBody(request);
    const image = String(body.image || "");
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(image)) throw new HttpError(400, "Bitte wähle ein Foto (JPG oder PNG).");
    if (image.length > 1_200_000) throw new HttpError(413, "Das Foto ist zu groß. Bitte wähle ein kleineres.");
    const guest = await getGuest(db, b);
    const token = await claim(db, guest, body.token);
    await db
      .prepare(
        "INSERT INTO photos (guest_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(guest_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
      )
      .bind(b, image, now())
      .run();
    return json({ ok: true, token });
  }

  // ---------- Admin ----------
  if (a === "admin") {
    await checkAdmin(request, env);

    if (b === "state" && method === "GET") {
      const config = await getConfig(db);
      const { results } = await db
        .prepare(
          `SELECT g.*, EXISTS(SELECT 1 FROM photos p WHERE p.guest_id = g.id) AS hasPhoto
             FROM guests g ORDER BY g.name COLLATE NOCASE`
        )
        .all();
      return json({
        config,
        guests: results.map((g) => ({
          id: g.id, name: g.name, locked: !!g.token, choices: parseChoices(g.choices), dietTags: parseChoices(g.diet_tags) || [],
          diet: g.diet || "", note: g.note || "", selfAdded: !!g.self_added, hasPhoto: !!g.hasPhoto,
          updatedAt: g.updated_at,
        })),
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
        db.prepare("DELETE FROM photos WHERE guest_id = ?").bind(c),
        db.prepare("DELETE FROM guests WHERE id = ?").bind(c),
      ]);
      return json({ ok: true });
    }

    if (b === "photo" && c && method === "GET") {
      const row = await db.prepare("SELECT data FROM photos WHERE guest_id = ?").bind(c).first();
      if (!row) throw new HttpError(404, "Kein Foto vorhanden.");
      return json({ image: row.data });
    }

    if (b === "photo" && c && method === "DELETE") {
      await db.prepare("DELETE FROM photos WHERE guest_id = ?").bind(c).run();
      return json({ ok: true });
    }
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

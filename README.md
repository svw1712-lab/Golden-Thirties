# Party-App „Wir werden 30“

Eine kleine Web-App für eure Feier:

- **Konfetti-Kanone zum Öffnen:** Beim ersten Öffnen sehen Gäste nur einen großen Knopf. Drücken, Konfetti explodiert und euer Party-Video läuft (mit Ton). Danach erscheint die Seite. Das Intro kommt pro Gerät nur einmal; oben gibt es einen Knopf „Nochmal Konfetti“. Links mit `#essen` am Ende (z. B. in der Erinnerung) überspringen das Intro.
- **Gästeseite** (`/`): Wann und wo, Ablauf, Anreise und Parken, Übernachten, Statt Geschenken, Essensauswahl (mit Ankreuzfeldern für Ernährung und Unverträglichkeiten), Kontakt. Leere Felder werden einfach nicht angezeigt.
- **Nichts vom Abend verraten:** Alles für den Party-Abend bleibt unsichtbar, bis ihr auf /admin unter „Abend“ den Abend-Modus einschaltet.
- **Planungsseite** (`/admin`): Übersicht, wer was isst, wer noch fehlt, Zusammenfassung fürs Restaurant, Gästeliste, alle Texte, Ablauf und Menü bearbeiten

Gäste brauchen kein Konto, nur den Link. Läuft kostenlos auf Cloudflare Pages mit einer D1-Datenbank, genau wie Cairn.

## Ordner

```
public/              Die Webseite (Gästeseite, Admin-Seite, eure Fotos in public/img)
functions/api/       Der Server-Teil (speichert Auswahl und Fotos in D1)
```

Die Datenbank-Tabellen werden beim ersten Aufruf automatisch angelegt. Ihr müsst dafür nichts tun.

## Online stellen (ca. 15 Minuten)

Die Bezeichnungen in Cloudflare können leicht abweichen.

1. **GitHub:** Neues Repository anlegen (z. B. `party30`, privat). Dann „Add file → Upload files“ und den *Inhalt* dieses Ordners hineinziehen (`public`, `functions`, `README.md`). Committen.
2. **Cloudflare Pages:** Dashboard → *Workers & Pages* → *Create* → *Pages* → *Connect to Git* → Repository `party30` wählen.
   - Framework preset: *None*
   - Build command: leer lassen
   - Build output directory: `public`
   - *Save and Deploy*
3. **Datenbank:** *Storage & Databases* → *D1* → *Create* → Name z. B. `party30-db`.
4. **Datenbank verbinden:** Euer Pages-Projekt → *Settings* → *Bindings* → *Add* → *D1 database*
   - Variable name: `DB` (genau so, großgeschrieben)
   - Database: `party30-db`
5. **Admin-PIN festlegen:** Pages-Projekt → *Settings* → *Variables and Secrets* → *Add*
   - Name: `ADMIN_PIN`, Typ *Secret*, Wert: eine PIN, die nur ihr beide kennt (gern 6+ Ziffern)
6. **Neu veröffentlichen**, damit Datenbank und PIN greifen: *Deployments* → beim letzten Eintrag *Retry deployment*.
7. Fertig. Eure Adresse sieht etwa so aus: `https://party30-xyz.pages.dev`

## Schon vorausgefüllt

Beim ersten Start sind diese Infos schon drin (alles auf /admin änderbar):
- Datum, Uhrzeit, Ende, THE GRAEVENITZ mit Adresse, eure Namen
- Ablauf als kurzer Text (kein Empfang, Vorspeise und Hauptgang am Tisch, fliegendes Dessert)
- Anreise mit S-Bahn, die nächsten Parkhäuser und das Kimpton-Hotel im selben Komplex
- eure Gästeliste (34 Personen). Sie wird einmalig beim ersten Start angelegt.

Noch offen: Menü (Gäste können bis dahin schon Unverträglichkeiten angeben) und Kontakt.

## Vor dem Verschicken

1. `https://…pages.dev/admin` öffnen und mit der PIN anmelden.
2. **Einstellungen:** Alles kurz gegenlesen, „Kontakt“ ergänzen und den Satz zum Hotel-Kontingent anpassen, sobald ihr Bescheid wisst. Speichern.
3. **Gäste:** Liste prüfen. Eigene Namen und fehlende Begleitungen ergänzen.
4. Gästeseite einmal auf dem Handy ansehen und testweise für euch selbst wählen.
5. Link verschicken. Ein Beispieltext:

> Ihr Lieben, unsere Location hat sich geändert! Alle neuen Infos findet ihr hier: https://…pages.dev
> Sagt uns dort bitte, ob die Küche bei euch auf etwas achten soll. Euer Gericht könnt ihr dort auswählen, sobald das Menü steht. 🎉

## Wenn das Menü steht

Admin → Einstellungen → Essen → „Gang hinzufügen“ (z. B. Vorspeise, Hauptgang) und die Gerichte eintragen. Ab dann sehen Gäste die Auswahl. Wer schon Unverträglichkeiten angegeben hat, steht in der Übersicht unter „Haben noch kein Gericht gewählt“. Mit „Erinnerung für Nachzügler kopieren“ bekommt ihr einen fertigen Text dafür.

## Gut zu wissen

- **Wer wählt für wen?** Jeder Gast wählt seinen Namen aus der Liste. Paare oder Familien können nacheinander für mehrere Personen wählen.
- **Ändern:** Eine Auswahl lässt sich auf dem Gerät ändern, auf dem sie gespeichert wurde. So kann niemand versehentlich die Auswahl von jemand anderem überschreiben. Wenn jemand das Handy gewechselt hat: Admin → Gäste → Bearbeiten → „Gerätesperre aufheben“.
- **Oma ohne Handy:** In Admin → Gäste → Bearbeiten könnt ihr die Auswahl selbst eintragen.
- **Fürs Restaurant:** Admin → Übersicht → „Zusammenfassung fürs Restaurant kopieren“ oder als CSV-Tabelle (öffnet sich in Excel/Numbers).
- **Auswahl schließen:** In den Einstellungen das Häkchen „Essensauswahl ist offen“ entfernen.
- **Ernährungs-Ankreuzfelder** (vegetarisch, vegan, glutenfrei …) könnt ihr in den Einstellungen anpassen. In der Restaurant-Zusammenfassung werden sie gezählt.
- **Intro-Video austauschen:** `public/img/konfetti.mp4` ersetzen (am besten kurz, MP4, hochkant).
- **Fotos oben austauschen:** Bilder in `public/img/` ersetzen (gleiche Dateinamen) und in GitHub hochladen.
- Die Seite ist für Suchmaschinen gesperrt (`noindex`). Wer den Link hat, kann sie öffnen.

## Am Party-Abend

Alles steuert ihr auf **/admin → Abend**.

1. **Abend-Modus einschalten** (am besten kurz vor 18 Uhr). Gäste sehen dann oben „Heute Abend“:
   - **Sophie oder Anne?** – abstimmen, sobald ihr eine Frage startet
   - **Beweisfoto für deine Karte** – mit Kartennummer
   - **Fotos vom Abend** – beliebige Schnappschüsse, auch mehrere auf einmal
2. **Leinwand:** Am Laptop am Beamer `…pages.dev/leinwand` öffnen und auf „Vollbild“ klicken. Dort läuft eine Fotoshow mit allen hochgeladenen Fotos. Neue Fotos erscheinen sofort mit „Neu!“ und Konfetti. Unten rechts ist ein QR-Code zur App.
3. **Sophie oder Anne?** – Fragen könnt ihr vorher auf /admin anpassen. Am Abend auf „Abstimmung starten“ klicken: Die Frage erscheint auf Leinwand und Handys, die Balken wachsen live. „Ergebnis zeigen“ zeigt Prozente und Konfetti. „Zurück zur Fotoshow“ beendet die Runde. Tipp: Die Planungsseite am Handy öffnen, dann steuert ihr alles von eurem Platz aus.
4. **Aufgaben-Karten:** Die PDF „geheimauftraege-karten“ ausdrucken (A4, 100 %, nicht „an Seite anpassen“), an den Schnittmarken schneiden und eure Aufgaben von Hand auf die Linien schreiben. Der QR-Code auf jeder Karte öffnet direkt das Beweisfoto-Formular mit der richtigen Kartennummer.
5. **Unpassende Fotos** löscht ihr unter /admin → Fotos.

## Nach der Party: Der Abend in Zahlen

Auf /admin → Abend „Der Abend in Zahlen“ einschalten. Unter `…pages.dev/rueckblick` (und über einen Hinweis auf der Startseite) sehen alle Gäste: Zahlen des Abends, die Ergebnisse von „Sophie oder Anne?“, die fleißigsten Fotograf:innen und alle Fotos. Dort gibt es zwei Knöpfe:
- **Als PDF speichern** – öffnet den Druckdialog, dort „Als PDF sichern“ wählen
- **Alle Fotos herunterladen (ZIP)** – alle Fotos in einer ZIP-Datei

Ihr könnt den Rückblick vorab ansehen, wenn ihr im selben Browser auf /admin angemeldet seid.

## Als Nächstes

Wenn ihr noch Ideen habt (z. B. Audio-Gästebuch, Zeitkapsel bis zum 40.), können die genauso in dieselbe App. Der Link bleibt gleich.

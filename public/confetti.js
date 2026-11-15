// Konfetti-Kanone: Intro beim ersten Öffnen + window.fireConfetti() zum Nachfeuern
(() => {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.getElementById("confetti");
  const ctx = canvas.getContext("2d");
  const COLORS = ["#f3c24a", "#ffffff", "#e8476a", "#6f8b78", "#f7a6c1", "#d9a441", "#8fd3f4"];
  let parts = [];
  let running = false;
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
  }
  addEventListener("resize", resize);
  resize();

  // Eine Salve aus einer Kanone (x in 0..1, Winkel in Grad, 90 = senkrecht nach oben)
  function burst(x, angle, count, power) {
    const W = innerWidth, H = innerHeight;
    for (let i = 0; i < count; i++) {
      const a = ((angle + (Math.random() - 0.5) * 50) * Math.PI) / 180;
      const v = power * (0.55 + Math.random() * 0.6) * Math.max(H, 600) / 800;
      parts.push({
        x: x * W, y: H + 10,
        vx: Math.cos(a) * v, vy: -Math.sin(a) * v,
        w: 6 + Math.random() * 7, h: 8 + Math.random() * 10,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        flip: Math.random() * Math.PI, vf: 0.08 + Math.random() * 0.15,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        round: Math.random() < 0.25,
        life: 0,
      });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  function tick() {
    const H = innerHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, H);
    for (const p of parts) {
      p.life++;
      p.vy += 0.32;            // Schwerkraft
      p.vx *= 0.985; p.vy *= 0.985; // Luftwiderstand
      if (p.vy > 3.2) p.vy = 3.2 + (p.vy - 3.2) * 0.9; // langsam herabsegeln
      p.x += p.vx + Math.sin(p.life / 12 + p.flip) * 0.6;
      p.y += p.vy;
      p.rot += p.vr; p.flip += p.vf;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.flip));
      ctx.fillStyle = p.color;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    parts = parts.filter((p) => p.y < H + 40 && p.life < 900);
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  function fire() {
    if (reduce) return;
    burst(0.05, 65, 90, 26);
    burst(0.95, 115, 90, 26);
    setTimeout(() => burst(0.5, 90, 110, 30), 350);
  }
  window.fireConfetti = fire;

  // ---------- Intro ----------
  const intro = document.getElementById("intro");
  const btn = document.getElementById("fire");
  const skip = document.getElementById("skip-intro");
  const video = document.getElementById("intro-video");
  let seen = false;
  try { seen = localStorage.getItem("p30-intro") === "1"; } catch {}
  const deepLink = (location.hash && location.hash.length > 1) || /[?&]karte=/.test(location.search);
  if (!intro) { const again = document.getElementById("again"); if (again) again.addEventListener("click", fire); return; }

  function close() {
    try { localStorage.setItem("p30-intro", "1"); } catch {}
    intro.classList.add("leaving");
    document.body.classList.remove("intro-open");
    setTimeout(() => { intro.hidden = true; try { video.pause(); } catch {} }, reduce ? 0 : 700);
  }

  if (!seen && !deepLink) {
    intro.hidden = false;
    document.body.classList.add("intro-open");
    btn.focus({ preventScroll: true });
  }

  btn.addEventListener("click", () => {
    intro.classList.add("fired");
    fire();
    let done = false;
    const finish = () => { if (!done) { done = true; close(); } };
    video.addEventListener("ended", finish, { once: true });
    const p = video.play();
    if (p && p.catch) p.catch(() => setTimeout(finish, 1800));
    setTimeout(() => burst(0.5, 90, 80, 24), 1600);
    setTimeout(finish, 6000); // Sicherheitsnetz
  });
  skip.addEventListener("click", close);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !intro.hidden) close(); });

  const again = document.getElementById("again");
  if (again) again.addEventListener("click", fire);
})();

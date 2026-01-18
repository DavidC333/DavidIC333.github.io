(function () {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  const listEl = document.getElementById("tournamentsList");
  if (!listEl) return;

  const qEl = document.getElementById("q");
  const statusEl = document.getElementById("status");

  function parseDateISO(s) {
    const [yy, mm, dd] = (s || "").split("-").map(Number);
    if (!yy || !mm || !dd) return null;
    return new Date(yy, mm - 1, dd);
  }

  function isPast(dateISO) {
    const d = parseDateISO(dateISO);
    if (!d) return false;
    const today = new Date();
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d < t0;
  }

  function fmtDate(dateISO) {
    const d = parseDateISO(dateISO);
    if (!d) return "Дата уточняется";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}.${mm}.${yy}`;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function render(items) {
    if (!items.length) {
      listEl.innerHTML = `<div class="skeleton">Турниров по этим фильтрам пока нет. Добавь новый в data/tournaments.json.</div>`;
      return;
    }

    listEl.innerHTML = items.map(t => {
      const past = isPast(t.date);
      const statusChip = past ? `<span class="chip">прошедший</span>` : `<span class="chip">предстоящий</span>`;
      const age = t.age ? `<span class="chip">возраст: ${t.age}</span>` : "";
      const format = t.format ? `<span class="chip">${t.format}</span>` : "";
      const time = t.time ? `<span class="chip">время: ${t.time}</span>` : "";
      const fee = (t.fee || t.fee === 0) ? `<span class="chip">взнос: ${t.fee} ₽</span>` : "";
      const location = t.location ? `<span class="chip">${t.location}</span>` : "";

      const regBtn = t.register_url
        ? `<a class="btn btn--primary" href="${t.register_url}" target="_blank" rel="noopener">Регистрация</a>`
        : "";

      const detailsBtn = t.details_url
        ? `<a class="btn btn--ghost" href="${t.details_url}" target="_blank" rel="noopener">Подробнее</a>`
        : "";

      return `
        <article class="tournament">
          <h3 class="tournament__title">${escapeHtml(t.title || "Турнир")}</h3>
          <div class="tournament__meta">
            <span class="chip">дата: ${fmtDate(t.date)}</span>
            ${time}${age}${format}${fee}${location}${statusChip}
          </div>
          ${t.description ? `<p class="tournament__desc">${escapeHtml(t.description)}</p>` : ""}
          <div class="tournament__actions">${regBtn}${detailsBtn}</div>
        </article>
      `;
    }).join("");
  }

  let all = [];

  function applyFilters() {
    const q = (qEl?.value || "").trim().toLowerCase();
    const st = statusEl?.value || "all";

    let items = [...all];
    if (st === "upcoming") items = items.filter(t => !isPast(t.date));
    if (st === "past") items = items.filter(t => isPast(t.date));

    if (q) {
      items = items.filter(t => {
        const blob = [t.title, t.description, t.age, t.format, t.location, t.time].join(" ").toLowerCase();
        return blob.includes(q);
      });
    }

    items.sort((a, b) => {
      const ap = isPast(a.date), bp = isPast(b.date);
      if (ap !== bp) return ap ? 1 : -1;
      const ad = parseDateISO(a.date)?.getTime() ?? 0;
      const bd = parseDateISO(b.date)?.getTime() ?? 0;
      if (!ap) return ad - bd;
      return bd - ad;
    });

    render(items);
  }

  async function load() {
    try {
      const res = await fetch('data/tournaments.json'), { cache: "no-store" });
      if (!res.ok) throw new Error("Bad response");
      all = await res.json();
      applyFilters();
    } catch (e) {
      listEl.innerHTML = `
        <div class="skeleton">
          Не получилось загрузить data/tournaments.json.<br />
          Если открыл файл двойным кликом (file://), браузер может блокировать загрузку.<br />
          На хостинге будет ок.
        </div>
      `;
    }
  }

  qEl?.addEventListener("input", applyFilters);
  statusEl?.addEventListener("change", applyFilters);

  load();
})();
// Lead form -> prepares message and opens messenger links
(() => {
  const form = document.getElementById('leadForm');
  if (!form) return;

  const status = document.getElementById('leadStatus');
  const tgBtn = document.getElementById('leadTg');
  const waBtn = document.getElementById('leadWa');

  function findWaBase() {
    const a = document.querySelector('a[href*="wa.me/"], a[href*="whatsapp.com/send"]');
    if (!a) return '';
    return a.href.split('?')[0];
  }

  function buildText() {
    const name = (form.elements.name?.value || '').trim();
    const age = (form.elements.age?.value || '').trim();
    const phone = (form.elements.phone?.value || '').trim();

    const lines = ['Здравствуйте! Хочу записать ребенка на занятия по шахматам.'];
    if (name) lines.push(`Имя: ${name}`);
    if (age) lines.push(`Возраст: ${age}`);
    if (phone) lines.push(`Телефон: ${phone}`);
    lines.push(`Страница: ${location.href}`);
    return lines.join('\n');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const text = buildText();
    const shareTg = 'https://t.me/share/url?url=' + encodeURIComponent(location.href) + '&text=' + encodeURIComponent(text);

    if (tgBtn) tgBtn.href = shareTg;

    const waBase = findWaBase();
    if (waBtn) {
      waBtn.href = waBase ? (waBase + '?text=' + encodeURIComponent(text)) : ('https://wa.me/?text=' + encodeURIComponent(text));
    }

    try {
      await navigator.clipboard.writeText(text);
      if (status) status.textContent = 'Текст заявки скопирован. Нажмите Telegram или WhatsApp - и отправьте.';
    } catch {
      if (status) status.textContent = 'Нажмите Telegram или WhatsApp - и отправьте заявку.';
    }

    // Можно раскомментировать, если хочешь автопереход в Telegram после клика:
    // window.open(shareTg, '_blank', 'noopener');
  });
})();



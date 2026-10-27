// =====================================================================
// sheet.js - sheet.html?char=ID
//
// Asks for the FULL character first (views full_<system>_characters).
// The database only returns it to the owner and the game's GM; for
// everyone else it returns nothing, and the page falls back to the
// public layer (view party_characters) and shows the rest as locked.
// =====================================================================

import {
  getFullCharacter, getPublicCharacter, getMySessions, setLoreVisible,
  getWitcherSkills, getVtmSkills, getVtmDisciplines, getCyberpunkSkills,
} from "./api.js";
import { $, esc, param, applyTheme, requireLogin, initials, showMessage, dots, PROFESSION_LABELS, RACE_LABELS } from "./ui.js";
import { STATS as W_STATS, SKILLS as W_SKILLS, PROFESSIONS, derivedStats } from "./witcherRules.js";
import { ATTRIBUTES, SKILLS as V_SKILLS, CLANS, PREDATORS, cap } from "./vtmRules.js";
import { STATS as C_STATS, SKILLS as C_SKILLS, STAT_GROUP_NAMES, ROLES, derived as cpDerived, btm } from "./cyberpunkRules.js";

async function start() {
  const me = await requireLogin();
  if (!me) return;
  const charId = Number(param("char"));
  const main = $("#sheet");

  const full = await getFullCharacter(charId);
  const c = full || (await getPublicCharacter(charId));
  if (!c) {
    main.innerHTML = `<section class="panel"><h1>No access</h1>
      <p class="muted">This character isn't in any game you're part of.</p>
      <a class="btn" href="index.html">Your games</a></section>`;
    return;
  }
  const session = (await getMySessions()).find((s) => s.session_id === c.session_id);
  applyTheme(session.game_type);
  document.title = `${c.name} · ${session.session_name}`;
  const isOwner = c.owner === me.username;

  let content;
  if (!full) content = renderPublic(c, session.game_type);
  else if (session.game_type === "witcher") content = await renderWitcher(full);
  else if (session.game_type === "vtm") content = await renderVtm(full);
  else content = await renderCyberpunk(full);

  main.innerHTML = `
    <div class="sheet-toolbar">
      <a class="back-link" href="lobby.html?code=${esc(session.join_code)}">← ${esc(session.session_name)}</a>
      ${full ? `<button type="button" class="btn btn--small" id="print">Print / save as PDF</button>` : ""}
    </div>
    <div class="sheet">
      ${content}
      ${renderLore(c, full, isOwner)}
    </div>`;

  $("#print")?.addEventListener("click", () => window.print());
  $("#share-lore")?.addEventListener("change", async (e) => {
    try {
      await setLoreVisible(charId, e.target.checked);
      showMessage($("#lore-msg"), e.target.checked ? "The party can now read this backstory." : "Backstory hidden from the party.", "ok");
    } catch (err) {
      e.target.checked = !e.target.checked;
      showMessage($("#lore-msg"), err.message);
    }
  });
}

// ---------------------------------------------------------------------
// shared pieces
// ---------------------------------------------------------------------
function head(c, fields, title = "") {
  return `
    <section class="panel sheet-head">
      <div class="portrait" aria-hidden="true">${esc(initials(c.name))}</div>
      <div>
        ${title ? `<p class="eyebrow">${esc(title)}</p>` : ""}
        <h1>${esc(c.name)}</h1>
        <dl>${fields.filter(([, v]) => v != null && v !== "")
          .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      </div>
    </section>`;
}

const panel = (title, body, cls = "") => `<section class="panel ${cls}"><h2 class="panel__title">${esc(title)}</h2>${body}</section>`;
const textPanel = (title, text) => (text ? panel(title, `<p class="prewrap">${esc(text)}</p>`) : "");
const boxes = (filled, total) => `<span class="boxes" aria-label="${filled} of ${total}">${Array.from({ length: total }, (_, i) =>
  `<i class="${i < filled ? "on" : ""}"></i>`).join("")}</span>`;

function renderPublic(c, system) {
  const fields = system === "witcher"
    ? [["Race", RACE_LABELS[c.race]], ["Profession", PROFESSION_LABELS[c.profession]]]
    : system === "vtm"
      ? [["Clan", CLANS[c.clan]?.name], ["Sect", c.sect]]
      : [["Role", ROLES[c.cyberpunk_role]?.name]];
  return head(c, [...fields, ["Age", c.age], ["Gender", c.gender], ["Player", c.owner]]) + panel("The rest of the sheet", `
    <p class="locked">Private. Only ${esc(c.owner)} and the GM can see the full sheet.</p>
    <p class="muted" style="margin-top:.75rem">The database returns no row for you from the full character views, and your
      account is denied direct access to the character tables, so there is nothing more to show.</p>`);
}

function renderLore(c, full, isOwner) {
  return panel("Backstory", `
    ${c.lore ? `<p class="prewrap">${esc(c.lore)}</p>` : `<p class="locked">${full ? "No backstory written." : "Kept private by its owner."}</p>`}
    ${isOwner && full ? `
      <label class="toggle no-print"><input type="checkbox" id="share-lore" ${full.lore_visible ? "checked" : ""}>
        Share the backstory with the party</label>
      <p id="lore-msg" class="message" role="status" hidden></p>` : ""}`);
}

function skillColumns(groups) {
  return `<div class="skill-groups">${groups.filter((g) => g.rows.length).map((g) => `
    <div><h3>${esc(g.title)}</h3><ul>${g.rows.map((r) => `<li><span>${esc(r.name)}${r.note ? ` <small class="muted">${esc(r.note)}</small>` : ""}</span><span>${r.value}</span></li>`).join("")}</ul></div>`).join("")}</div>`;
}

// ---------------------------------------------------------------------
// The Witcher
// ---------------------------------------------------------------------
async function renderWitcher(f) {
  const skills = await getWitcherSkills(f.char_id);
  const s = Object.fromEntries(W_STATS.map(({ key }) => [key, f[`stat_${key}`]]));
  const defining = PROFESSIONS[f.profession]?.defining;
  const group = (key) => skills.filter((sk) => (sk.skill_name === defining ? "def" : W_SKILLS[sk.skill_name]?.[0]) === key)
    .sort((a, b) => b.level - a.level).map((sk) => ({ name: sk.skill_name, value: sk.level }));
  return `
    ${head(f, [
      ["Race", RACE_LABELS[f.race]], ["Profession", PROFESSION_LABELS[f.profession]], ["Age", f.age],
      ["Gender", f.gender], ["Homeland", f.homeland], ["Social standing", f.social_standing],
      ["Reputation", f.reputation], ["Player", f.owner],
    ])}
    <div class="grid-sheet">
      ${panel("Statistics", `<div class="stat-row">${W_STATS.map((st) => `
        <div class="stat" title="${esc(st.name)}"><span class="stat__label">${st.label}</span><span class="stat__value">${esc(s[st.key])}</span></div>`).join("")}</div>`)}
      ${panel("Derived", `<dl class="derived">
        ${Object.entries(derivedStats(s, f.race)).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}
        <div><dt>VIGOR</dt><dd>${PROFESSIONS[f.profession]?.vigor ?? 0}</dd></div>
        <div><dt>CROWNS</dt><dd>${esc(f.coin)}</dd></div></dl>`)}
    </div>
    ${panel("Skills", skillColumns([
      { title: "Defining skill", rows: group("def") },
      ...W_STATS.map((st) => ({ title: st.name, rows: group(st.key) })),
    ]))}
    ${textPanel("Lifepath · Outfit", f.lifepath)}`;
}

// ---------------------------------------------------------------------
// Vampire: The Masquerade
// ---------------------------------------------------------------------
async function renderVtm(f) {
  const [skills, disciplines] = await Promise.all([getVtmSkills(f.char_id), getVtmDisciplines(f.char_id)]);
  const lvl = Object.fromEntries(skills.map((s) => [s.skill_name, s]));
  const pair = (a, b) => (a || "").split("\n").map((x, i) => [x, (b || "").split("\n")[i] || ""]).filter(([x]) => x);
  return `
    ${head(f, [
      ["Clan", CLANS[f.clan]?.name], ["Generation", `${f.generation}th`], ["Sire", f.sire], ["Sect", f.sect],
      ["Predator type", PREDATORS[f.predator_type]?.name], ["Ambition", f.ambition], ["Desire", f.desire],
      ["Apparent age", f.age], ["Player", f.owner],
    ], f.concept)}
    <div class="grid-3">
      ${Object.entries(ATTRIBUTES).map(([g, attrs]) => panel(`${g} attributes`, attrs.map((a) => `
        <div class="trait"><span>${cap(a)}</span>${dots(f[`attr_${a}`])}</div>`).join(""))).join("")}
    </div>
    <div class="grid-3">
      ${Object.entries(V_SKILLS).map(([g, list]) => panel(`${g} skills`, list.map((s) => `
        <div class="trait"><span>${esc(s)}${lvl[s]?.specialty ? `<small class="specialty">${esc(lvl[s].specialty)}</small>` : ""}</span>${dots(lvl[s]?.level || 0)}</div>`).join(""))).join("")}
    </div>
    <div class="grid-3">
      ${panel("Disciplines", disciplines.length ? disciplines.sort((a, b) => b.level - a.level).map((d) =>
        `<div class="trait"><span>${esc(d.discipline)}</span>${dots(d.level)}</div>`).join("") : `<p class="empty">None</p>`)}
      ${panel("Trackers", `
        <div class="trait"><span>Health</span>${boxes(f.health, 10)}</div>
        <div class="trait"><span>Willpower</span>${boxes(f.willpower, 10)}</div>
        <div class="trait"><span>Humanity</span>${boxes(f.humanity, 10)}</div>
        <div class="trait"><span>Blood Potency</span>${dots(f.blood_potency)}</div>`)}
      ${panel("Clan bane", `<p>${esc(CLANS[f.clan]?.bane || "")}</p>`)}
    </div>
    <div class="grid-2">
      ${panel("Convictions & Touchstones", pair(f.convictions, f.touchstones).map(([c, t]) =>
        `<p><strong>${esc(c)}</strong><br><span class="muted">${esc(t)}</span></p>`).join("") || `<p class="empty">None</p>`)}
      ${panel("Advantages & Flaws", `<p><strong>Advantages</strong><br>${esc(f.advantages || "—")}</p>
        <p><strong>Flaws</strong><br>${esc(f.flaws || "—")}</p>`)}
    </div>`;
}

// ---------------------------------------------------------------------
// Cyberpunk 2020
// ---------------------------------------------------------------------
async function renderCyberpunk(f) {
  const skills = await getCyberpunkSkills(f.char_id);
  const s = Object.fromEntries(C_STATS.map(({ key }) => [key, f[`stat_${key}`]]));
  const der = cpDerived(s);
  const groups = Object.keys(C_SKILLS).map((k) => ({
    title: STAT_GROUP_NAMES[k],
    rows: skills.filter((sk) => C_SKILLS[k].includes(sk.skill_name)).sort((a, b) => b.level - a.level)
      .map((sk) => ({ name: sk.skill_name, value: sk.level })),
  }));
  return `
    ${head(f, [
      ["Role", ROLES[f.role]?.name], ["Age", f.age], ["Gender", f.gender], ["Ethnic origin", f.ethnicity],
      ["Reputation", f.reputation], ["Cash", `${Number(f.cash).toLocaleString("en")} eb`], ["Player", f.owner],
    ], "Handle")}
    ${panel("Stats", `<div class="stat-row">${C_STATS.map((st) => `
      <div class="stat" title="${esc(st.name)}"><span class="stat__label">${st.label}</span><span class="stat__value">${esc(s[st.key])}</span></div>`).join("")}</div>`)}
    <div class="grid-sheet">
      ${panel("Body", `<dl class="derived">
        <div><dt>SAVE</dt><dd>${der.SAVE}</dd></div><div><dt>BTM</dt><dd>${der.BTM}</dd></div>
        <div><dt>BODY TYPE</dt><dd>${esc(btm(s.body).type)}</dd></div>
        <div><dt>RUN</dt><dd>${esc(der.RUN)}</dd></div><div><dt>LEAP</dt><dd>${esc(der.LEAP)}</dd></div>
        <div><dt>LIFT</dt><dd>${esc(der.LIFT)}</dd></div></dl>`)}
      ${panel("Humanity", `<p class="dice-result">${der.HUMANITY}</p><p class="muted">EMP × 10, before cyberware.</p>`)}
    </div>
    ${panel("Skills", skillColumns(groups))}
    <div class="grid-2">
      ${textPanel("Style", f.style)}
      ${textPanel("Motivations", f.motivations)}
    </div>
    ${textPanel("Lifepath", f.lifepath)}`;
}

start();

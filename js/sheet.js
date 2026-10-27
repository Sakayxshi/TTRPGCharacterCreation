// =====================================================================
// sheet.js - sheet.html?char=ID
//
// Asks for the FULL character first (views full_<system>_characters).
// The database only returns it to the owner and the game's GM; for
// everyone else it returns nothing, and the page falls back to the
// public layer (view party_characters) and shows the rest as locked.
// =====================================================================

import {
  getFullCharacter, getPublicCharacter, getMySessions, setLoreVisible, setCyberpunkVisibility,
  getWitcherSkills, getVtmSkills, getVtmDisciplines, getCyberpunkSkills,
} from "./api.js";
import { $, esc, param, applyTheme, requireLogin, initials, showMessage, dots, info, PROFESSION_LABELS, RACE_LABELS } from "./ui.js";
import * as WH from "./witcherHelp.js";
import * as VH from "./vtmHelp.js";
import * as CH from "./cyberpunkHelp.js";
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
  document.title = `${displayName(c)}, ${session.session_name}`;
  const isOwner = c.owner === me.username;

  let content;
  if (!full) content = renderPublic(c, session.game_type);
  else if (session.game_type === "witcher") content = await renderWitcher(full);
  else if (session.game_type === "vtm") content = await renderVtm(full);
  else content = await renderCyberpunk(full);

  main.innerHTML = `
    <div class="sheet-toolbar">
      <a class="back-link" href="lobby.html?code=${esc(session.join_code)}">Back to ${esc(session.session_name)}</a>
      ${full ? `<button type="button" class="btn btn--small" id="print">Print / save as PDF</button>` : ""}
    </div>
    <div class="sheet">
      ${content}
      ${isOwner && full && session.game_type === "cyberpunk" ? renderNameVisibility(full) : ""}
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
  // Cyberpunk: which of name / handle the other players see
  $("#name-vis")?.addEventListener("change", async (e) => {
    const box = e.currentTarget;
    const showName = $("#vis-name").checked;
    const showHandle = $("#vis-handle").checked;
    try {
      await setCyberpunkVisibility(charId, showName, showHandle);
      showMessage($("#vis-msg"), "Saved.", "ok");
    } catch (err) {
      e.target.checked = !e.target.checked;
      showMessage($("#vis-msg"), err.message);
    }
    box.querySelectorAll("input").forEach((i) => { i.disabled = false; });
  });
}

// A Cyberpunk character is shown by handle; the real name may be hidden
function displayName(c) {
  return c.handle || c.name || "Unknown";
}
const genderText = (g) => (g === "male" ? "Male" : g === "female" ? "Female" : g);

function renderNameVisibility(f) {
  return panel("Who sees your name", `
    <fieldset id="name-vis" class="visibility-pick no-print">
      <legend class="muted">The other players can see${info(CH.TEXT.visibility, "Name visibility")}</legend>
      <label class="toggle"><input type="checkbox" id="vis-name" ${f.show_name ? "checked" : ""}> Real name (${esc(f.name)})</label>
      <label class="toggle"><input type="checkbox" id="vis-handle" ${f.show_handle ? "checked" : ""}> Handle (${esc(f.handle)})</label>
    </fieldset>
    <p id="vis-msg" class="message" role="status" hidden></p>`);
}

// ---------------------------------------------------------------------
// shared pieces
// ---------------------------------------------------------------------
function head(c, fields, title = "", heading = c.name) {
  return `
    <section class="panel sheet-head">
      <div class="portrait" aria-hidden="true">${esc(initials(heading))}</div>
      <div>
        ${title ? `<p class="eyebrow">${esc(title)}</p>` : ""}
        <h1>${esc(heading)}</h1>
        <dl>${fields.filter(([, v]) => v != null && v !== "")
          .map(([k, v, help]) => `<div><dt>${esc(k)}${info(help, k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
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
      : [["Role", ROLES[c.cyberpunk_role]?.name], ["Real name", c.handle ? c.name : null]];
  const heading = system === "cyberpunk" ? displayName(c) : c.name;
  return head(c, [...fields, ["Age", c.age], ["Gender", genderText(c.gender)], ["Player", c.owner]],
    system === "cyberpunk" && c.handle ? "Handle" : "", heading) + panel("The rest of the sheet", `
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
    <div><h3>${esc(g.title)}</h3><ul>${g.rows.map((r) => `<li><span>${esc(r.name)}${info(r.help, r.name)}${r.note ? ` <small class="muted">${esc(r.note)}</small>` : ""}</span><span>${r.value}</span></li>`).join("")}</ul></div>`).join("")}</div>`;
}

// ---------------------------------------------------------------------
// The Witcher
// ---------------------------------------------------------------------
async function renderWitcher(f) {
  const skills = await getWitcherSkills(f.char_id);
  const s = Object.fromEntries(W_STATS.map(({ key }) => [key, f[`stat_${key}`]]));
  const defining = PROFESSIONS[f.profession]?.defining;
  const group = (key) => skills.filter((sk) => (sk.skill_name === defining ? "def" : W_SKILLS[sk.skill_name]?.[0]) === key)
    .sort((a, b) => b.level - a.level).map((sk) => ({ name: sk.skill_name, value: sk.level, help: WH.SKILL_HELP[sk.skill_name] }));
  return `
    ${head(f, [
      ["Race", RACE_LABELS[f.race]], ["Profession", PROFESSION_LABELS[f.profession]], ["Age", f.age],
      ["Gender", genderText(f.gender)], ["Homeland", f.homeland], ["Social standing", f.social_standing, WH.TEXT.standing],
      ["Reputation", f.reputation], ["Player", f.owner],
    ])}
    <div class="stack">
      ${panel("Statistics", `<div class="stat-row">${W_STATS.map((st) => `
        <div class="stat"><span class="stat__label">${st.label}${info(WH.STAT_HELP[st.key], st.name)}</span><span class="stat__value">${esc(s[st.key])}</span></div>`).join("")}</div>`)}
      ${panel("Derived", `<dl class="derived">
        ${Object.entries(derivedStats(s, f.race)).map(([k, v]) => `<div><dt>${k}${info(WH.DERIVED_HELP[k], k)}</dt><dd>${esc(v)}</dd></div>`).join("")}
        <div><dt>VIGOR${info(WH.DERIVED_HELP.VIGOR, "Vigor")}</dt><dd>${PROFESSIONS[f.profession]?.vigor ?? 0}</dd></div>
        <div><dt>CROWNS${info(WH.DERIVED_HELP.CROWNS, "Crowns")}</dt><dd>${esc(f.coin)}</dd></div></dl>`)}
    </div>
    ${panel("Skills", skillColumns([
      { title: "Defining skill", rows: group("def") },
      ...W_STATS.map((st) => ({ title: st.name, rows: group(st.key) })),
    ]))}
    ${textPanel("Lifepath and outfit", f.lifepath)}`;
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
      ["Clan", CLANS[f.clan]?.name, VH.CLAN_HELP[f.clan]], ["Generation", `${f.generation}th`, VH.TEXT.generation],
      ["Sire", f.sire], ["Sect", f.sect, VH.TEXT.sect],
      ["Predator type", PREDATORS[f.predator_type]?.name, VH.TEXT.predator], ["Ambition", f.ambition], ["Desire", f.desire],
      ["Apparent age", f.age], ["Gender", genderText(f.gender)], ["Player", f.owner],
    ], f.concept)}
    <div class="grid-3">
      ${Object.entries(ATTRIBUTES).map(([g, attrs]) => panel(`${g} attributes`, attrs.map((a) => `
        <div class="trait"><span>${cap(a)}${info(VH.ATTRIBUTE_HELP[a], cap(a))}</span>${dots(f[`attr_${a}`])}</div>`).join(""))).join("")}
    </div>
    <div class="grid-3">
      ${Object.entries(V_SKILLS).map(([g, list]) => panel(`${g} skills`, list.map((s) => `
        <div class="trait"><span>${esc(s)}${info(VH.SKILL_HELP[s], s)}${lvl[s]?.specialty ? `<small class="specialty">${esc(lvl[s].specialty)}</small>` : ""}</span>${dots(lvl[s]?.level || 0)}</div>`).join(""))).join("")}
    </div>
    <div class="grid-3">
      ${panel("Disciplines", disciplines.length ? disciplines.sort((a, b) => b.level - a.level).map((d) =>
        `<div class="trait"><span>${esc(d.discipline)}${info(VH.DISCIPLINE_HELP[d.discipline], d.discipline)}</span>${dots(d.level)}</div>`).join("") : `<p class="empty">None</p>`)}
      ${panel("Trackers", `
        <div class="trait"><span>Health${info("How much damage you can take. Stamina + 3.", "Health")}</span>${boxes(f.health, 10)}</div>
        <div class="trait"><span>Willpower${info("Spent to reroll dice and resist. Composure + Resolve.", "Willpower")}</span>${boxes(f.willpower, 10)}</div>
        <div class="trait"><span>Humanity${info(VH.TEXT.humanity, "Humanity")}</span>${boxes(f.humanity, 10)}</div>
        <div class="trait"><span>Blood Potency${info(VH.TEXT.potency, "Blood Potency")}</span>${dots(f.blood_potency)}</div>`)}
      ${panel("Clan bane", `<p>${esc(CLANS[f.clan]?.bane || "")}</p>`)}
    </div>
    <div class="grid-2">
      ${panel("Convictions & Touchstones", pair(f.convictions, f.touchstones).map(([c, t]) =>
        `<p><strong>${esc(c)}</strong><br><span class="muted">${esc(t)}</span></p>`).join("") || `<p class="empty">None</p>`)}
      ${panel("Advantages & Flaws", `<p><strong>Advantages</strong><br>${esc(f.advantages || "None")}</p>
        <p><strong>Flaws</strong><br>${esc(f.flaws || "None")}</p>`)}
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
      .map((sk) => ({ name: sk.skill_name, value: sk.level, help: CH.SKILL_HELP[sk.skill_name] })),
  }));
  const dt = (k) => `<dt>${k}${info(CH.DERIVED_HELP[k], k)}</dt>`;
  return `
    ${head(f, [
      ["Real name", f.name, CH.TEXT.name], ["Role", ROLES[f.role]?.name, CH.TEXT.role], ["Age", f.age],
      ["Gender", genderText(f.gender)], ["Ethnic origin", f.ethnicity],
      ["Reputation", f.reputation], ["Cash", `${Number(f.cash).toLocaleString("en")} eb`], ["Player", f.owner],
    ], "Handle", f.handle)}
    ${panel("Stats", `<div class="stat-row">${C_STATS.map((st) => `
      <div class="stat"><span class="stat__label">${st.label}${info(CH.STAT_HELP[st.key], st.name)}</span><span class="stat__value">${esc(s[st.key])}</span></div>`).join("")}</div>`)}
    <div class="grid-sheet">
      ${panel("Body", `<dl class="derived">
        <div>${dt("SAVE")}<dd>${der.SAVE}</dd></div><div>${dt("BTM")}<dd>${der.BTM}</dd></div>
        <div>${dt("BODY TYPE")}<dd>${esc(btm(s.body).type)}</dd></div>
        <div>${dt("RUN")}<dd>${esc(der.RUN)}</dd></div><div>${dt("LEAP")}<dd>${esc(der.LEAP)}</dd></div>
        <div>${dt("LIFT")}<dd>${esc(der.LIFT)}</dd></div></dl>`)}
      ${panel("Humanity", `<p class="dice-result">${der.HUMANITY}</p><p class="muted">EMP x 10, before cyberware.${info(CH.DERIVED_HELP.HUMANITY, "Humanity")}</p>`)}
    </div>
    ${panel("Skills", skillColumns(groups))}
    <div class="grid-2">
      ${textPanel("Style", f.style)}
      ${textPanel("Motivations", f.motivations)}
    </div>
    ${textPanel("Lifepath", f.lifepath)}`;
}

start();

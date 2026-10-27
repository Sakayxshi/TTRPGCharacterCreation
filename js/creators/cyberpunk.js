// =====================================================================
// creators/cyberpunk.js - Cyberpunk 2020, 7 steps (rulebook order):
// Handle & Role, Stats, Career Skills, Pickup Skills, Style & Origins,
// Motivations, Cash.
// =====================================================================

import { createCyberpunkCharacter, setCyberpunkSkill, setLoreVisible, CP_STATS } from "../api.js";
import { esc } from "../ui.js";
import { createWizard, stepper, poolBadge, choiceList, toggleChoice, radioCards, textField, selectField, review } from "../wizard.js";
import {
  STATS, POINT_OPTIONS, SKILLS, STAT_GROUP_NAMES, ROLES, CAREER_POINTS, monthlySalary, derived, btm,
  STYLE, ETHNICITIES, MOTIVATIONS, MOTIVATION_LABELS, d,
} from "../cyberpunkRules.js";

export function startCyberpunkCreator(root, session) {
  const state = {
    name: "", age: "", gender: "", role: null, choices: [],
    method: "cinematic", pool: 60, stats: Object.fromEntries(CP_STATS.map((k) => [k, 5])),
    career: {}, pickup: {},
    clothes: "", hair: "", affectations: "", ethnicity: "", language: "",
    motivations: { trait: "", person: "", value: "", people: "", possession: "" },
    lore: "", shareLore: false,
    months: null,
  };
  const FIELDS = { "p-name": "name", "p-age": "age", "p-gender": "gender", "p-lang": "language", "p-lore": "lore" };
  const textInput = (e) => { if (FIELDS[e.target.id]) state[FIELDS[e.target.id]] = e.target.value; };

  const role = () => ROLES[state.role];
  const careerList = () => (role() ? [role().special, ...role().skills, ...state.choices] : []);
  const syncCareer = () => {
    const keep = {};
    for (const s of careerList()) keep[s] = state.career[s] || 0;
    state.career = keep;
  };
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const statTotal = () => sum(state.stats);
  const salary = () => monthlySalary(state.role, state.career[role().special] || 0);
  const cash = () => (state.months ? salary() * state.months : 0);

  const steps = [
    // 1 ---------------------------------------------------------------
    {
      title: "Handle & Role",
      render(body) {
        body.innerHTML = `
          <h2>Handle &amp; Role</h2>
          <div class="grid-3">
            ${textField({ id: "p-name", label: "Handle", value: state.name, max: 60, required: true, help: "What the street calls you." })}
            <div class="field">
              <label for="p-age">Age</label>
              <div class="row"><input type="number" id="p-age" value="${esc(state.age)}" min="16" max="120" style="flex:1">
                <button type="button" class="btn btn--small" id="roll-age">Roll 2d6+16</button></div>
            </div>
            ${textField({ id: "p-gender", label: "Gender", value: state.gender, max: 30 })}
          </div>
          ${radioCards("role", "Role", Object.entries(ROLES).map(([value, r]) => ({
            value, title: r.name, text: r.blurb, extra: `Special ability: <strong>${esc(r.special)}</strong>`,
          })), state.role)}`;
        body.querySelector("#roll-age").addEventListener("click", () => { state.age = String(d(6) + d(6) + 16); this.render(body); });
      },
      onInput: textInput,
      onChange(e) {
        if (e.target.name === "role") { state.role = e.target.value; state.choices = []; state.career = {}; state.months = null; }
      },
      validate() {
        if (!state.name.trim()) return "Enter a handle.";
        if (state.age && Number(state.age) < 16) return "Characters are at least 16.";
        return state.role ? "" : "Choose a role.";
      },
    },
    // 2 ---------------------------------------------------------------
    {
      title: "Stats",
      render(body) {
        const s = state.stats;
        const b = btm(s.body);
        body.innerHTML = `
          <h2>Stats</h2>
          ${radioCards("method", "How do you get your points?", [
            { value: "cinematic", title: "Cinematic", text: "Your Referee sets the points." },
            { value: "random", title: "Random", text: "Roll 9d10 and total them." },
            { value: "fast", title: "Fast", text: "Roll 1d10 per stat (re-roll 2 or less)." },
          ], state.method)}
          <div class="row" style="margin:.5rem 0 1rem">
            ${state.method === "cinematic" ? selectField({ id: "p-pool", label: "Character points", value: state.pool,
              options: POINT_OPTIONS.map((p) => [p.points, p.label]), placeholder: "—" }) : ""}
            ${state.method === "random" ? `<button type="button" class="btn" id="roll-pool">Roll 9d10</button>` : ""}
            ${state.method === "fast" ? `<button type="button" class="btn" id="roll-fast">Roll all stats</button>` : ""}
            ${state.method === "fast" ? `<span class="pool" data-state="done">Rolled</span>` : poolBadge(statTotal(), state.pool)}
          </div>
          <p class="muted">Each stat 2–10.</p>
          <div class="stepper-grid">${STATS.map((st) => stepper({ group: "stat", key: st.key,
            label: `${st.label} · ${st.name}`, value: s[st.key], min: 2, max: 10 })).join("")}</div>
          <h3 style="margin-top:1.5rem">Derived</h3>
          <dl class="derived">${Object.entries(derived(s)).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}
            <div><dt>BODY TYPE</dt><dd>${esc(b.type)}</dd></div></dl>`;
        body.querySelector("#roll-pool")?.addEventListener("click", () => {
          state.pool = Array.from({ length: 9 }, () => d(10)).reduce((a, x) => a + x, 0);
          this.render(body);
        });
        body.querySelector("#roll-fast")?.addEventListener("click", () => {
          for (const k of CP_STATS) { let r; do { r = d(10); } while (r <= 2); state.stats[k] = r; }
          this.render(body);
        });
      },
      onChange(e, rerender) {
        if (e.target.name === "method") { state.method = e.target.value; if (state.method === "cinematic") state.pool = 60; rerender(); }
        if (e.target.id === "p-pool") { state.pool = Number(e.target.value) || 60; rerender(); }
      },
      onStep(_, key, delta) {
        if (state.method === "fast") state.method = "cinematic";
        state.stats[key] = Math.min(10, Math.max(2, state.stats[key] + delta));
      },
      validate() {
        if (state.method === "fast") return "";
        const left = state.pool - statTotal();
        return left === 0 ? "" : `Spend exactly ${state.pool} points (${left} left).`;
      },
    },
    // 3 ---------------------------------------------------------------
    {
      title: "Career Skills",
      render(body) {
        syncCareer();
        const r = role();
        body.innerHTML = `
          <h2>Career skills ${poolBadge(sum(state.career), CAREER_POINTS)}</h2>
          <p class="muted">${CAREER_POINTS} points across your ${esc(r.name)} package. Skills run 0–10.
            Your special ability, <strong>${esc(r.special)}</strong>, also decides your pay.</p>
          ${r.choose ? choiceList("choice", `Choose ${r.choose.label}`, r.choose.from, state.choices, r.choose.n) : ""}
          <div class="stepper-grid">${careerList().map((s) => stepper({ group: "career", key: s, label: s,
            sub: s === r.special ? "Special ability" : "", value: state.career[s], min: 0, max: 10 })).join("")}</div>`;
      },
      onChange(e, rerender) {
        if (e.target.dataset.choice === "choice") {
          toggleChoice(state.choices, e.target.value, e.target.checked, role().choose.n);
          rerender();
        }
      },
      onStep(_, key, delta) { state.career[key] = Math.min(10, Math.max(0, state.career[key] + delta)); },
      validate() {
        const r = role();
        if (r.choose && state.choices.length !== r.choose.n) return `Choose ${r.choose.label}.`;
        const over = sum(state.career) - CAREER_POINTS;
        return over > 0 ? `${over} point(s) over ${CAREER_POINTS}.` : "";
      },
    },
    // 4 ---------------------------------------------------------------
    {
      title: "Pickup Skills",
      render(body) {
        const pool = state.stats.int + state.stats.ref;
        const taken = new Set(careerList());
        body.innerHTML = `
          <h2>Pickup skills ${poolBadge(sum(state.pickup), pool)}</h2>
          <p class="muted">INT + REF = ${pool} points for anything outside your career. Special abilities can't be bought here.</p>
          ${Object.entries(SKILLS).filter(([k]) => k !== "special").map(([k, list]) => `
            <h3 class="group-title">${esc(STAT_GROUP_NAMES[k])}</h3>
            <div class="stepper-grid">${list.filter((s) => !taken.has(s)).map((s) => stepper({ group: "pickup", key: s,
              label: s, value: state.pickup[s] || 0, min: 0, max: 10 })).join("")}</div>`).join("")}`;
      },
      onStep(_, key, delta) {
        const v = Math.min(10, Math.max(0, (state.pickup[key] || 0) + delta));
        if (v) state.pickup[key] = v; else delete state.pickup[key];
      },
      validate() {
        const over = sum(state.pickup) - (state.stats.int + state.stats.ref);
        return over > 0 ? `${over} point(s) over the limit.` : "";
      },
    },
    // 5 ---------------------------------------------------------------
    {
      title: "Style & Origins",
      render(body) {
        body.innerHTML = `
          <h2>Style &amp; origins</h2>
          <p class="muted">Choose, or roll each like the Lifepath tables.</p>
          <div class="grid-3">
            ${["clothes", "hair", "affectations"].map((k) => `
              <div>${selectField({ id: `p-${k}`, label: k === "hair" ? "Hairstyle" : k[0].toUpperCase() + k.slice(1), options: STYLE[k], value: state[k] })}
                <button type="button" class="btn btn--small" data-roll="${k}">Roll 1d10</button></div>`).join("")}
          </div>
          <div class="grid-2" style="margin-top:1rem">
            ${selectField({ id: "p-eth", label: "Ethnic origin", options: ETHNICITIES, value: state.ethnicity })}
            ${textField({ id: "p-lang", label: "Native language", value: state.language, max: 40 })}
          </div>`;
        body.querySelectorAll("[data-roll]").forEach((b) => b.addEventListener("click", () => {
          state[b.dataset.roll] = STYLE[b.dataset.roll][d(10) - 1]; this.render(body);
        }));
      },
      onInput: textInput,
      onChange(e) {
        const k = e.target.id?.replace("p-", "");
        if (["clothes", "hair", "affectations"].includes(k)) state[k] = e.target.value;
        if (e.target.id === "p-eth") state.ethnicity = e.target.value;
      },
    },
    // 6 ---------------------------------------------------------------
    {
      title: "Motivations",
      render(body) {
        body.innerHTML = `
          <h2>Motivations</h2>
          <button type="button" class="btn btn--small" id="roll-mot">Roll all</button>
          <div class="grid-2" style="margin-top:1rem">
            ${Object.keys(MOTIVATIONS).map((k) => selectField({ id: `m-${k}`, label: MOTIVATION_LABELS[k], options: MOTIVATIONS[k], value: state.motivations[k] })).join("")}
          </div>
          ${textField({ id: "p-lore", label: "Backstory / life events", value: state.lore, max: 4000, type: "textarea" })}
          <label class="toggle"><input type="checkbox" id="p-share" ${state.shareLore ? "checked" : ""}>
            Share the backstory with the crew (the Referee always sees it)</label>`;
        body.querySelector("#roll-mot").addEventListener("click", () => {
          for (const k of Object.keys(MOTIVATIONS)) state.motivations[k] = MOTIVATIONS[k][Math.floor(Math.random() * MOTIVATIONS[k].length)];
          this.render(body);
        });
      },
      onInput: textInput,
      onChange(e) {
        if (e.target.id?.startsWith("m-")) state.motivations[e.target.id.slice(2)] = e.target.value;
        if (e.target.id === "p-share") state.shareLore = e.target.checked;
      },
    },
    // 7 ---------------------------------------------------------------
    {
      title: "Cash",
      render(body) {
        const r = role();
        const level = state.career[r.special] || 0;
        body.innerHTML = `
          <h2>Starting cash</h2>
          <p class="muted">${esc(r.special)} ${level} pays <strong>${salary().toLocaleString("en")} eb</strong> a month.
            Roll 1d6 ÷ 3 (rounded up) for how many months you've been working.</p>
          <button type="button" class="btn btn--primary" id="roll-cash">Roll</button>
          <div aria-live="polite" style="margin-top:1rem">
            ${state.months ? `<p>${state.months} month${state.months > 1 ? "s" : ""} × ${salary().toLocaleString("en")}</p>
              <p class="dice-result">${cash().toLocaleString("en")} eb</p>` : `<p class="empty">Not rolled yet.</p>`}
          </div>
          ${review([
            ["Handle", esc([state.name, state.age, state.gender].filter(Boolean).join(", "))],
            ["Role", esc(r.name)],
            ["Stats", `<span class="mono">${STATS.map((s) => `${s.label} ${state.stats[s.key]}`).join(" · ")}</span>`],
            ["Skills", esc(Object.entries({ ...state.career, ...state.pickup }).filter(([, l]) => l > 0).map(([n, l]) => `${n} ${l}`).join(", "))],
            ["Style", esc([state.clothes, state.hair, state.affectations].filter(Boolean).join(", "))],
          ])}`;
        body.querySelector("#roll-cash").addEventListener("click", () => { state.months = Math.ceil(d(6) / 3); this.render(body); });
      },
      validate: () => (state.months ? "" : "Roll for your starting cash."),
    },
  ];

  createWizard({
    root, steps,
    async onFinish() {
      const m = state.motivations;
      const { char_id } = await createCyberpunkCharacter({
        session_id: session.session_id, name: state.name.trim(),
        age: state.age ? Number(state.age) : null, gender: state.gender.trim(), lore: state.lore.trim(),
        role: state.role, stats: state.stats, ethnicity: state.ethnicity,
        style: [state.clothes, state.hair, state.affectations].filter(Boolean).join(" · "),
        motivations: Object.keys(MOTIVATIONS).filter((k) => m[k]).map((k) => `${MOTIVATION_LABELS[k]}: ${m[k]}`).join("\n"),
        lifepath: state.language ? `Native language: ${state.language}` : "",
        cash: cash(),
      });
      for (const [skill, level] of Object.entries({ ...state.career, ...state.pickup })) {
        if (level > 0) await setCyberpunkSkill(char_id, skill, level);
      }
      if (state.shareLore && state.lore.trim()) await setLoreVisible(char_id, true);
      location.href = `sheet.html?char=${char_id}`;
    },
  });
}

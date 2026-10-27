// =====================================================================
// creators/witcher.js - The Witcher TRPG, 7 steps:
// Race, Lifepath (optional), Profession, Statistics, Pick-Up Skills,
// Coin, Outfit. All answers live in `state`; the last step sends them
// to create_witcher_character + set_witcher_skill.
// =====================================================================

import { createWitcherCharacter, setWitcherSkill, setLoreVisible } from "../api.js";
import { esc, info } from "../ui.js";
import {
  createWizard, stepper, poolBadge, choiceList, toggleChoice, radioCards,
  textField, selectField, review, genderField,
} from "../wizard.js";
import { STAT_HELP, DERIVED_HELP, SKILL_HELP, RACE_HELP, TEXT, UPBRINGING, POOL_NOTES, VIGOR_NOTES } from "../witcherHelp.js";
import {
  STATS, SKILLS, LANGUAGES, COMBAT_SKILLS, RACES, RACE_STAT_MODS, PROFESSIONS, professionAllowed,
  HOMELANDS, socialStanding, STAT_POOLS, PROFESSION_SKILL_POINTS, CREATION_SKILL_CAP, derivedStats,
} from "../witcherRules.js";

// "Initiate of the <b>Gods ?</b>": the "?" stays on the line of the last word
function boldWithInfo(text, tip) {
  const i = text.lastIndexOf(" ");
  return `<strong>${esc(text.slice(0, i + 1))}<span class="nowrap">${esc(text.slice(i + 1))}${tip}</span></strong>`;
}

export function startWitcherCreator(root, session) {
  const state = {
    name: "", age: "", gender: "", race: null,
    homeland: "", upbringing: "", lifeEvent: "", lore: "", shareLore: false,
    profession: null, languages: [], combat: [], profSkills: {},
    pool: 70, rolled: false, stats: Object.fromEntries(STATS.map((s) => [s.key, 5])),
    pickup: {}, coinDice: null, statRollUsed: false,
    gear: [], clothing: "", hair: "", affectation: "",
  };
  const FIELDS = { "c-name": "name", "c-age": "age", "c-event": "lifeEvent", "c-lore": "lore" };

  const skillCost = (n) => SKILLS[n]?.[1] ?? 1;
  const spent = (levels) => Object.entries(levels).reduce((sum, [n, l]) => sum + l * skillCost(n), 0);
  const prof = () => PROFESSIONS[state.profession];
  const finalStats = () => {
    const mods = RACE_STAT_MODS[state.race] || {};
    return Object.fromEntries(STATS.map(({ key }) => [key, Math.max(1, state.stats[key] + (mods[key] || 0))]));
  };
  const profSkillList = () => (prof() ? [prof().defining, ...prof().skills, ...state.languages, ...state.combat] : []);
  const syncProfSkills = () => {
    const keep = {};
    for (const n of profSkillList()) keep[n] = state.profSkills[n] || 1;
    state.profSkills = keep;
  };
  const resetProfession = () => Object.assign(state, { profession: null, languages: [], combat: [], profSkills: {}, gear: [] });
  const coin = () => (state.coinDice ? prof().coinBase * state.coinDice[0] + prof().coinBase * state.coinDice[1] : 0);
  const textInput = (e) => { if (FIELDS[e.target.id]) state[FIELDS[e.target.id]] = e.target.value; };
  // highest level a skill can reach with the points that are left
  const reachable = (levels, pool, name) => (levels[name] || 0) + Math.floor((pool - spent(levels)) / skillCost(name));
  const derivedList = (f) => `<dl class="derived">${Object.entries(derivedStats(f, state.race)).map(([k, v]) =>
    `<div><dt>${k}${info(DERIVED_HELP[k], k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;

  const steps = [
    // 1 ---------------------------------------------------------------
    {
      title: "Race",
      render(body) {
        body.innerHTML = `
          <h2>Race</h2>
          <div class="grid-3">
            ${textField({ id: "c-name", label: "Name", value: state.name, max: 60, required: true })}
            ${textField({ id: "c-age", label: "Age", value: state.age, type: "number", attrs: 'min="10" max="1000"' })}
            ${genderField("gender", state.gender)}
          </div>
          ${radioCards("race", "Choose a race", Object.entries(RACES).map(([value, r]) => ({
            value, title: r.name, text: r.blurb, help: RACE_HELP[value],
            extra: `<span class="perks-label">Racial perks</span>${r.perks.map(([p, t]) =>
              `<span class="perk"><strong>${esc(p)}</strong><span>${esc(t)}</span></span>`).join("")}`,
          })), state.race)}`;
      },
      onInput: textInput,
      onChange(e) {
        if (e.target.name === "gender") state.gender = e.target.value;
        if (e.target.name === "race") {
          state.race = e.target.value;
          if (state.profession && !professionAllowed(state.race, state.profession)) resetProfession();
        }
      },
      validate() {
        if (!state.name.trim()) return "Enter a name.";
        if (state.age && (state.age < 10 || state.age > 1000)) return "Age must be between 10 and 1000.";
        if (!state.gender) return "Choose male or female.";
        return state.race ? "" : "Choose a race.";
      },
    },
    // 2 ---------------------------------------------------------------
    {
      title: "Lifepath", optional: true,
      render(body) {
        const standing = socialStanding(state.race, state.homeland);
        body.innerHTML = `
          <h2>Lifepath</h2>
          <p class="muted">Where you come from decides how people treat you. Optional.</p>
          <div class="grid-2">
            <div>
              ${selectField({ id: "c-home", label: "Homeland", options: HOMELANDS, value: state.homeland, tip: TEXT.homeland })}
              ${standing ? `<p class="option-note">Social standing there: <strong>${esc(standing)}</strong>${info(TEXT.standing, "Social standing")}</p>`
                : `<p class="field-note">Decides your social standing.</p>`}
            </div>
            ${selectField({ id: "c-up", label: "Upbringing", value: state.upbringing,
              tip: "The family or group that raised you. It's background for your story and doesn't change any numbers.",
              note: state.upbringing ? esc(UPBRINGING[state.upbringing]) : "",
              options: ["Aristocracy", "Merchant family", "Craftsmen", "Peasants", "Soldiers", "Scholars", "Clergy", "Street orphan"] })}
          </div>
          ${textField({ id: "c-event", label: "Most important life event", value: state.lifeEvent, max: 200 })}
          ${textField({ id: "c-lore", label: "Backstory", value: state.lore, max: 4000, type: "textarea" })}
          <label class="toggle"><input type="checkbox" id="c-share" ${state.shareLore ? "checked" : ""}>
            Share the backstory with the party (the GM always sees it)</label>`;
      },
      onInput: textInput,
      onChange(e, rerender) {
        if (e.target.id === "c-home") { state.homeland = e.target.value; rerender(); }
        if (e.target.id === "c-up") { state.upbringing = e.target.value; rerender(); }
        if (e.target.id === "c-share") state.shareLore = e.target.checked;
      },
    },
    // 3 ---------------------------------------------------------------
    {
      title: "Profession",
      render(body) {
        syncProfSkills();
        const p = prof();
        body.innerHTML = `
          <h2>Profession</h2>
          ${radioCards("profession", "Choose a profession", Object.entries(PROFESSIONS).map(([value, pr]) => {
            const ok = professionAllowed(state.race, value);
            return {
              value, title: pr.name, text: pr.blurb, disabled: !ok,
              extra: `Defining skill: ${boldWithInfo(pr.defining, info(SKILL_HELP[pr.defining], pr.defining))}
                <span class="vigor-chip" data-vigor="${pr.vigor}">Vigor <strong>${pr.vigor}</strong></span>`,
              why: ok ? "" : state.race === "witcher" ? "Witchers can only be Witchers."
                : pr.witcherOnly ? "Only the witcher race." : "Only humans and elves can use magic.",
            };
          }), state.profession)}
          ${p ? `
            <div class="prof-summary">
              <div class="prof-summary__item">
                <span class="prof-summary__label">Vigor${info(TEXT.vigor, "Vigor")}</span>
                <span class="prof-summary__value">${p.vigor}</span>
                <span class="prof-summary__text">${esc(VIGOR_NOTES[p.vigor])}</span>
              </div>
              <div class="prof-summary__item">
                <span class="prof-summary__label">Defining skill</span>
                <span class="prof-summary__value prof-summary__value--text">${esc(p.defining)}</span>
                <span class="prof-summary__text">${esc(SKILL_HELP[p.defining])}</span>
              </div>
            </div>
            <h3>Profession skills ${poolBadge(spent(state.profSkills), PROFESSION_SKILL_POINTS)}${info(TEXT.profSkills, "Profession skills")}</h3>
            <p class="muted">Each skill from 1 to ${CREATION_SKILL_CAP}. Skills marked x2 cost 2 points per level.</p>
            ${p.languages ? choiceList("lang", `Choose ${p.languages} language${p.languages > 1 ? "s" : ""}`, LANGUAGES.map((l) => [l, SKILL_HELP[l]]), state.languages, p.languages) : ""}
            ${p.combatChoices ? choiceList("combat", `Choose ${p.combatChoices} combat skills`, COMBAT_SKILLS.map((c) => [c, SKILL_HELP[c]]), state.combat, p.combatChoices) : ""}
            <div class="stepper-grid">
              ${profSkillList().map((n) => stepper({
                group: "prof", key: n, label: n, cost: skillCost(n), help: SKILL_HELP[n],
                sub: n === p.defining ? "Defining skill" : (SKILLS[n]?.[0] || "").toUpperCase(),
                value: state.profSkills[n], min: 1,
                max: Math.min(CREATION_SKILL_CAP, reachable(state.profSkills, PROFESSION_SKILL_POINTS, n)),
              })).join("")}
            </div>` : ""}`;
      },
      onChange(e, rerender) {
        if (e.target.name === "profession") { resetProfession(); state.profession = e.target.value; }
        if (e.target.dataset.choice === "lang") toggleChoice(state.languages, e.target.value, e.target.checked, prof().languages);
        if (e.target.dataset.choice === "combat") toggleChoice(state.combat, e.target.value, e.target.checked, prof().combatChoices);
        rerender();
      },
      onStep(_, key, delta) {
        const max = Math.min(CREATION_SKILL_CAP, reachable(state.profSkills, PROFESSION_SKILL_POINTS, key));
        state.profSkills[key] = Math.min(max, Math.max(1, state.profSkills[key] + delta));
      },
      validate() {
        const p = prof();
        if (!p) return "Choose a profession.";
        if (p.languages && state.languages.length !== p.languages) return `Choose ${p.languages} language(s).`;
        if (p.combatChoices && state.combat.length !== p.combatChoices) return `Choose ${p.combatChoices} combat skills.`;
        const left = PROFESSION_SKILL_POINTS - spent(state.profSkills);
        return left === 0 ? "" : `Spend exactly ${PROFESSION_SKILL_POINTS} points (${left} left).`;
      },
    },
    // 4 ---------------------------------------------------------------
    {
      title: "Statistics",
      render(body) {
        const used = STATS.reduce((sum, x) => sum + state.stats[x.key], 0);
        const left = state.pool - used;
        const mods = RACE_STAT_MODS[state.race] || {};
        const f = finalStats();
        body.innerHTML = `
          <h2>Statistics</h2>
          <div class="row row--end" style="margin-bottom:1rem">
            ${selectField({ id: "c-pool", label: "Points from your GM", value: state.pool, tip: TEXT.pool,
              options: STAT_POOLS.map((p) => [p.points, p.label]), placeholder: null, note: esc(POOL_NOTES[state.pool] || "") })}
            ${state.rolled ? `<span class="pool" data-state="done">Rolled</span>` : poolBadge(used, state.pool)}
            <button type="button" class="btn" id="roll-stats" ${state.statRollUsed ? "disabled" : ""}>
              ${state.statRollUsed ? "Already rolled" : "Roll instead (1d10 per stat)"}</button>${info(TEXT.roll, "Rolling statistics")}
          </div>
          <p class="muted">Each stat from 2 to 10.${Object.keys(mods).length ? ` As a ${esc(RACES[state.race].name)} some stats change after you set them${info(TEXT.race, "Race bonus")}` : ""}</p>
          <div class="stepper-grid">
            ${STATS.map((s) => stepper({ group: "stat", key: s.key, label: `${s.label} ${s.name}`, help: STAT_HELP[s.key],
              sub: mods[s.key] ? `With race bonus: ${f[s.key]}` : "", value: state.stats[s.key], min: 2,
              max: state.rolled ? 10 : Math.min(10, state.stats[s.key] + Math.max(0, left)) })).join("")}
          </div>
          <h3 style="margin-top:1.5rem">Derived</h3>
          ${derivedList(f)}`;
        body.querySelector("#roll-stats").addEventListener("click", () => {
          if (state.statRollUsed) return;
          for (const s of STATS) {
            let r;
            do { r = 1 + Math.floor(Math.random() * 10); } while (r <= 2);
            state.stats[s.key] = r;
          }
          state.rolled = true;
          state.statRollUsed = true;
          this.render(body);
        });
      },
      onChange(e, rerender) {
        if (e.target.id === "c-pool") { state.pool = Number(e.target.value) || 70; state.rolled = false; rerender(); }
      },
      onStep(_, key, delta) {
        if (state.rolled) { state.rolled = false; state.pool = STATS.reduce((sum, x) => sum + state.stats[x.key], 0); }
        state.stats[key] = Math.min(10, Math.max(2, state.stats[key] + delta));
      },
      validate() {
        if (state.rolled) return "";
        const left = state.pool - STATS.reduce((s, x) => s + state.stats[x.key], 0);
        return left === 0 ? "" : `Spend exactly ${state.pool} points (${left} left).`;
      },
    },
    // 5 ---------------------------------------------------------------
    {
      title: "Pick-Up Skills",
      render(body) {
        const f = finalStats();
        const pool = f.int + f.ref;
        const taken = new Set(profSkillList());
        const byStat = {};
        for (const [n, [stat]] of Object.entries(SKILLS)) if (!taken.has(n)) (byStat[stat] ||= []).push(n);
        body.innerHTML = `
          <h2>Pick-up skills ${poolBadge(spent(state.pickup), pool)}${info(TEXT.pickup, "Pick-up skills")}</h2>
          <p class="muted">INT + REF = ${pool} points. Up to ${CREATION_SKILL_CAP} each. Profession skills can't be raised here.</p>
          ${STATS.filter((s) => byStat[s.key]).map((s) => `
            <h3 class="group-title">${esc(s.name)}</h3>
            <div class="stepper-grid">${byStat[s.key].map((n) => stepper({ group: "pickup", key: n,
              label: n, cost: skillCost(n), help: SKILL_HELP[n], value: state.pickup[n] || 0, min: 0,
              max: Math.min(CREATION_SKILL_CAP, reachable(state.pickup, pool, n)) })).join("")}</div>`).join("")}`;
      },
      onStep(_, key, delta) {
        const f = finalStats();
        const max = Math.min(CREATION_SKILL_CAP, reachable(state.pickup, f.int + f.ref, key));
        const v = Math.min(max, Math.max(0, (state.pickup[key] || 0) + delta));
        if (v) state.pickup[key] = v; else delete state.pickup[key];
      },
      validate() {
        const f = finalStats();
        const over = spent(state.pickup) - (f.int + f.ref);
        return over > 0 ? `${over} point(s) over the limit.` : "";
      },
    },
    // 6 ---------------------------------------------------------------
    {
      title: "Coin",
      render(body) {
        const p = prof();
        const done = Boolean(state.coinDice);
        body.innerHTML = `
          <h2>Coin${info(TEXT.coin, "Coin")}</h2>
          <p class="muted">${esc(p.name)}: ${p.coinBase} crowns x 2d6 (average ${p.coinBase * 7}).
            You get one roll, or you can take the average instead. Either choice is final.</p>
          <div class="row">
            <button type="button" class="btn btn--primary" id="roll-coin" ${done ? "disabled" : ""}>Roll 2d6</button>
            <button type="button" class="btn" id="avg-coin" ${done ? "disabled" : ""}>Take the average</button>
          </div>
          <div style="margin-top:1.25rem" aria-live="polite">
            ${done ? `<p>${state.coinDice.join(" + ")} = ${state.coinDice[0] + state.coinDice[1]}, x ${p.coinBase}</p>
              <p class="dice-result">${coin()} crowns</p>` : `<p class="empty">Not rolled yet.</p>`}
          </div>`;
        body.querySelector("#roll-coin").addEventListener("click", () => {
          if (state.coinDice) return;
          state.coinDice = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
          this.render(body);
        });
        body.querySelector("#avg-coin").addEventListener("click", () => {
          if (state.coinDice) return;
          state.coinDice = [3, 4];
          this.render(body);
        });
      },
      validate: () => (state.coinDice ? "" : "Roll for coin or take the average."),
    },
    // 7 ---------------------------------------------------------------
    {
      title: "Outfit",
      render(body) {
        const p = prof();
        const f = finalStats();
        const STYLE = {
          clothing: ["Uniform", "Fashionable", "Tattered", "Practical", "Ornate", "Simple robes", "Furs and leather", "Elegant finery"],
          hair: ["Long and loose", "Shaved", "Braided", "Wild and messy", "Short and neat", "Topknot", "Always hooded"],
          affectation: ["Tattoos", "Jewelry", "Ritual scars", "A notable scar", "Heavy makeup", "An eyepatch", "Always smiling"],
        };
        body.innerHTML = `
          <h2>Outfit</h2>
          ${choiceList("gear", `Starting gear: choose ${p.gear.pick}`, p.gear.items, state.gear, p.gear.pick)}
          ${p.gear.fixed ? `<p class="muted">Always carried: ${p.gear.fixed.map(esc).join(", ")}.</p>` : ""}
          <div class="grid-3">
            ${selectField({ id: "s-clothing", label: "Clothing", options: STYLE.clothing, value: state.clothing })}
            ${selectField({ id: "s-hair", label: "Hair", options: STYLE.hair, value: state.hair })}
            ${selectField({ id: "s-affectation", label: "Affectation", options: STYLE.affectation, value: state.affectation })}
          </div>
          ${review([
            ["Name", esc([state.name, state.age, state.gender && (state.gender === "male" ? "Male" : "Female")].filter(Boolean).join(", "))],
            ["Race", esc(RACES[state.race].name)],
            ["Profession", esc(p.name)],
            ["Homeland", esc(state.homeland ? `${state.homeland} (${socialStanding(state.race, state.homeland)})` : "")],
            ["Statistics", STATS.map((s) => `${s.label} ${f[s.key]}`).join(", ")],
            ["Skills", esc(Object.entries({ ...state.profSkills, ...state.pickup }).map(([n, l]) => `${n} ${l}`).join(", "))],
            ["Coin", `${coin()} crowns`],
            ["Backstory", state.lore ? (state.shareLore ? "shared with the party" : "private (you and the GM)") : ""],
          ])}`;
      },
      onChange(e) {
        if (e.target.dataset.choice === "gear") {
          toggleChoice(state.gear, e.target.value, e.target.checked, prof().gear.pick);
          this.render(e.target.closest("#step-body"));
        }
        if (e.target.id?.startsWith("s-")) state[e.target.id.slice(2)] = e.target.value;
      },
      validate: () => (state.gear.length === prof().gear.pick ? "" : `Choose ${prof().gear.pick} items of starting gear.`),
    },
  ];

  createWizard({
    root, steps,
    async onFinish() {
      const p = prof();
      // No gear/style columns in the database (out of scope) -> kept in lifepath text
      const lifepath = [
        state.upbringing && `Upbringing: ${state.upbringing}`,
        state.lifeEvent && `Life event: ${state.lifeEvent}`,
        `Gear: ${[...state.gear, ...(p.gear.fixed || [])].join(", ")}`,
        [state.clothing, state.hair, state.affectation].some(Boolean) &&
          `Style: ${[state.clothing, state.hair, state.affectation].filter(Boolean).join(", ")}`,
      ].filter(Boolean).join("\n");
      const { char_id } = await createWitcherCharacter({
        session_id: session.session_id, name: state.name.trim(),
        age: state.age ? Number(state.age) : null, gender: state.gender, lore: state.lore.trim(),
        race: state.race, profession: state.profession, homeland: state.homeland,
        social_standing: socialStanding(state.race, state.homeland), lifepath,
        stats: finalStats(), coin: coin(),
      });
      for (const [skill, level] of Object.entries({ ...state.profSkills, ...state.pickup })) {
        await setWitcherSkill(char_id, skill, level);
      }
      if (state.shareLore && state.lore.trim()) await setLoreVisible(char_id, true);
      location.href = `sheet.html?char=${char_id}`;
    },
  });
}

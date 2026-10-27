// =====================================================================
// creators/vtm.js - Vampire: The Masquerade 5th edition, 8 steps
// (core rulebook order): Concept, Clan & Sire, Attributes, Skills,
// Disciplines, Predator Type, Advantages & Flaws, Convictions.
// =====================================================================

import { createVtmCharacter, setVtmSkill, setVtmDiscipline, setLoreVisible, VTM_ATTRIBUTES } from "../api.js";
import { esc, info } from "../ui.js";
import {
  createWizard, radioCards, dotPicker, textField, selectField, review, genderField, spreadStatus,
} from "../wizard.js";
import {
  ATTRIBUTES, ATTRIBUTE_SPREAD, SKILLS, SKILL_DISTRIBUTIONS, CLANS, ALL_DISCIPLINES,
  PREDATORS, ERAS, SECTS, cap, bloodPotency,
} from "../vtmRules.js";
import {
  ATTRIBUTE_HELP, SKILL_HELP, SPECIALTIES, CLAN_HELP, DISCIPLINE_HELP, TEXT, ADVANTAGES, FLAWS,
} from "../vtmHelp.js";

const FREE_SPECIALTY_SKILLS = ["Academics", "Craft", "Performance", "Science"];
const ALL_SKILLS = Object.values(SKILLS).flat();
const OTHER = "__other";
const GENERATION_NOTE = (g) => (g >= 14
  ? "Blood Potency 0. Barely a vampire: weak powers, but some daylight and food are bearable."
  : g >= 12 ? "Blood Potency 1. A typical young vampire, Embraced within living memory."
  : "Blood Potency 2. Older, stronger blood: Disciplines hit harder, but feeding on animals and blood bags stops working.");
const SECT_HELP = {
  Camarilla: "The old order. Enforces the Masquerade and is ruled by elders.",
  Anarch: "Rebels who reject the rule of the elders.",
  "Autarkis (independent)": "Loners who refuse to join any sect.",
  Unaligned: "Not part of any sect yet.",
};

export function startVtmCreator(root, session) {
  const state = {
    name: "", age: "", gender: "", concept: "", ambition: "", desire: "", sect: "",
    clan: null, sire: "", era: "neonate", generation: 13,
    attributes: Object.fromEntries(VTM_ATTRIBUTES.map((a) => [a, 1])),
    distribution: null, skills: Object.fromEntries(ALL_SKILLS.map((s) => [s, 0])),
    // specialty text per skill, and whether the player chose "Other" and typed it
    specialties: {}, specOther: {},
    freeSpecialtySkill: "", freeSpecialty: "", freeOther: false,
    primary: "", secondary: "",
    predator: null, predatorSpecialty: "", predatorDiscipline: "",
    advantages: [{ name: "", custom: "", dots: 1 }], flaws: [{ name: "", custom: "", dots: 1 }],
    convictions: [{ conviction: "", touchstone: "" }],
    lore: "", shareLore: false,
  };
  const FIELDS = {
    "v-name": "name", "v-age": "age", "v-concept": "concept", "v-ambition": "ambition",
    "v-desire": "desire", "v-sire": "sire", "v-lore": "lore", "v-free-spec-text": "freeSpecialty",
  };
  const textInput = (e) => { if (FIELDS[e.target.id]) state[FIELDS[e.target.id]] = e.target.value; };

  const clan = () => CLANS[state.clan];
  const era = () => ERAS[state.era];
  const isThin = () => state.clan === "thin_blood";
  const generations = () => (isThin() ? era().thinGenerations : era().generations);
  const humanity = () => 7 + (era().humanity || 0) + (PREDATORS[state.predator]?.humanity || 0);
  const countLevels = (values) => values.reduce((m, v) => ({ ...m, [v]: (m[v] || 0) + 1 }), {});
  const clanDisciplines = () => (state.clan === "caitiff" ? ALL_DISCIPLINES : clan()?.disciplines || []);
  const ordinal = (n) => `${n}th`;

  // A specialty: pick a suggestion, or "Other" and type your own
  function specialtyField(id, skill, value, other, label) {
    const list = SPECIALTIES[skill] || [];
    const selected = other ? OTHER : value;
    return `
      <div class="spec-field">
        ${selectField({ id, label, value: selected, attrs: `data-spec="${esc(skill)}"`,
          options: [...list.map((s) => [s, s]), [OTHER, "Other (write your own)"]] })}
        ${other ? textField({ id: `${id}-text`, label: "Your specialty", value, max: 60, required: true }) : ""}
      </div>`;
  }

  // One Advantage or Flaw row: pick from the list (or "Other") and its dots
  function advRow(kind, r, i) {
    const list = kind === "advantages" ? ADVANTAGES : FLAWS;
    const entry = list[r.name];
    const dotsAllowed = entry ? entry.dots : [1, 2, 3, 4, 5];
    return `
      <div class="adv-row">
        <select aria-label="${kind === "advantages" ? "Advantage" : "Flaw"} ${i + 1}" data-adv="${kind}" data-i="${i}" data-prop="name">
          <option value="">Choose</option>
          ${Object.keys(list).map((n) => `<option value="${esc(n)}" ${r.name === n ? "selected" : ""}>${esc(n)}</option>`).join("")}
          <option value="${OTHER}" ${r.name === OTHER ? "selected" : ""}>Other (write your own)</option>
        </select>
        <select aria-label="Dots" data-adv="${kind}" data-i="${i}" data-prop="dots">
          ${dotsAllowed.map((n) => `<option value="${n}" ${r.dots === n ? "selected" : ""}>${n} ${n === 1 ? "dot" : "dots"}</option>`).join("")}
        </select>
        <span class="adv-row__tools">
          <button type="button" class="btn btn--small btn--ghost" data-remove="${kind}" data-i="${i}">Remove</button></span>
        ${r.name === OTHER ? `<input type="text" class="adv-row__custom" aria-label="Name" data-adv="${kind}" data-i="${i}" data-prop="custom"
          value="${esc(r.custom)}" maxlength="60" placeholder="Name">` : ""}
        ${entry ? `<p class="option-note adv-row__note">${esc(entry.help)}</p>` : ""}
      </div>`;
  }
  const advName = (r) => (r.name === OTHER ? r.custom.trim() : r.name);
  const advUsed = (list) => list.reduce((s, r) => s + (advName(r) ? r.dots : 0), 0);

  const steps = [
    // 1 ---------------------------------------------------------------
    {
      title: "Concept",
      render(body) {
        body.innerHTML = `
          <h2>Concept</h2>
          <p class="muted">Who were they in life, and who are they now?</p>
          <div class="grid-3">
            ${textField({ id: "v-name", label: "Name", value: state.name, max: 60, required: true })}
            ${textField({ id: "v-age", label: "Apparent age", value: state.age, type: "number", attrs: 'min="1" max="5000"' })}
            ${genderField("gender", state.gender)}
          </div>
          ${textField({ id: "v-concept", label: "Concept", value: state.concept, max: 100, required: true, tip: TEXT.concept,
            help: "One line, for example \"burned-out ER nurse\" or \"failed rapper\"." })}
          <div class="grid-2">
            ${textField({ id: "v-ambition", label: "Ambition", value: state.ambition, max: 200, tip: TEXT.ambition })}
            ${textField({ id: "v-desire", label: "Desire", value: state.desire, max: 200, tip: TEXT.desire })}
          </div>
          ${radioCards("sect", "Sect", SECTS.map((s) => ({ value: s, title: s, text: SECT_HELP[s] })), state.sect, TEXT.sect)}`;
      },
      onInput: textInput,
      onChange(e) {
        if (e.target.name === "sect") state.sect = e.target.value;
        if (e.target.name === "gender") state.gender = e.target.value;
      },
      validate: () => (!state.name.trim() ? "Enter a name."
        : !state.gender ? "Choose male or female."
        : !state.concept.trim() ? "Write a one-line concept." : ""),
    },
    // 2 ---------------------------------------------------------------
    {
      title: "Clan & Sire",
      render(body) {
        if (!generations().includes(state.generation)) state.generation = generations()[generations().length - 1] ?? null;
        body.innerHTML = `
          <h2>Clan &amp; Sire</h2>
          ${radioCards("clan", "Clan", Object.entries(CLANS).map(([value, c]) => ({
            value, title: c.name, text: c.blurb, help: CLAN_HELP[value],
            extra: `${c.disciplines.length ? `<span class="tag-list">${c.disciplines.map((d) =>
              `<span class="tag">${esc(d)}${info(DISCIPLINE_HELP[d], d)}</span>`).join("")}</span>` : ""}
              <span class="bane"><strong>Bane, ${esc(c.bane.split(": ")[0])}:</strong> ${esc(c.bane.split(": ").slice(1).join(": "))}</span>`,
          })), state.clan)}
          ${textField({ id: "v-sire", label: "Sire", value: state.sire, max: 60, tip: TEXT.sire })}
          ${radioCards("era", "When were they Embraced?", Object.entries(ERAS).map(([value, e]) => ({
            value, title: e.name, text: e.text,
            disabled: isThin() && !e.thinGenerations.length, why: isThin() && !e.thinGenerations.length ? "Not possible for thin-bloods." : "",
          })), state.era, TEXT.era)}
          ${generations().length ? selectField({ id: "v-gen", label: "Generation", value: state.generation, placeholder: null, tip: TEXT.generation,
            note: esc(GENERATION_NOTE(state.generation)),
            options: generations().map((g) => [g, `${ordinal(g)} generation, Blood Potency ${bloodPotency(g, null)}`]) }) : ""}`;
      },
      onInput: textInput,
      onChange(e, rerender) {
        if (e.target.name === "clan") {
          state.clan = e.target.value;
          if (isThin() && state.era === "ancilla") state.era = "neonate";
          state.primary = ""; state.secondary = ""; state.predatorDiscipline = "";
          rerender();
        }
        if (e.target.name === "era") { state.era = e.target.value; rerender(); }
        if (e.target.id === "v-gen") { state.generation = Number(e.target.value); rerender(); }
      },
      validate: () => (!state.clan ? "Choose a clan." : !state.generation ? "Choose a generation." : ""),
    },
    // 3 ---------------------------------------------------------------
    {
      title: "Attributes",
      render(body) {
        const need = countLevels(ATTRIBUTE_SPREAD);
        const have = countLevels(Object.values(state.attributes));
        body.innerHTML = `
          <h2>Attributes${info(TEXT.attributes, "Attributes")}</h2>
          <p class="muted">Place one attribute at 4, three at 3, four at 2 and one at 1.
            Click the dots to set a level. The boxes below show how many you have placed at each level.</p>
          ${spreadStatus(need, have)}
          <div class="attr-grid">
            ${Object.entries(ATTRIBUTES).map(([group, attrs]) => `
              <section><h3 class="group-title">${group}</h3>
                ${attrs.map((a) => dotPicker({ name: `attr-${a}`, label: cap(a), value: state.attributes[a], min: 1, max: 4,
                  help: ATTRIBUTE_HELP[a] })).join("")}
              </section>`).join("")}
          </div>
          <p class="muted">Health ${state.attributes.stamina + 3}, Willpower ${state.attributes.composure + state.attributes.resolve}${info(TEXT.health, "Health and Willpower")}</p>`;
      },
      onChange(e, rerender) {
        if (e.target.name?.startsWith("attr-")) { state.attributes[e.target.name.slice(5)] = Number(e.target.value); rerender(); }
      },
      validate() {
        const ok = Object.values(state.attributes).sort((a, b) => b - a).join(",") === ATTRIBUTE_SPREAD.join(",");
        return ok ? "" : "Attributes must be one at 4, three at 3, four at 2 and one at 1.";
      },
    },
    // 4 ---------------------------------------------------------------
    {
      title: "Skills",
      render(body) {
        const dist = SKILL_DISTRIBUTIONS[state.distribution];
        const have = countLevels(Object.values(state.skills).filter((v) => v > 0));
        const withDots = (s) => state.skills[s] > 0;
        const freeSkills = ALL_SKILLS.filter(withDots);
        body.innerHTML = `
          <h2>Skills</h2>
          ${radioCards("dist", "Choose a distribution", Object.entries(SKILL_DISTRIBUTIONS).map(([value, d]) => ({
            value, title: d.name, text: d.text })), state.distribution, TEXT.distribution)}
          ${dist ? `
            ${spreadStatus(dist.spread, have)}
            <div class="attr-grid">
              ${Object.entries(SKILLS).map(([group, skills]) => `
                <section><h3 class="group-title">${group}</h3>
                  ${skills.map((s) => dotPicker({ name: `skill-${s}`, label: s, value: state.skills[s], min: 0, help: SKILL_HELP[s],
                    max: Math.max(...Object.keys(dist.spread).map(Number)) })).join("")}
                </section>`).join("")}
            </div>
            <h3>Specialties${info(TEXT.specialties, "Specialties")}</h3>
            <p class="muted">Academics, Craft, Performance and Science each get a free specialty once they have a dot.
              Then everyone picks one more for any skill with dots.</p>
            <div class="grid-3">
              ${FREE_SPECIALTY_SKILLS.filter(withDots).map((s) =>
                specialtyField(`v-spec-${s}`, s, state.specialties[s] || "", state.specOther[s], `${s} specialty`)).join("")}
            </div>
            <div class="grid-2">
              ${selectField({ id: "v-free-skill", label: "Extra specialty: which skill", value: state.freeSpecialtySkill,
                options: freeSkills, tip: TEXT.freeSpecialty,
                note: state.freeSpecialtySkill ? esc(SKILL_HELP[state.freeSpecialtySkill]) : "" })}
              ${state.freeSpecialtySkill
                ? specialtyField("v-free-spec", state.freeSpecialtySkill, state.freeSpecialty, state.freeOther, "Extra specialty")
                : `<p class="field-note">Pick a skill first.</p>`}
            </div>` : ""}`;
      },
      onInput(e) {
        if (e.target.id?.startsWith("v-spec-") && e.target.id.endsWith("-text")) {
          state.specialties[e.target.id.slice(7, -5)] = e.target.value;
        }
        if (e.target.id === "v-free-spec-text") state.freeSpecialty = e.target.value;
      },
      onChange(e, rerender) {
        const t = e.target;
        if (t.name === "dist") {
          state.distribution = t.value;
          for (const s of ALL_SKILLS) state.skills[s] = 0;
          rerender();
        }
        if (t.name?.startsWith("skill-")) {
          state.skills[t.name.slice(6)] = Number(t.value);
          if (state.freeSpecialtySkill && !state.skills[state.freeSpecialtySkill]) state.freeSpecialtySkill = "";
          rerender();
        }
        if (t.id === "v-free-skill") {
          state.freeSpecialtySkill = t.value; state.freeSpecialty = ""; state.freeOther = false; rerender();
        }
        if (t.id === "v-free-spec") {
          state.freeOther = t.value === OTHER;
          state.freeSpecialty = state.freeOther ? "" : t.value;
          rerender();
        }
        if (t.id?.startsWith("v-spec-") && t.tagName === "SELECT") {
          const skill = t.dataset.spec;
          state.specOther[skill] = t.value === OTHER;
          state.specialties[skill] = state.specOther[skill] ? "" : t.value;
          rerender();
        }
      },
      validate() {
        const dist = SKILL_DISTRIBUTIONS[state.distribution];
        if (!dist) return "Choose a skill distribution.";
        const have = countLevels(Object.values(state.skills).filter((v) => v > 0));
        const wrong = Object.entries(dist.spread).find(([lvl, n]) => (have[lvl] || 0) !== n)
          || Object.keys(have).find((lvl) => !dist.spread[lvl]);
        if (wrong) return `Place exactly: ${Object.entries(dist.spread).sort((a, b) => b[0] - a[0]).map(([l, n]) => `${n} at ${l}`).join(", ")}.`;
        const missing = FREE_SPECIALTY_SKILLS.find((s) => state.skills[s] > 0 && !(state.specialties[s] || "").trim());
        if (missing) return `Choose a specialty for ${missing}.`;
        if (!state.freeSpecialtySkill || !state.freeSpecialty.trim()) return "Choose the extra specialty.";
        return "";
      },
    },
    // 5 ---------------------------------------------------------------
    {
      title: "Disciplines",
      render(body) {
        if (isThin()) {
          body.innerHTML = `<h2>Disciplines</h2><p class="locked">Thin-bloods have no clan Disciplines. They use Thin-blood Alchemy instead, which this creator doesn't track yet.</p>`;
          return;
        }
        const options = clanDisciplines();
        const cards = (exclude) => options.filter((d) => d !== exclude).map((d) => ({ value: d, title: d, text: DISCIPLINE_HELP[d] }));
        body.innerHTML = `
          <h2>Disciplines${info(TEXT.disciplines, "Disciplines")}</h2>
          <p class="muted">${state.clan === "caitiff" ? "Caitiff can choose any two." : `In-clan for ${esc(clan().name)}: ${options.map(esc).join(", ")}.`}
            Your first one starts at 2 dots, the second at 1 dot.</p>
          ${radioCards("primary", "First Discipline (2 dots)", cards(state.secondary), state.primary)}
          ${radioCards("secondary", "Second Discipline (1 dot)", cards(state.primary), state.secondary)}`;
      },
      onChange(e, rerender) {
        if (e.target.name === "primary") { state.primary = e.target.value; rerender(); }
        if (e.target.name === "secondary") { state.secondary = e.target.value; rerender(); }
      },
      validate: () => (isThin() || (state.primary && state.secondary) ? "" : "Choose two Disciplines."),
    },
    // 6 ---------------------------------------------------------------
    {
      title: "Predator Type",
      render(body) {
        const p = PREDATORS[state.predator];
        const discOptions = p ? p.disciplines.filter((d) => d !== p.tremereOnly || state.clan === "tremere") : [];
        body.innerHTML = `
          <h2>Predator type${info(TEXT.predator, "Predator type")}</h2>
          <p class="muted">How you hunt. It adds a specialty, one Discipline dot, and may change Humanity.</p>
          ${radioCards("predator", "Choose how you feed", Object.entries(PREDATORS).map(([value, pr]) => ({
            value, title: pr.name, text: pr.blurb,
            extra: `${pr.humanity ? `Humanity ${pr.humanity > 0 ? "+" : ""}${pr.humanity}. ` : ""}${pr.potency ? "Blood Potency +1. " : ""}You also get: ${esc(pr.gains)}`,
          })), state.predator)}
          ${p ? `
            <div class="grid-2">
              ${selectField({ id: "v-pred-spec", label: "Specialty", value: state.predatorSpecialty, options: p.specialties, tip: TEXT.specialties,
                note: state.predatorSpecialty ? esc(`${state.predatorSpecialty.split(" (")[0]}: ${SKILL_HELP[state.predatorSpecialty.split(" (")[0]]} You need at least one dot in it.`) : "" })}
              ${isThin() ? `<p class="locked">Thin-bloods take no Discipline dot here.</p>`
                : selectField({ id: "v-pred-disc", label: "Discipline (+1 dot)", value: state.predatorDiscipline,
                  options: discOptions.map((d) => [d, d]), tip: "One more dot in this Discipline.",
                  note: state.predatorDiscipline ? esc(DISCIPLINE_HELP[state.predatorDiscipline]) : "" })}
            </div>` : ""}`;
      },
      onChange(e, rerender) {
        if (e.target.name === "predator") {
          state.predator = e.target.value; state.predatorSpecialty = ""; state.predatorDiscipline = "";
          rerender();
        }
        if (e.target.id === "v-pred-spec") { state.predatorSpecialty = e.target.value; rerender(); }
        if (e.target.id === "v-pred-disc") { state.predatorDiscipline = e.target.value; rerender(); }
      },
      validate() {
        if (!state.predator) return "Choose a predator type.";
        if (!state.predatorSpecialty) return "Choose the specialty.";
        const skill = state.predatorSpecialty.split(" (")[0];
        if (!state.skills[skill]) return `You need at least one dot in ${skill} to take this specialty. Pick the other one, or change your skills.`;
        if (!isThin() && !state.predatorDiscipline) return "Choose the Discipline.";
        return "";
      },
    },
    // 7 ---------------------------------------------------------------
    {
      title: "Advantages & Flaws",
      render(body) {
        const badge = (used, total) => `<span class="pool" data-state="${used === total ? "done" : used > total ? "over" : "open"}">${used} of ${total} points</span>`;
        body.innerHTML = `
          <h2>Advantages &amp; Flaws</h2>
          <p class="muted">${esc(PREDATORS[state.predator].name)} already gives you: ${esc(PREDATORS[state.predator].gains)} These don't count below.</p>
          <div class="grid-2">
            <section>
              <h3>Advantages ${badge(advUsed(state.advantages), era().advantages)}${info(TEXT.advantages, "Advantages")}</h3>
              ${state.advantages.map((r, i) => advRow("advantages", r, i)).join("")}
              <button type="button" class="btn btn--small" data-add="advantages">Add advantage</button>
            </section>
            <section>
              <h3>Flaws ${badge(advUsed(state.flaws), era().flaws)}${info(TEXT.flaws, "Flaws")}</h3>
              ${state.flaws.map((r, i) => advRow("flaws", r, i)).join("")}
              <button type="button" class="btn btn--small" data-add="flaws">Add flaw</button>
            </section>
          </div>`;
        body.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => {
          state[b.dataset.add].push({ name: "", custom: "", dots: 1 }); this.render(body);
        }));
        body.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => {
          state[b.dataset.remove].splice(Number(b.dataset.i), 1); this.render(body);
        }));
      },
      onInput(e) {
        const { adv, i, prop } = e.target.dataset;
        if (adv && prop === "custom") state[adv][Number(i)].custom = e.target.value;
      },
      onChange(e, rerender) {
        const { adv, i, prop } = e.target.dataset;
        if (!adv || prop === "custom") return;
        const row = state[adv][Number(i)];
        if (prop === "dots") row.dots = Number(e.target.value);
        if (prop === "name") {
          row.name = e.target.value;
          const allowed = (adv === "advantages" ? ADVANTAGES : FLAWS)[row.name]?.dots;
          if (allowed && !allowed.includes(row.dots)) row.dots = allowed[0];
        }
        rerender();
      },
      validate() {
        if (advUsed(state.advantages) !== era().advantages) return `Spend exactly ${era().advantages} points on Advantages.`;
        if (advUsed(state.flaws) !== era().flaws) return `Take exactly ${era().flaws} points of Flaws.`;
        return "";
      },
    },
    // 8 ---------------------------------------------------------------
    {
      title: "Convictions",
      render(body) {
        body.innerHTML = `
          <h2>Convictions &amp; Touchstones</h2>
          <p class="muted">One to three moral lines the character won't cross, each tied to a mortal Touchstone who stands for it.</p>
          ${state.convictions.map((c, i) => `
            <div class="grid-2 conviction">
              <div class="field"><label for="conv-${i}">Conviction ${i + 1}${info(TEXT.convictions, "Conviction")}</label>
                <input type="text" id="conv-${i}" data-conv="${i}" data-prop="conviction" value="${esc(c.conviction)}" maxlength="200"></div>
              <div class="field"><label for="touch-${i}">Touchstone ${i + 1}${info(TEXT.touchstones, "Touchstone")}</label>
                <input type="text" id="touch-${i}" data-conv="${i}" data-prop="touchstone" value="${esc(c.touchstone)}" maxlength="200"
                  placeholder="Name, and who they are"></div>
            </div>`).join("")}
          ${state.convictions.length < 3 ? `<button type="button" class="btn btn--small" id="add-conv">Add conviction</button>` : ""}
          ${textField({ id: "v-lore", label: "Backstory", value: state.lore, max: 4000, type: "textarea" })}
          <label class="toggle"><input type="checkbox" id="v-share" ${state.shareLore ? "checked" : ""}>
            Share the backstory with the coterie (the Storyteller always sees it)</label>
          ${review([
            ["Name", esc([state.name, state.concept].filter(Boolean).join(", "))],
            ["Clan", esc(`${clan().name}, ${ordinal(state.generation)} generation, Blood Potency ${bloodPotency(state.generation, state.predator)}`)],
            ["Sire / sect", esc([state.sire, state.sect].filter(Boolean).join(", "))],
            ["Attributes", esc(VTM_ATTRIBUTES.map((a) => `${cap(a)} ${state.attributes[a]}`).join(", "))],
            ["Disciplines", esc(disciplineLevels().map(([d, l]) => `${d} ${l}`).join(", ") || "none")],
            ["Predator", esc(`${PREDATORS[state.predator].name}, ${state.predatorSpecialty}`)],
            ["Humanity", humanity()],
          ])}`;
        body.querySelector("#add-conv")?.addEventListener("click", () => {
          state.convictions.push({ conviction: "", touchstone: "" }); this.render(body);
        });
      },
      onInput(e) {
        textInput(e);
        const { conv, prop } = e.target.dataset;
        if (conv !== undefined) state.convictions[Number(conv)][prop] = e.target.value;
      },
      onChange(e) { if (e.target.id === "v-share") state.shareLore = e.target.checked; },
      validate() {
        const filled = state.convictions.filter((c) => c.conviction.trim());
        if (!filled.length) return "Write at least one Conviction.";
        if (filled.some((c) => !c.touchstone.trim())) return "Every Conviction needs a Touchstone.";
        return "";
      },
    },
  ];

  function disciplineLevels() {
    const levels = {};
    if (state.primary) levels[state.primary] = 2;
    if (state.secondary) levels[state.secondary] = (levels[state.secondary] || 0) + 1;
    if (state.predatorDiscipline) levels[state.predatorDiscipline] = (levels[state.predatorDiscipline] || 0) + 1;
    return Object.entries(levels);
  }

  createWizard({
    root, steps,
    async onFinish() {
      const filled = state.convictions.filter((c) => c.conviction.trim());
      const list = (rows) => rows.filter(advName).map((r) => `${advName(r)} ${r.dots}`).join(", ");
      const { char_id } = await createVtmCharacter({
        session_id: session.session_id, name: state.name.trim(),
        age: state.age ? Number(state.age) : null, gender: state.gender, lore: state.lore.trim(),
        clan: state.clan, concept: state.concept.trim(), ambition: state.ambition.trim(), desire: state.desire.trim(),
        sect: state.sect, sire: state.sire.trim(), generation: state.generation,
        predator_type: state.predator, humanity: humanity(), attributes: state.attributes,
        convictions: filled.map((c) => c.conviction.trim()).join("\n"),
        touchstones: filled.map((c) => c.touchstone.trim()).join("\n"),
        advantages: [list(state.advantages), `From ${PREDATORS[state.predator].name}: ${PREDATORS[state.predator].gains}`]
          .filter(Boolean).join(". "),
        flaws: list(state.flaws),
      });
      // specialties: free ones, the extra one and the predator one (one text per skill)
      const spec = {};
      const add = (skill, text) => { if (text) spec[skill] = spec[skill] ? `${spec[skill]}; ${text}` : text; };
      for (const s of FREE_SPECIALTY_SKILLS) if (state.skills[s] > 0) add(s, state.specialties[s]?.trim());
      add(state.freeSpecialtySkill, state.freeSpecialty.trim());
      const [pSkill, pRest] = state.predatorSpecialty.split(" (");
      add(pSkill, pRest?.replace(/\)$/, ""));
      for (const [skill, level] of Object.entries(state.skills)) {
        if (level > 0) await setVtmSkill(char_id, skill, level, spec[skill] || null);
      }
      for (const [d, l] of disciplineLevels()) await setVtmDiscipline(char_id, d, l);
      if (state.shareLore && state.lore.trim()) await setLoreVisible(char_id, true);
      location.href = `sheet.html?char=${char_id}`;
    },
  });
}

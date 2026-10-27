// =====================================================================
// creators/vtm.js - Vampire: The Masquerade 5th edition, 8 steps
// (core rulebook order): Concept, Clan & Sire, Attributes, Skills,
// Disciplines, Predator Type, Advantages & Flaws, Convictions.
// =====================================================================

import { createVtmCharacter, setVtmSkill, setVtmDiscipline, setLoreVisible, VTM_ATTRIBUTES } from "../api.js";
import { esc } from "../ui.js";
import { createWizard, radioCards, dotPicker, textField, selectField, review } from "../wizard.js";
import {
  ATTRIBUTES, ATTRIBUTE_SPREAD, SKILLS, SKILL_DISTRIBUTIONS, CLANS, ALL_DISCIPLINES, DISCIPLINE_TEXT,
  PREDATORS, ERAS, SECTS, cap, bloodPotency,
} from "../vtmRules.js";

const FREE_SPECIALTY_SKILLS = ["Academics", "Craft", "Performance", "Science"];
const ALL_SKILLS = Object.values(SKILLS).flat();
const dotsText = (n) => "•".repeat(n);

export function startVtmCreator(root, session) {
  const state = {
    name: "", age: "", gender: "", concept: "", ambition: "", desire: "", sect: "",
    clan: null, sire: "", era: "neonate", generation: 13,
    attributes: Object.fromEntries(VTM_ATTRIBUTES.map((a) => [a, 1])),
    distribution: null, skills: Object.fromEntries(ALL_SKILLS.map((s) => [s, 0])),
    specialties: {}, freeSpecialtySkill: "", freeSpecialty: "",
    primary: "", secondary: "",
    predator: null, predatorSpecialty: "", predatorDiscipline: "",
    advantages: [{ name: "", dots: 1 }], flaws: [{ name: "", dots: 1 }],
    convictions: [{ conviction: "", touchstone: "" }],
    lore: "", shareLore: false,
  };
  const FIELDS = {
    "v-name": "name", "v-age": "age", "v-gender": "gender", "v-concept": "concept", "v-ambition": "ambition",
    "v-desire": "desire", "v-sire": "sire", "v-lore": "lore", "v-free-spec": "freeSpecialty",
  };
  const textInput = (e) => { if (FIELDS[e.target.id]) state[FIELDS[e.target.id]] = e.target.value; };

  const clan = () => CLANS[state.clan];
  const era = () => ERAS[state.era];
  const isThin = () => state.clan === "thin_blood";
  const generations = () => (isThin() ? era().thinGenerations : era().generations);
  const humanity = () => 7 + (era().humanity || 0) + (PREDATORS[state.predator]?.humanity || 0);
  const countLevels = (values) => values.reduce((m, v) => ({ ...m, [v]: (m[v] || 0) + 1 }), {});
  const clanDisciplines = () => (state.clan === "caitiff" ? ALL_DISCIPLINES : clan()?.disciplines || []);

  function spreadTable(need, have) {
    return `<table class="spread"><tr><th>Dots</th>${Object.keys(need).sort((a, b) => b - a).map((k) => `<td>${dotsText(+k)}</td>`).join("")}</tr>
      <tr><th>Needed</th>${Object.keys(need).sort((a, b) => b - a).map((k) => `<td>${need[k]}</td>`).join("")}</tr>
      <tr><th>Placed</th>${Object.keys(need).sort((a, b) => b - a).map((k) =>
        `<td class="${(have[k] || 0) === need[k] ? "ok" : (have[k] || 0) > need[k] ? "over" : ""}">${have[k] || 0}</td>`).join("")}</tr></table>`;
  }

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
            ${textField({ id: "v-gender", label: "Gender", value: state.gender, max: 30 })}
          </div>
          ${textField({ id: "v-concept", label: "Concept", value: state.concept, max: 100, required: true, help: "One line, e.g. \"burned-out ER nurse\" or \"failed rapper\"." })}
          <div class="grid-2">
            ${textField({ id: "v-ambition", label: "Ambition", value: state.ambition, max: 200, help: "A long-term goal." })}
            ${textField({ id: "v-desire", label: "Desire", value: state.desire, max: 200, help: "What they want right now." })}
          </div>
          ${selectField({ id: "v-sect", label: "Sect", options: SECTS, value: state.sect })}`;
      },
      onInput: textInput,
      onChange(e) { if (e.target.id === "v-sect") state.sect = e.target.value; },
      validate: () => (!state.name.trim() ? "Enter a name." : !state.concept.trim() ? "Write a one-line concept." : ""),
    },
    // 2 ---------------------------------------------------------------
    {
      title: "Clan & Sire",
      render(body) {
        if (!generations().includes(state.generation)) state.generation = generations()[generations().length - 1] ?? null;
        body.innerHTML = `
          <h2>Clan &amp; Sire</h2>
          ${radioCards("clan", "Clan", Object.entries(CLANS).map(([value, c]) => ({
            value, title: c.name, text: c.blurb,
            extra: `${c.disciplines.length ? `<strong>${c.disciplines.map(esc).join(" · ")}</strong><br>` : ""}${esc(c.bane)}`,
          })), state.clan)}
          ${textField({ id: "v-sire", label: "Sire", value: state.sire, max: 60, help: "The vampire who Embraced them." })}
          ${radioCards("era", "When were they Embraced?", Object.entries(ERAS).map(([value, e]) => ({
            value, title: e.name, text: e.text,
            disabled: isThin() && !e.thinGenerations.length, why: isThin() && !e.thinGenerations.length ? "Not possible for thin-bloods." : "",
          })), state.era)}
          ${generations().length ? selectField({ id: "v-gen", label: "Generation", value: state.generation, placeholder: "—",
            options: generations().map((g) => [g, `${g}th generation · Blood Potency ${bloodPotency(g, null)}`]) }) : ""}`;
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
        if (e.target.id === "v-gen") state.generation = Number(e.target.value);
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
          <h2>Attributes</h2>
          <p class="muted">One at ••••, three at •••, four at ••, one at •.</p>
          ${spreadTable(need, have)}
          <div class="attr-grid">
            ${Object.entries(ATTRIBUTES).map(([group, attrs]) => `
              <section><h3 class="group-title">${group}</h3>
                ${attrs.map((a) => dotPicker({ name: `attr-${a}`, label: cap(a), value: state.attributes[a], min: 1, max: 4 })).join("")}
              </section>`).join("")}
          </div>
          <p class="muted">Health ${state.attributes.stamina + 3} (Stamina + 3) · Willpower ${state.attributes.composure + state.attributes.resolve} (Composure + Resolve)</p>`;
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
        body.innerHTML = `
          <h2>Skills</h2>
          ${radioCards("dist", "Choose a distribution", Object.entries(SKILL_DISTRIBUTIONS).map(([value, d]) => ({
            value, title: d.name, text: d.text })), state.distribution)}
          ${dist ? `
            ${spreadTable(dist.spread, have)}
            <div class="attr-grid">
              ${Object.entries(SKILLS).map(([group, skills]) => `
                <section><h3 class="group-title">${group}</h3>
                  ${skills.map((s) => dotPicker({ name: `skill-${s}`, label: s, value: state.skills[s], min: 0,
                    max: Math.max(...Object.keys(dist.spread).map(Number)) })).join("")}
                </section>`).join("")}
            </div>
            <h3>Specialties</h3>
            <p class="muted">Academics, Craft, Performance and Science each get a free specialty if they have dots. Then pick one more.</p>
            <div class="grid-2">
              ${FREE_SPECIALTY_SKILLS.filter(withDots).map((s) =>
                textField({ id: `v-spec-${s}`, label: `${s} specialty`, value: state.specialties[s] || "", max: 60, required: true })).join("")}
              ${selectField({ id: "v-free-skill", label: "Extra specialty: skill", value: state.freeSpecialtySkill,
                options: ALL_SKILLS.filter(withDots) })}
              ${textField({ id: "v-free-spec", label: "Extra specialty", value: state.freeSpecialty, max: 60, required: true })}
            </div>` : ""}`;
      },
      onInput(e) {
        textInput(e);
        if (e.target.id?.startsWith("v-spec-")) state.specialties[e.target.id.slice(7)] = e.target.value;
      },
      onChange(e, rerender) {
        if (e.target.name === "dist") {
          state.distribution = e.target.value;
          for (const s of ALL_SKILLS) state.skills[s] = 0;
          rerender();
        }
        if (e.target.name?.startsWith("skill-")) { state.skills[e.target.name.slice(6)] = Number(e.target.value); rerender(); }
        if (e.target.id === "v-free-skill") state.freeSpecialtySkill = e.target.value;
      },
      validate() {
        const dist = SKILL_DISTRIBUTIONS[state.distribution];
        if (!dist) return "Choose a skill distribution.";
        const have = countLevels(Object.values(state.skills).filter((v) => v > 0));
        const wrong = Object.entries(dist.spread).find(([lvl, n]) => (have[lvl] || 0) !== n)
          || Object.keys(have).find((lvl) => !dist.spread[lvl]);
        if (wrong) return `Place exactly: ${Object.entries(dist.spread).sort((a, b) => b[0] - a[0]).map(([l, n]) => `${n} at ${l}`).join(", ")}.`;
        const missing = FREE_SPECIALTY_SKILLS.find((s) => state.skills[s] > 0 && !(state.specialties[s] || "").trim());
        if (missing) return `Add a specialty for ${missing}.`;
        if (!state.freeSpecialtySkill || !state.freeSpecialty.trim()) return "Pick the extra specialty.";
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
        body.innerHTML = `
          <h2>Disciplines</h2>
          <p class="muted">${state.clan === "caitiff" ? "Caitiff can choose any two." : `In-clan for ${esc(clan().name)}: ${options.map(esc).join(", ")}.`}
            One at ••, one at •.</p>
          <div class="grid-2">
            ${selectField({ id: "v-primary", label: "First Discipline (••)", value: state.primary,
              options: options.filter((d) => d !== state.secondary).map((d) => [d, `${d} — ${DISCIPLINE_TEXT[d]}`]) })}
            ${selectField({ id: "v-secondary", label: "Second Discipline (•)", value: state.secondary,
              options: options.filter((d) => d !== state.primary).map((d) => [d, `${d} — ${DISCIPLINE_TEXT[d]}`]) })}
          </div>`;
      },
      onChange(e, rerender) {
        if (e.target.id === "v-primary") { state.primary = e.target.value; rerender(); }
        if (e.target.id === "v-secondary") { state.secondary = e.target.value; rerender(); }
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
          <h2>Predator type</h2>
          <p class="muted">How you hunt. It adds a specialty, a Discipline dot, and may change Humanity.</p>
          ${radioCards("predator", "Choose how you feed", Object.entries(PREDATORS).map(([value, pr]) => ({
            value, title: pr.name, text: pr.blurb,
            extra: `${pr.humanity ? `Humanity ${pr.humanity > 0 ? "+" : ""}${pr.humanity} · ` : ""}${pr.potency ? "Blood Potency +1 · " : ""}${esc(pr.gains)}`,
          })), state.predator)}
          ${p ? `
            <div class="grid-2">
              ${selectField({ id: "v-pred-spec", label: "Specialty", value: state.predatorSpecialty, options: p.specialties })}
              ${isThin() ? `<p class="locked">Thin-bloods take no Discipline dot here.</p>`
                : selectField({ id: "v-pred-disc", label: "Discipline (+•)", value: state.predatorDiscipline, options: discOptions })}
            </div>` : ""}`;
      },
      onChange(e, rerender) {
        if (e.target.name === "predator") {
          state.predator = e.target.value; state.predatorSpecialty = ""; state.predatorDiscipline = "";
          rerender();
        }
        if (e.target.id === "v-pred-spec") state.predatorSpecialty = e.target.value;
        if (e.target.id === "v-pred-disc") state.predatorDiscipline = e.target.value;
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
        const used = (list) => list.reduce((s, r) => s + (r.name.trim() ? r.dots : 0), 0);
        const rows = (kind, list) => list.map((r, i) => `
          <div class="adv-row">
            <input type="text" aria-label="${kind} name" data-adv="${kind}" data-i="${i}" data-prop="name" value="${esc(r.name)}" maxlength="60"
              placeholder="${kind === "advantages" ? "e.g. Resources, Haven, Allies" : "e.g. Enemy, Dark Secret"}">
            <select aria-label="${kind} dots" data-adv="${kind}" data-i="${i}" data-prop="dots">
              ${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${r.dots === n ? "selected" : ""}>${dotsText(n)}</option>`).join("")}
            </select>
            <button type="button" class="btn btn--small btn--ghost" data-remove="${kind}" data-i="${i}" aria-label="Remove">×</button>
          </div>`).join("");
        body.innerHTML = `
          <h2>Advantages &amp; Flaws</h2>
          <p class="muted">${esc(PREDATORS[state.predator].name)} already gives you: ${esc(PREDATORS[state.predator].gains)} These don't count below.</p>
          <div class="grid-2">
            <section>
              <h3>Advantages <span class="pool" data-state="${used(state.advantages) === era().advantages ? "done" : used(state.advantages) > era().advantages ? "over" : "open"}">${used(state.advantages)} / ${era().advantages}</span></h3>
              ${rows("advantages", state.advantages)}
              <button type="button" class="btn btn--small" data-add="advantages">+ Add advantage</button>
            </section>
            <section>
              <h3>Flaws <span class="pool" data-state="${used(state.flaws) === era().flaws ? "done" : used(state.flaws) > era().flaws ? "over" : "open"}">${used(state.flaws)} / ${era().flaws}</span></h3>
              ${rows("flaws", state.flaws)}
              <button type="button" class="btn btn--small" data-add="flaws">+ Add flaw</button>
            </section>
          </div>`;
        body.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => {
          state[b.dataset.add].push({ name: "", dots: 1 }); this.render(body);
        }));
        body.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => {
          state[b.dataset.remove].splice(Number(b.dataset.i), 1); this.render(body);
        }));
      },
      onInput(e) {
        const { adv, i, prop } = e.target.dataset;
        if (adv && prop === "name") state[adv][Number(i)].name = e.target.value;
      },
      onChange(e, rerender) {
        const { adv, i, prop } = e.target.dataset;
        if (adv) {
          state[adv][Number(i)][prop] = prop === "dots" ? Number(e.target.value) : e.target.value;
          rerender();
        }
      },
      validate() {
        const used = (list) => list.reduce((s, r) => s + (r.name.trim() ? r.dots : 0), 0);
        if (used(state.advantages) !== era().advantages) return `Spend exactly ${era().advantages} points on Advantages.`;
        if (used(state.flaws) !== era().flaws) return `Take exactly ${era().flaws} points of Flaws.`;
        return "";
      },
    },
    // 8 ---------------------------------------------------------------
    {
      title: "Convictions",
      render(body) {
        body.innerHTML = `
          <h2>Convictions &amp; Touchstones</h2>
          <p class="muted">One to three moral lines the character won't cross, each tied to a mortal Touchstone who embodies it.</p>
          ${state.convictions.map((c, i) => `
            <div class="grid-2 conviction">
              <div class="field"><label for="conv-${i}">Conviction ${i + 1}</label>
                <input type="text" id="conv-${i}" data-conv="${i}" data-prop="conviction" value="${esc(c.conviction)}" maxlength="200"></div>
              <div class="field"><label for="touch-${i}">Touchstone ${i + 1}</label>
                <input type="text" id="touch-${i}" data-conv="${i}" data-prop="touchstone" value="${esc(c.touchstone)}" maxlength="200"
                  placeholder="Name, and who they are"></div>
            </div>`).join("")}
          ${state.convictions.length < 3 ? `<button type="button" class="btn btn--small" id="add-conv">+ Add conviction</button>` : ""}
          ${textField({ id: "v-lore", label: "Backstory", value: state.lore, max: 4000, type: "textarea" })}
          <label class="toggle"><input type="checkbox" id="v-share" ${state.shareLore ? "checked" : ""}>
            Share the backstory with the coterie (the Storyteller always sees it)</label>
          ${review([
            ["Name", esc([state.name, state.concept].filter(Boolean).join(" — "))],
            ["Clan", esc(`${clan().name}, ${state.generation}th generation, Blood Potency ${bloodPotency(state.generation, state.predator)}`)],
            ["Sire / sect", esc([state.sire, state.sect].filter(Boolean).join(" · "))],
            ["Attributes", esc(VTM_ATTRIBUTES.map((a) => `${cap(a)} ${state.attributes[a]}`).join(", "))],
            ["Disciplines", esc(disciplineLevels().map(([d, l]) => `${d} ${l}`).join(", ") || "none")],
            ["Predator", esc(`${PREDATORS[state.predator].name} — ${state.predatorSpecialty}`)],
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
      const list = (rows) => rows.filter((r) => r.name.trim()).map((r) => `${r.name.trim()} ${dotsText(r.dots)}`).join(", ");
      const { char_id } = await createVtmCharacter({
        session_id: session.session_id, name: state.name.trim(),
        age: state.age ? Number(state.age) : null, gender: state.gender.trim(), lore: state.lore.trim(),
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

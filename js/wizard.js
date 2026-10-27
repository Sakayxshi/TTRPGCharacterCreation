// =====================================================================
// wizard.js - the step-by-step engine shared by all three creators
//
// A creator passes a list of steps. Each step is an object:
//   title       shown in the step bar
//   optional    true -> a "Skip" button appears
//   render(body)        draws the step into `body` from the state
//   validate()          returns "" if OK, or an error message
//   onStep(group, key, delta)   (optional) a +/- button was pressed
//   onChange(event)             (optional) an input changed
// The engine handles navigation, the step bar, error messages, and
// re-drawing after every +/- click.
// =====================================================================

import { $, $$, esc, showMessage, info } from "./ui.js";

export function createWizard({ root, steps, finishLabel = "Save character", onFinish }) {
  root.innerHTML = `
    <ol class="steps" id="steps">
      ${steps.map((s, i) => `<li><button type="button" data-step="${i}"><span class="steps__num">Step ${i + 1}</span>${esc(s.title)}${s.optional ? " (optional)" : ""}</button></li>`).join("")}
    </ol>
    <form id="wizard" class="panel" novalidate>
      <div id="step-body"></div>
      <p id="step-msg" class="message" role="alert" hidden></p>
      <div class="step-nav">
        <button type="button" class="btn" id="prev">Back</button>
        <div class="row">
          <button type="button" class="btn btn--ghost" id="skip" hidden>Skip</button>
          <button type="submit" class="btn btn--primary" id="next">Next</button>
        </div>
      </div>
    </form>`;

  const body = $("#step-body", root);
  let current = 0;
  let reached = 0;

  const rerender = () => steps[current].render(body);

  function go(index) {
    current = Math.max(0, Math.min(index, steps.length - 1));
    showMessage($("#step-msg", root), "");
    rerender();
    $("#prev", root).disabled = current === 0;
    $("#skip", root).hidden = !steps[current].optional;
    $("#next", root).textContent = current === steps.length - 1 ? finishLabel : "Next";
    $$("#steps button", root).forEach((b, i) => {
      b.disabled = i > reached;
      b.dataset.done = String(i < reached && i !== current);
      if (i === current) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
    });
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("#steps", root).addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-step]");
    if (btn && !btn.disabled) go(Number(btn.dataset.step));
  });
  $("#prev", root).addEventListener("click", () => go(current - 1));
  $("#skip", root).addEventListener("click", () => { reached = Math.max(reached, current + 1); go(current + 1); });

  $("#wizard", root).addEventListener("submit", async (e) => {
    e.preventDefault();
    const problem = steps[current].validate?.() || "";
    if (problem) {
      showMessage($("#step-msg", root), problem);
      return;
    }
    if (current < steps.length - 1) {
      reached = Math.max(reached, current + 1);
      go(current + 1);
      return;
    }
    const next = $("#next", root);
    next.disabled = true;
    try {
      await onFinish();
    } catch (err) {
      showMessage($("#step-msg", root), err.message);
      next.disabled = false;
    }
  });

  // one listener for every +/- button on every step
  body.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-group]");
    if (!btn || !steps[current].onStep) return;
    const { group, key, delta } = btn.dataset;
    steps[current].onStep(group, key, Number(delta));
    rerender();
    body.querySelector(`button[data-group="${group}"][data-key="${CSS.escape(key)}"][data-delta="${delta}"]`)?.focus();
  });
  body.addEventListener("change", (e) => steps[current].onChange?.(e, rerender));
  body.addEventListener("input", (e) => steps[current].onInput?.(e));

  go(0);
  return { go, rerender };
}

// ---------------- small building blocks used by the creators ----------------
// Every block accepts `help`: a short explanation shown by a "?" button.

export function stepper({ group, key, label, sub = "", value, min, max, help = "", cost = 1 }) {
  const id = `${group}-${key}`.replace(/[^a-z0-9-]/gi, "_");
  return `
    <div class="stepper ${value > min ? "stepper--set" : ""}">
      <span class="stepper__label" id="${id}-label"><span class="stepper__name">${keepWithLast(label, info(cost === 2 ? `${help} Difficult skill: every level costs 2 points.` : help, label))}</span>${sub || cost === 2 ? `<small>${esc(sub)}${cost === 2 ? costTag() : ""}</small>` : ""}</span>
      <span class="stepper__control">
        <button type="button" data-group="${group}" data-key="${esc(key)}" data-delta="-1"
          aria-label="Lower ${esc(label)}" ${value <= min ? "disabled" : ""}>-</button>
        <output aria-labelledby="${id}-label" aria-live="polite">${esc(value)}</output>
        <button type="button" data-group="${group}" data-key="${esc(key)}" data-delta="1"
          aria-label="Raise ${esc(label)}" ${value >= max ? "disabled" : ""}>+</button>
      </span>
    </div>`;
}

// "Language: Nordling ?" -> the "?" never ends up alone on a new line
function keepWithLast(label, extra) {
  const i = label.lastIndexOf(" ");
  if (!extra) return esc(label);
  return `${esc(label.slice(0, i + 1))}<span class="nowrap">${esc(label.slice(i + 1))}${extra}</span>`;
}

// Difficult Witcher skills cost 2 points per level
export function costTag() {
  return `<span class="cost-tag" title="Costs 2 points per level">x2</span>`;
}

export function poolBadge(used, total, unit = "points") {
  const left = total - used;
  const state = left < 0 ? "over" : left === 0 ? "done" : "open";
  return `<span class="pool" data-state="${state}">${left} of ${total} ${unit} left</span>`;
}

// Checkbox list limited to `limit` choices. options: strings or [value, help].
// Changes reach onChange with event.target.dataset.choice === group.
export function choiceList(group, legend, options, selected, limit) {
  return `
    <fieldset class="choices choices--list">
      <legend>${esc(legend)} <span class="count">${selected.length} of ${limit} chosen</span></legend>
      <div class="check-list">
        ${options.map((o) => {
          const [v, help] = Array.isArray(o) ? o : [o, ""];
          return `<label><input type="checkbox" data-choice="${esc(group)}" value="${esc(v)}"
            ${selected.includes(v) ? "checked" : ""} ${!selected.includes(v) && selected.length >= limit ? "disabled" : ""}> <span>${esc(v)}</span>${info(help, v)}</label>`;
        }).join("")}
      </div>
    </fieldset>`;
}

export function toggleChoice(list, value, checked, limit) {
  if (checked && !list.includes(value) && list.length < limit) list.push(value);
  if (!checked && list.includes(value)) list.splice(list.indexOf(value), 1);
}

// Radio cards. options: [{ value, title, text, extra, disabled, why, help }]
export function radioCards(name, legend, options, selectedValue, legendHelp = "") {
  return `
    <fieldset class="choices">
      <legend>${esc(legend)}${info(legendHelp, legend)}</legend>
      ${options.map((o) => `
        <label class="choice">
          <input type="radio" name="${esc(name)}" value="${esc(o.value)}"
            ${selectedValue === o.value ? "checked" : ""} ${o.disabled ? "disabled" : ""}>
          <span class="choice__title">${esc(o.title)}${info(o.help, o.title)}</span>
          ${o.text ? `<span class="choice__text">${esc(o.text)}</span>` : ""}
          ${o.extra ? `<span class="choice__text choice__extra">${o.extra}</span>` : ""}
          ${o.why ? `<span class="choice__why">${esc(o.why)}</span>` : ""}
        </label>`).join("")}
    </fieldset>`;
}

// Dot picker built from real radio inputs, with the number shown next to it
export function dotPicker({ name, label, value, max = 5, min = 0, sub = "", help = "" }) {
  return `
    <fieldset class="dot-picker">
      <legend>${esc(label)}${info(help, label)}${sub ? ` <small>${esc(sub)}</small>` : ""}</legend>
      <span class="dot-picker__dots">
        ${min === 0 ? `<label class="dot-picker__clear"><input type="radio" name="${esc(name)}" value="0" ${value === 0 ? "checked" : ""}><span>0</span></label>` : ""}
        ${Array.from({ length: max }, (_, i) => i + 1).map((n) => `
          <label class="dot-picker__dot ${n <= value ? "on" : ""}" title="${n}">
            <input type="radio" name="${esc(name)}" value="${n}" ${value === n ? "checked" : ""} ${n < min ? "disabled" : ""}>
            <span class="visually-hidden">${n}</span>
          </label>`).join("")}
        <span class="dot-picker__value" aria-hidden="true">${value}</span>
      </span>
    </fieldset>`;
}

export function textField({ id, label, value = "", max = 100, help = "", required = false, type = "text", attrs = "", tip = "" }) {
  return `
    <div class="field">
      <label for="${id}">${esc(label)}${required ? "" : ' <span class="muted">(optional)</span>'}${info(tip, label)}</label>
      ${type === "textarea"
        ? `<textarea id="${id}" data-field="${id}" maxlength="${max}" ${attrs}>${esc(value)}</textarea>`
        : `<input type="${type}" id="${id}" data-field="${id}" value="${esc(value)}" ${type === "text" ? `maxlength="${max}"` : ""} ${required ? "required" : ""} ${attrs}>`}
      ${help ? `<small>${esc(help)}</small>` : ""}
    </div>`;
}

// options: strings, [value, text] pairs, or { group: [...] } for <optgroup>s
// note: a short explanation of the chosen option, shown under the field (HTML, escape it first)
export function selectField({ id, label, options, value = "", help = "", placeholder = "Choose", tip = "", attrs = "", note = "" }) {
  const opt = (o) => {
    const [v, t] = Array.isArray(o) ? o : [o, o];
    return `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(t)}</option>`;
  };
  const body = Array.isArray(options)
    ? options.map(opt).join("")
    : Object.entries(options).map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(opt).join("")}</optgroup>`).join("");
  return `
    <div class="field">
      <label for="${id}">${esc(label)}${info(tip, label)}</label>
      <select id="${id}" data-field="${id}" ${attrs}>
        ${placeholder !== null ? `<option value="">${esc(placeholder)}</option>` : ""}
        ${body}
      </select>
      ${help ? `<small>${esc(help)}</small>` : ""}
      ${note ? `<p class="option-note">${note}</p>` : ""}
    </div>`;
}

// Male / Female as two big buttons (real radio inputs underneath)
export function genderField(name, value) {
  return `
    <fieldset class="field segmented">
      <legend class="label">Gender</legend>
      <div class="segmented__options">
        ${[["male", "Male"], ["female", "Female"]].map(([v, t]) => `
          <label><input type="radio" name="${esc(name)}" value="${v}" ${value === v ? "checked" : ""}><span>${t}</span></label>`).join("")}
      </div>
    </fieldset>`;
}

export function review(rows) {
  return `
    <section class="review">
      <h3>Review</h3>
      <dl>${rows.filter(([, v]) => v !== undefined).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v === "" || v == null ? '<span class="muted">None</span>' : v}</dd>`).join("")}</dl>
    </section>`;
}

// Shows how many traits sit at each level vs how many are needed
// need/have: { level: count }. Used for the Vampire attribute and skill spreads.
export function spreadStatus(need, have) {
  const levels = Object.keys(need).map(Number).sort((a, b) => b - a);
  return `<ul class="spread-status">${levels.map((l) => {
    const h = have[l] || 0;
    const n = need[l];
    const state = h === n ? "done" : h > n ? "over" : "open";
    return `<li data-state="${state}"><span class="spread-status__level">Level ${l}</span>
      <span class="spread-status__count">${h} of ${n}</span></li>`;
  }).join("")}</ul>`;
}

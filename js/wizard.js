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

import { $, $$, esc, showMessage } from "./ui.js";

export function createWizard({ root, steps, finishLabel = "Save character", onFinish }) {
  root.innerHTML = `
    <ol class="steps" id="steps">
      ${steps.map((s, i) => `<li><button type="button" data-step="${i}">${esc(s.title)}${s.optional ? " (optional)" : ""}</button></li>`).join("")}
    </ol>
    <form id="wizard" class="panel" novalidate>
      <div id="step-body"></div>
      <p id="step-msg" class="message" role="alert" hidden></p>
      <div class="step-nav">
        <button type="button" class="btn" id="prev">← Back</button>
        <div class="row">
          <button type="button" class="btn btn--ghost" id="skip" hidden>Skip</button>
          <button type="submit" class="btn btn--primary" id="next">Next →</button>
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
    $("#next", root).textContent = current === steps.length - 1 ? finishLabel : "Next →";
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

export function stepper({ group, key, label, sub = "", value, min, max }) {
  const id = `${group}-${key}`.replace(/[^a-z0-9-]/gi, "_");
  return `
    <div class="stepper">
      <span class="stepper__label" id="${id}-label">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ""}</span>
      <span class="stepper__control">
        <button type="button" data-group="${group}" data-key="${esc(key)}" data-delta="-1"
          aria-label="Lower ${esc(label)}" ${value <= min ? "disabled" : ""}>−</button>
        <output aria-labelledby="${id}-label" aria-live="polite">${esc(value)}</output>
        <button type="button" data-group="${group}" data-key="${esc(key)}" data-delta="1"
          aria-label="Raise ${esc(label)}" ${value >= max ? "disabled" : ""}>+</button>
      </span>
    </div>`;
}

export function poolBadge(used, total, unit = "points") {
  const left = total - used;
  const state = left < 0 ? "over" : left === 0 ? "done" : "open";
  return `<span class="pool" data-state="${state}">${left} / ${total} ${unit} left</span>`;
}

// Checkbox list limited to `limit` choices. Changes reach onChange with
// event.target.dataset.choice === group.
export function choiceList(group, legend, options, selected, limit) {
  return `
    <fieldset class="choices choices--list">
      <legend>${esc(legend)} (${selected.length}/${limit})</legend>
      <div class="check-list">
        ${options.map((o) => `<label><input type="checkbox" data-choice="${esc(group)}" value="${esc(o)}"
          ${selected.includes(o) ? "checked" : ""} ${!selected.includes(o) && selected.length >= limit ? "disabled" : ""}> ${esc(o)}</label>`).join("")}
      </div>
    </fieldset>`;
}

export function toggleChoice(list, value, checked, limit) {
  if (checked && !list.includes(value) && list.length < limit) list.push(value);
  if (!checked && list.includes(value)) list.splice(list.indexOf(value), 1);
}

// Radio cards. options: [{ value, title, text, extra, disabled, why }]
export function radioCards(name, legend, options, selectedValue) {
  return `
    <fieldset class="choices">
      <legend>${esc(legend)}</legend>
      ${options.map((o) => `
        <label class="choice">
          <input type="radio" name="${esc(name)}" value="${esc(o.value)}"
            ${selectedValue === o.value ? "checked" : ""} ${o.disabled ? "disabled" : ""}>
          <span class="choice__title">${esc(o.title)}</span>
          ${o.text ? `<span class="choice__text">${esc(o.text)}</span>` : ""}
          ${o.extra ? `<span class="choice__text choice__extra">${o.extra}</span>` : ""}
          ${o.why ? `<span class="choice__why">${esc(o.why)}</span>` : ""}
        </label>`).join("")}
    </fieldset>`;
}

// ◆◆◇◇◇ picker built from real radio inputs (keyboard and screen-reader friendly)
export function dotPicker({ name, label, value, max = 5, min = 0, sub = "" }) {
  return `
    <fieldset class="dot-picker">
      <legend>${esc(label)}${sub ? ` <small>${esc(sub)}</small>` : ""}</legend>
      <span class="dot-picker__dots">
        ${min === 0 ? `<label class="dot-picker__clear" title="None"><input type="radio" name="${esc(name)}" value="0" ${value === 0 ? "checked" : ""}><span class="visually-hidden">0</span>×</label>` : ""}
        ${Array.from({ length: max }, (_, i) => i + 1).map((n) => `
          <label class="dot-picker__dot ${n <= value ? "on" : ""}" title="${n}">
            <input type="radio" name="${esc(name)}" value="${n}" ${value === n ? "checked" : ""} ${n < min ? "disabled" : ""}>
            <span class="visually-hidden">${n}</span>
          </label>`).join("")}
      </span>
    </fieldset>`;
}

export function textField({ id, label, value = "", max = 100, help = "", required = false, type = "text", attrs = "" }) {
  return `
    <div class="field">
      <label for="${id}">${esc(label)}${required ? "" : ' <span class="muted">(optional)</span>'}</label>
      ${type === "textarea"
        ? `<textarea id="${id}" data-field="${id}" maxlength="${max}" ${attrs}>${esc(value)}</textarea>`
        : `<input type="${type}" id="${id}" data-field="${id}" value="${esc(value)}" ${type === "text" ? `maxlength="${max}"` : ""} ${required ? "required" : ""} ${attrs}>`}
      ${help ? `<small>${esc(help)}</small>` : ""}
    </div>`;
}

export function selectField({ id, label, options, value = "", help = "", placeholder = "Choose…" }) {
  return `
    <div class="field">
      <label for="${id}">${esc(label)}</label>
      <select id="${id}" data-field="${id}">
        <option value="">${esc(placeholder)}</option>
        ${options.map((o) => {
          const [v, t] = Array.isArray(o) ? o : [o, o];
          return `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(t)}</option>`;
        }).join("")}
      </select>
      ${help ? `<small>${esc(help)}</small>` : ""}
    </div>`;
}

export function review(rows) {
  return `
    <section class="review">
      <h3>Review</h3>
      <dl>${rows.filter(([, v]) => v !== undefined).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v === "" || v == null ? "—" : v}</dd>`).join("")}</dl>
    </section>`;
}

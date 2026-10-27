// =====================================================================
// ui.js - small helpers shared by every page
// =====================================================================

import { getMe, logout } from "./api.js";

export const SYSTEMS = {
  witcher: { name: "The Witcher TRPG", short: "Witcher" },
  vtm: { name: "Vampire: The Masquerade", short: "Vampire" },
  cyberpunk: { name: "Cyberpunk 2020", short: "Cyberpunk" },
};

// The Witcher pages can wear the colours of a witcher school
export const WITCHER_SCHOOLS = {
  wolf: "School of the Wolf",
  cat: "School of the Cat",
  griffin: "School of the Griffin",
  bear: "School of the Bear",
  viper: "School of the Viper",
};
const SCHOOL_KEY = "witcherSchool";

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Anything typed by a user goes through this before it touches innerHTML.
// Without it, a character named <img src=x onerror=alert(1)> would run code
// in every party member's browser (stored XSS).
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

export function param(name) {
  return new URLSearchParams(location.search).get(name);
}

// Switches the whole page to one game's look (see css/themes.css)
export function applyTheme(system) {
  document.body.dataset.system = system;
  const slot = $("#theme-slot");
  if (system !== "witcher" || !slot) return;

  let school = "wolf";
  try { school = localStorage.getItem(SCHOOL_KEY) || "wolf"; } catch { /* storage blocked */ }
  if (!WITCHER_SCHOOLS[school]) school = "wolf";
  document.body.dataset.school = school;

  slot.innerHTML = `
    <label class="school-picker">
      <span class="visually-hidden">Colours</span>
      <select id="school">${Object.entries(WITCHER_SCHOOLS).map(([k, v]) =>
        `<option value="${k}" ${k === school ? "selected" : ""}>${v}</option>`).join("")}</select>
    </label>`;
  $("#school").addEventListener("change", (e) => {
    document.body.dataset.school = e.target.value;
    try { localStorage.setItem(SCHOOL_KEY, e.target.value); } catch { /* storage blocked */ }
  });
}

export function showMessage(box, text, kind = "error") {
  box.textContent = text;
  box.dataset.kind = kind;
  box.hidden = !text;
}

// Header with the logged-in user. Pages that need a login call
// requireLogin(); it sends anonymous visitors back to the home page.
export async function renderHeader() {
  const me = await getMe();
  const slot = $("#user-slot");
  if (slot) {
    slot.innerHTML = me
      ? `<span class="user-chip">${esc(me.username)}</span>
         <button type="button" class="btn btn--ghost btn--small" id="logout">Log out</button>`
      : "";
    $("#logout")?.addEventListener("click", async () => {
      await logout();
      location.href = "index.html";
    });
  }
  return me;
}

export async function requireLogin() {
  const me = await renderHeader();
  if (!me) location.href = "index.html";
  return me;
}

export function initials(name) {
  return String(name || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// Filled/empty dots (read-only), with the number next to them
export function dots(n, total = 5) {
  return `<span class="dots-wrap"><span class="dots" aria-hidden="true">${Array.from({ length: total }, (_, i) =>
    `<i class="${i < n ? "on" : ""}"></i>`).join("")}</span><span class="dots-num" aria-label="${n} of ${total}">${n}</span></span>`;
}

// ---------------------------------------------------------------------
// Explanations: a small "?" button next to a name. Hovering or focusing it
// shows the text; clicking pins it open until you click elsewhere or
// press Escape. One shared bubble serves the whole page.
// ---------------------------------------------------------------------
export function info(text, title = "") {
  if (!text) return "";
  return `<button type="button" class="info" data-tip="${esc(text)}" data-tip-title="${esc(title)}"
    aria-label="${esc(title ? `What is ${title}?` : "Explain")}" aria-expanded="false">?</button>`;
}

let tip = null;
let tipFor = null;   // button the bubble currently belongs to
let pinned = null;   // button that was clicked
let hideTimer = 0;

function tipBubble() {
  if (tip) return tip;
  tip = document.createElement("div");
  tip.id = "tip";
  tip.className = "tip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.append(tip);
  // the pointer may move onto the bubble without it closing (WCAG 1.4.13)
  tip.addEventListener("pointerenter", () => clearTimeout(hideTimer));
  tip.addEventListener("pointerleave", () => { if (!pinned) hideSoon(); });
  return tip;
}

function placeTip() {
  if (!tipFor || !tip || tip.hidden) return;
  if (!tipFor.isConnected) { hideTip(true); return; }
  const r = tipFor.getBoundingClientRect();
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
  const below = r.bottom + 8;
  const top = below + h > innerHeight - 8 && r.top - h - 8 > 8 ? r.top - h - 8 : below;
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function showTip(btn) {
  clearTimeout(hideTimer);
  const t = tipBubble();
  if (tipFor && tipFor !== btn) tipFor.removeAttribute("aria-describedby");
  tipFor = btn;
  const title = btn.dataset.tipTitle;
  t.innerHTML = `${title ? `<strong>${esc(title)}</strong>` : ""}<span>${esc(btn.dataset.tip)}</span>`;
  t.hidden = false;
  btn.setAttribute("aria-describedby", "tip");
  placeTip();
}

function hideTip(force = false) {
  if (pinned && !force) return;
  if (pinned) pinned.setAttribute("aria-expanded", "false");
  pinned = null;
  if (tipFor) tipFor.removeAttribute("aria-describedby");
  tipFor = null;
  if (tip) tip.hidden = true;
}

function hideSoon() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => hideTip(), 150);
}

document.addEventListener("pointerover", (e) => {
  const btn = e.target.closest?.(".info");
  if (btn && !pinned) showTip(btn);
});
document.addEventListener("pointerout", (e) => {
  const btn = e.target.closest?.(".info");
  if (btn && !pinned && !btn.contains(e.relatedTarget)) hideSoon();
});
document.addEventListener("focusin", (e) => {
  const btn = e.target.closest?.(".info");
  if (btn && !pinned) showTip(btn);
});
document.addEventListener("focusout", (e) => {
  if (e.target.closest?.(".info") && !pinned) hideSoon();
});
document.addEventListener("click", (e) => {
  const btn = e.target.closest?.(".info");
  if (btn) {
    // the "?" often sits inside a <label>: don't let the click pick that option
    e.preventDefault();
    e.stopPropagation();
    if (pinned === btn) { hideTip(true); return; }
    if (pinned) pinned.setAttribute("aria-expanded", "false");
    pinned = btn;
    btn.setAttribute("aria-expanded", "true");
    showTip(btn);
    return;
  }
  if (pinned && !tip?.contains(e.target)) hideTip(true);
}, true);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideTip(true); });
addEventListener("scroll", placeTip, { passive: true, capture: true });
addEventListener("resize", placeTip);

export const PROFESSION_LABELS = {
  bard: "Bard", craftsman: "Craftsman", criminal: "Criminal", doctor: "Doctor", mage: "Mage",
  man_at_arms: "Man at Arms", merchant: "Merchant", priest: "Priest", witcher: "Witcher",
};
export const RACE_LABELS = { human: "Human", elf: "Elf", dwarf: "Dwarf", witcher: "Witcher" };

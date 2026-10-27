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

// ◆◆◇◇◇ display (read-only)
export function dots(n, total = 5) {
  return `<span class="dots" role="img" aria-label="${n} of ${total}">${Array.from({ length: total }, (_, i) =>
    `<i class="${i < n ? "on" : ""}"></i>`).join("")}</span>`;
}

export const PROFESSION_LABELS = {
  bard: "Bard", craftsman: "Craftsman", criminal: "Criminal", doctor: "Doctor", mage: "Mage",
  man_at_arms: "Man at Arms", merchant: "Merchant", priest: "Priest", witcher: "Witcher",
};
export const RACE_LABELS = { human: "Human", elf: "Elf", dwarf: "Dwarf", witcher: "Witcher" };

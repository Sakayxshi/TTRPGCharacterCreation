// =====================================================================
// home.js - index.html: log in / sign up, create a game, join a game
// =====================================================================

import { login, signup, demoAccounts, createSession, joinSession, getMySessions } from "./api.js";
import { $, esc, renderHeader, showMessage, SYSTEMS } from "./ui.js";

const lobbyUrl = (code) => `lobby.html?code=${encodeURIComponent(code)}`;

async function start() {
  const me = await renderHeader();
  $("#auth").hidden = Boolean(me);
  $("#play").hidden = !me;
  if (me) await renderSessions();
}

// ---------------- auth ----------------
function setupAuth() {
  const tabs = { login: $("#tab-login"), signup: $("#tab-signup") };
  const forms = { login: $("#login-form"), signup: $("#signup-form") };
  for (const name of ["login", "signup"]) {
    tabs[name].addEventListener("click", () => {
      for (const other of ["login", "signup"]) {
        tabs[other].setAttribute("aria-selected", String(other === name));
        forms[other].hidden = other !== name;
      }
    });
  }

  $("#demo-list").innerHTML = demoAccounts()
    .map((a) => `<li><button type="button" data-user="${esc(a.username)}" data-pass="${esc(a.password)}">
        <span class="mono">${esc(a.username)}</span></button></li>`)
    .join("");
  $("#demo-list").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    $("#login-name").value = btn.dataset.user;
    $("#login-pass").value = btn.dataset.pass;
  });

  forms.login.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#login-msg");
    try {
      await login($("#login-name").value.trim(), $("#login-pass").value);
      start();
    } catch (err) {
      showMessage(msg, err.message);
    }
  });

  forms.signup.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#signup-msg");
    try {
      await signup($("#signup-name").value.trim(), $("#signup-pass").value);
      start();
    } catch (err) {
      showMessage(msg, err.message);
    }
  });
}

// ---------------- create / join ----------------
function setupPlay() {
  $("#create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const data = new FormData(form);
      const { join_code } = await createSession(data.get("session_name"), data.get("game_type"));
      location.href = lobbyUrl(join_code);
    } catch (err) {
      showMessage($("#create-msg"), err.message);
      button.disabled = false;
    }
  });

  const codeInput = $("#join-code");
  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    showMessage($("#join-msg"), "");
  });

  $("#join-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = e.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const { join_code } = await joinSession(codeInput.value);
      location.href = lobbyUrl(join_code);
    } catch (err) {
      showMessage($("#join-msg"), err.message);
      button.disabled = false;
    }
  });
}

async function renderSessions() {
  const sessions = await getMySessions();
  const list = $("#my-sessions");
  if (!sessions.length) {
    list.innerHTML = `<li class="empty">No games yet. Join one with a code, or start a new one.</li>`;
    return;
  }
  list.innerHTML = sessions
    .map((s) => `
      <li><a href="${lobbyUrl(s.join_code)}">
        <span><strong>${esc(s.session_name)}</strong><br>
          <span class="muted">${esc(SYSTEMS[s.game_type].name)} · GM ${esc(s.gm_name)}</span></span>
        <span class="row"><span class="badge system-badge" data-system-badge="${esc(s.game_type)}">${esc(SYSTEMS[s.game_type].short)}</span>
          <span class="badge ${s.my_role === "gm" ? "badge--accent" : ""}">${s.my_role === "gm" ? "GM" : "Player"}</span></span>
      </a></li>`)
    .join("");
}

setupAuth();
setupPlay();
start();

// Invite links look like index.html?join=KMR7Q2 - prefill the join form
const invite = new URLSearchParams(location.search).get("join");
if (invite) {
  $("#join-code").value = invite.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

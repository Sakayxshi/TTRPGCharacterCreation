// =====================================================================
// lobby.js - lobby.html?code=XXXXXX
// Shows one game: its code, the party and the characters. What appears
// here is exactly what the views my_sessions, party_members and
// party_characters return for the logged-in user.
// =====================================================================

import { getMySessionByCode, getPartyMembers, getPartyCharacters } from "./api.js";
import { $, esc, param, applyTheme, requireLogin, initials, SYSTEMS, PROFESSION_LABELS, RACE_LABELS } from "./ui.js";
import { CLANS } from "./vtmRules.js";
import { ROLES } from "./cyberpunkRules.js";

async function start() {
  const me = await requireLogin();
  if (!me) return;
  const code = (param("code") || "").toUpperCase();
  const session = await getMySessionByCode(code);
  const main = $("#lobby");

  if (!session) {
    main.innerHTML = `
      <section class="panel" style="max-width: 520px; margin: 0 auto;">
        <h1>No access</h1>
        <p class="muted">Either the code <span class="mono">${esc(code)}</span> doesn't exist, or you haven't joined this game.
        You only see games you run or play in.</p>
        <a class="btn btn--primary" href="index.html?join=${encodeURIComponent(code)}">Join with this code</a>
      </section>`;
    return;
  }

  applyTheme(session.game_type);
  document.title = session.session_name;

  const [members, characters] = await Promise.all([
    getPartyMembers(session.session_id),
    getPartyCharacters(session.session_id),
  ]);
  const isGm = session.my_role === "gm";
  const myRow = members.find((m) => m.username === me.username);
  const inviteLink = new URL(`index.html?join=${session.join_code}`, location.href).href;

  main.innerHTML = `
    <div class="lobby-head">
      <div>
        <p class="eyebrow">${esc(SYSTEMS[session.game_type].name)}</p>
        <h1>${esc(session.session_name)}</h1>
        <p class="muted">${isGm ? "You are the GM" : `GM: ${esc(session.gm_name)}`}</p>
      </div>
      <div class="code-box">
        <span class="muted">Code</span>
        <strong id="code">${esc(session.join_code)}</strong>
        <button type="button" class="btn btn--small" id="copy">Copy link</button>
      </div>
    </div>

    <div class="grid-2" style="grid-template-columns: minmax(0, 2fr) minmax(min(100%, 280px), 1fr);">
      <section class="panel">
        <h2 class="panel__title">Characters</h2>
        ${renderCharacters(characters, me, isGm)}
      </section>

      <div class="stack">
        ${isGm ? "" : renderMyAction(session, myRow)}
        <section class="panel">
          <h2 class="panel__title">Party</h2>
          <ul class="party">
            <li><span><strong>${esc(session.gm_name)}</strong></span><span class="badge badge--accent">GM</span></li>
            ${members.map((m) => `
              <li><span>${esc(m.username)}${m.character_name ? `<br><span class="muted">${esc(m.character_name)}</span>` : ""}</span>
                <span class="badge">${m.status === "ready" ? "Ready" : "No character"}</span></li>`).join("")}
          </ul>
          ${members.length ? "" : `<p class="empty">No players yet. Share the code.</p>`}
        </section>
        <section class="panel visibility-note">
          <h2 class="panel__title">Visibility</h2>
          ${isGm
            ? `<p>You see every character in full, including private backstories.</p>`
            : `<p>You see your own character in full. Of the others you see the basics, and their backstory only if they share it.</p>`}
          <p>The database enforces this, not the page.</p>
        </section>
      </div>
    </div>`;

  $("#copy").addEventListener("click", async (e) => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      e.target.textContent = "Copied";
    } catch {
      e.target.textContent = inviteLink;
    }
  });
}

function renderCharacters(characters, me, isGm) {
  if (!characters.length) return `<p class="empty">No characters yet.</p>`;
  return `<div class="cards">${characters.map((c) => {
    const mine = c.owner === me.username;
    // Cyberpunk: lead with the handle; the real name only if it's visible
    const title = c.handle || c.name;
    const subtitle = c.handle && c.name ? c.name : "";
    const detail = [
      c.race && RACE_LABELS[c.race], c.profession && PROFESSION_LABELS[c.profession],
      c.clan && CLANS[c.clan]?.name, c.sect, c.cyberpunk_role && ROLES[c.cyberpunk_role]?.name,
    ].filter(Boolean).join(" · ");
    return `
      <article class="char-card">
        <div class="portrait" aria-hidden="true">${esc(initials(title))}</div>
        <div>
          <h3>${esc(title)}</h3>
          ${subtitle ? `<div class="meta">${esc(subtitle)}</div>` : ""}
          <div class="meta">${esc(detail)}${c.age != null ? ` · ${esc(c.age)} yrs` : ""}</div>
          <div class="meta">${mine ? "Your character" : esc(c.owner)}</div>
          ${c.lore
            ? `<p class="lore">${esc(c.lore)}</p>`
            : `<p class="locked">Backstory private</p>`}
        </div>
        <div class="actions">
          <a class="btn btn--small ${mine || isGm ? "btn--primary" : ""}" href="sheet.html?char=${c.char_id}">
            ${mine || isGm ? "Open sheet" : "View"}</a>
        </div>
      </article>`;
  }).join("")}</div>`;
}

function renderMyAction(session, myRow) {
  if (myRow?.char_id) return "";
  return `
    <section class="panel">
      <h2 class="panel__title">Your character</h2>
      <p>You don't have a character in this game yet.</p>
      <a class="btn btn--primary" href="creator.html?session=${session.session_id}">Create character</a>
    </section>`;
}

start();

// =====================================================================
// creator.js - creator.html?session=ID
// Checks that the user may create a character in this game, then hands
// over to the creator for the game's system (js/creators/*.js).
// =====================================================================

import { getMySessions, getPartyMembers } from "./api.js";
import { $, esc, param, applyTheme, requireLogin, SYSTEMS } from "./ui.js";
import { startWitcherCreator } from "./creators/witcher.js";
import { startVtmCreator } from "./creators/vtm.js";
import { startCyberpunkCreator } from "./creators/cyberpunk.js";

const CREATORS = { witcher: startWitcherCreator, vtm: startVtmCreator, cyberpunk: startCyberpunkCreator };

async function start() {
  const me = await requireLogin();
  if (!me) return;
  const id = Number(param("session"));
  const session = (await getMySessions()).find((s) => s.session_id === id) || null;
  const main = $("#creator");

  if (!session) {
    main.innerHTML = `<section class="panel"><h1>No access</h1><p class="muted">You are not part of this game.</p>
      <a class="btn" href="index.html">Your games</a></section>`;
    return;
  }
  applyTheme(session.game_type);
  document.title = `New character · ${session.session_name}`;
  const head = `
    <a class="back-link" href="lobby.html?code=${esc(session.join_code)}">Back to ${esc(session.session_name)}</a>
    <h1>New character</h1>
    <p class="muted">${esc(SYSTEMS[session.game_type].name)}</p>`;

  if (session.my_role === "gm") {
    main.innerHTML = `${head}<section class="panel"><p>Game Masters don't have characters in their own game.</p>
      <p class="muted">The database refuses it: only players in a game can own a character there.</p></section>`;
    return;
  }
  const members = await getPartyMembers(session.session_id);
  if (members.find((m) => m.username === me.username)?.char_id) {
    main.innerHTML = `${head}<section class="panel"><p>You already have a character in this game.</p>
      <p class="muted">One character per player per game.</p></section>`;
    return;
  }

  main.innerHTML = `${head}<div id="wizard-root"></div>`;
  CREATORS[session.game_type]($("#wizard-root"), session);
}

start();

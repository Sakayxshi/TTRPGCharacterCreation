// =====================================================================
// api.js - the ONLY door between the pages and the data
//
// Every function here matches one database object:
//   reads   -> the views in sql/04_views.sql   (me, my_sessions,
//              party_characters, full_<system>_characters, ...)
//   writes  -> the procedures in sql/05_procedures.sql
//   auth    -> register_user() / an ED25519 login (sql/03_accounts.sql)
//
// Right now the functions run the same logic against mockData.js, and
// the mock state is kept in localStorage so it survives page changes.
// When the Python backend exists, each function body becomes one
// fetch() call - the pages stay exactly the same.
//
// All functions are async and throw an Error with the SAME messages
// the database procedures use, so error handling is already real.
// =====================================================================

import { seed, DEMO_PASSWORDS } from "./mockData.js";

const STATE_KEY = "ttrpgForge.mock.v3";
const SESSION_KEY = "ttrpgForge.currentUser";

// ---------------------------------------------------------------------
// Mock storage (wrapped in try/catch: storage can be blocked)
// ---------------------------------------------------------------------
let memoryState = null;
let memoryUser = null;

function load() {
  if (memoryState) return memoryState;
  try {
    const saved = localStorage.getItem(STATE_KEY);
    memoryState = saved ? JSON.parse(saved) : structuredClone(seed);
  } catch {
    memoryState = structuredClone(seed);
  }
  memoryState.passwords ??= { ...DEMO_PASSWORDS };
  return memoryState;
}

function save() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(memoryState)); } catch { /* memory only */ }
}

function currentUsername() {
  if (memoryUser) return memoryUser;
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}

function setCurrentUsername(name) {
  memoryUser = name;
  try {
    if (name) localStorage.setItem(SESSION_KEY, name);
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* memory only */ }
}

const pause = () => new Promise((r) => setTimeout(r, 120)); // feel of a network call
const fail = (message) => { throw new Error(message); };
const nextId = (rows, key) => rows.reduce((m, r) => Math.max(m, r[key]), 0) + 1;

// view: me  /  function: my_user_id()
function meRow(db) {
  const name = currentUsername();
  return db.users.find((u) => u.username === name) || null;
}
function myUserId(db) {
  return meRow(db)?.user_id ?? fail("Not a registered user");
}

// =====================================================================
// AUTH
// =====================================================================

// register_user(username, password) - called by the backend's registrar
export async function signup(username, password) {
  await pause();
  const db = load();
  if (!/^[a-z0-9_]{3,32}$/.test(username || "")) fail("Username: 3-32 characters, a-z, 0-9 and _ only");
  if (!password || password.length < 10) fail("Password must be at least 10 characters");
  if (db.users.some((u) => u.username === username)) fail(`Operation CREATE USER failed for '${username}'@'localhost'`);
  db.users.push({ user_id: nextId(db.users, "user_id"), username, created_at: new Date().toISOString() });
  db.passwords[username] = password; // MOCK ONLY - MariaDB stores an ED25519 verifier instead
  save();
  setCurrentUsername(username);
  return { username };
}

// Real version: the backend opens a MariaDB connection AS this user;
// MariaDB checks the password (ED25519), then the backend runs SET ROLE.
export async function login(username, password) {
  await pause();
  const db = load();
  if (db.passwords[username] !== password) fail(`Access denied for user '${username}'@'localhost'`);
  setCurrentUsername(username);
  return { username };
}

export async function logout() {
  setCurrentUsername(null);
}

export async function getMe() {
  await pause();
  const db = load();
  const me = meRow(db);
  return me ? { ...me } : null;
}

export function demoAccounts() {
  return Object.entries(DEMO_PASSWORDS).map(([username, password]) => ({ username, password }));
}

// Developer helper: throw away all mock changes
export function resetMockData() {
  memoryState = null;
  try { localStorage.removeItem(STATE_KEY); } catch { /* ignore */ }
}

// =====================================================================
// READS - views
// =====================================================================

// view: my_sessions
export async function getMySessions() {
  await pause();
  const db = load();
  const me = meRow(db);
  if (!me) return [];
  const gmName = (s) => db.users.find((u) => u.user_id === s.gm_id)?.username;
  const asGm = db.game_sessions
    .filter((s) => s.gm_id === me.user_id)
    .map((s) => ({ ...s, gm_name: gmName(s), my_role: "gm" }));
  const asPlayer = db.session_players
    .filter((sp) => sp.user_id === me.user_id)
    .map((sp) => db.game_sessions.find((s) => s.session_id === sp.session_id))
    .map((s) => ({ ...s, gm_name: gmName(s), my_role: "player" }));
  return [...asGm, ...asPlayer].map(({ gm_id, ...row }) => row);
}

export async function getMySessionByCode(code) {
  const sessions = await getMySessions();
  return sessions.find((s) => s.join_code === String(code || "").toUpperCase()) || null;
}

// view: party_members
export async function getPartyMembers(sessionId) {
  await pause();
  const db = load();
  const me = meRow(db);
  const session = (await getMySessions()).find((s) => s.session_id === sessionId);
  if (!session) return [];
  return db.session_players
    .filter((sp) => sp.session_id === sessionId)
    .map((sp) => {
      const c = db.characters.find((ch) => ch.owner_id === sp.user_id && ch.session_id === sessionId);
      const cp = c && db.cyberpunk_characters.find((x) => x.char_id === c.char_id);
      // Cyberpunk: the handle if it's public (or mine / I'm the GM), else the real name
      const seesAll = c && (c.owner_id === me.user_id || session.my_role === "gm");
      return {
        session_id: sessionId,
        username: db.users.find((u) => u.user_id === sp.user_id).username,
        joined_at: sp.joined_at,
        char_id: c?.char_id ?? null,
        character_name: !c ? null : !cp ? c.name : (cp.show_handle || seesAll) ? cp.handle : c.name,
        status: c ? "ready" : "no_character",
      };
    });
}

// view: party_characters  (PUBLIC layer)
export async function getPartyCharacters(sessionId) {
  await pause();
  const db = load();
  const me = meRow(db);
  const mySessions = await getMySessions();
  const session = mySessions.find((s) => s.session_id === sessionId);
  if (!session) return [];
  return db.characters
    .filter((c) => c.session_id === sessionId)
    .map((c) => {
      const w = db.witcher_characters.find((x) => x.char_id === c.char_id);
      const v = db.vtm_characters.find((x) => x.char_id === c.char_id);
      const cp = db.cyberpunk_characters.find((x) => x.char_id === c.char_id);
      const seesAll = c.owner_id === me.user_id || session.my_role === "gm";
      const showLore = c.lore_visible || seesAll;
      return {
        char_id: c.char_id, session_id: c.session_id, game_type: session.game_type,
        owner: db.users.find((u) => u.user_id === c.owner_id).username,
        name: !cp || cp.show_name || seesAll ? c.name : null,
        age: c.age, gender: c.gender,
        race: w?.race ?? null, profession: w?.profession ?? null,
        clan: v?.clan ?? null, sect: v?.sect ?? null,
        cyberpunk_role: cp?.role ?? null,
        handle: cp && (cp.show_handle || seesAll) ? cp.handle : null,
        lore: showLore ? c.lore : null,
      };
    });
}

// view: full_characters  (PRIVATE layer, shared fields) - the access rule
function fullBase(db, charId) {
  const me = meRow(db);
  if (!me) return null;
  const c = db.characters.find((x) => x.char_id === charId);
  if (!c) return null;
  const s = db.game_sessions.find((x) => x.session_id === c.session_id);
  if (c.owner_id !== me.user_id && s.gm_id !== me.user_id) return null;
  return {
    char_id: c.char_id, session_id: c.session_id, game_type: s.game_type,
    owner: db.users.find((u) => u.user_id === c.owner_id).username,
    name: c.name, age: c.age, gender: c.gender, lore: c.lore, lore_visible: c.lore_visible,
  };
}

// views: full_witcher_characters / full_vtm_characters / full_cyberpunk_characters
// Returns null when the database would return no row (not owner, not GM).
export async function getFullCharacter(charId) {
  await pause();
  const db = load();
  const base = fullBase(db, charId);
  if (!base) return null;
  if (base.game_type === "witcher") {
    const w = db.witcher_characters.find((x) => x.char_id === charId);
    return { ...base, ...w, run_speed: w.stat_spd * 3, encumbrance: w.stat_body * 10 };
  }
  if (base.game_type === "vtm") {
    const v = db.vtm_characters.find((x) => x.char_id === charId);
    return { ...base, ...v, health: v.attr_stamina + 3, willpower: v.attr_composure + v.attr_resolve };
  }
  const cp = db.cyberpunk_characters.find((x) => x.char_id === charId);
  return {
    ...base, ...cp, run_m: cp.stat_ma * 3, leap_m: Math.floor((cp.stat_ma * 3) / 4),
    save_target: cp.stat_body, humanity: cp.stat_emp * 10,
  };
}

// view: party_characters, one row - the fallback when the full sheet is hidden
export async function getPublicCharacter(charId) {
  const db = load();
  const c = db.characters.find((x) => x.char_id === charId);
  if (!c) return null;
  const rows = await getPartyCharacters(c.session_id);
  return rows.find((r) => r.char_id === charId) || null;
}

function allowedRows(table, charId) {
  const db = load();
  if (!fullBase(db, charId)) return [];
  return db[table].filter((r) => r.char_id === charId).map((r) => ({ ...r }));
}

// views: full_witcher_skills, full_vtm_skills, full_vtm_disciplines, full_cyberpunk_skills
export async function getWitcherSkills(charId) { await pause(); return allowedRows("witcher_character_skills", charId); }
export async function getVtmSkills(charId) { await pause(); return allowedRows("vtm_character_skills", charId); }
export async function getVtmDisciplines(charId) { await pause(); return allowedRows("vtm_character_disciplines", charId); }
export async function getCyberpunkSkills(charId) { await pause(); return allowedRows("cyberpunk_character_skills", charId); }

// =====================================================================
// WRITES - procedures
// =====================================================================

// CALL create_session(name, game_type)
export async function createSession(name, gameType) {
  await pause();
  const db = load();
  const me = myUserId(db);
  if (db.game_sessions.filter((s) => s.gm_id === me).length >= 3) fail("You already host 3 sessions");
  if (!["witcher", "vtm", "cyberpunk"].includes(gameType)) fail("Unknown game type");
  if (!name || !name.trim()) fail("Give the session a name");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    code = [...bytes].map((b) => alphabet[b % 32]).join("");
  } while (db.game_sessions.some((s) => s.join_code === code));
  const session_id = nextId(db.game_sessions, "session_id");
  db.game_sessions.push({ session_id, join_code: code, game_type: gameType, session_name: name.trim(), gm_id: me });
  save();
  return { session_id, join_code: code };
}

// CALL join_session(code)
export async function joinSession(code) {
  await pause();
  const db = load();
  const me = myUserId(db);
  const s = db.game_sessions.find((x) => x.join_code === String(code || "").trim().toUpperCase());
  if (!s) fail("No session with that code");
  if (s.gm_id === me) fail("You are the GM of this session");
  if (db.session_players.some((sp) => sp.user_id === me && sp.session_id === s.session_id)) {
    fail("You already joined this session");
  }
  if (db.session_players.filter((sp) => sp.user_id === me).length >= 3) fail("You already play in 3 sessions");
  db.session_players.push({ user_id: me, session_id: s.session_id, joined_at: new Date().toISOString() });
  save();
  return { session_id: s.session_id, join_code: s.join_code };
}

// Shared part of every create_<system>_character procedure: the session
// must be of the right type, the caller must be a player there, and
// may not have a character there yet.
function insertCharacter(db, me, c, gameType, label) {
  const s = db.game_sessions.find((x) => x.session_id === c.session_id && x.game_type === gameType);
  if (!s) fail(`Not a ${label} session`);
  if (!db.session_players.some((sp) => sp.user_id === me && sp.session_id === c.session_id)) {
    fail("Cannot add or update a child row: a foreign key constraint fails (fk_char_player)");
  }
  if (db.characters.some((x) => x.owner_id === me && x.session_id === c.session_id)) {
    fail("Duplicate entry for key 'uq_one_char_per_session'");
  }
  if (!["male", "female"].includes(c.gender)) fail("Gender must be male or female");
  const char_id = nextId(db.characters, "char_id");
  db.characters.push({
    char_id, owner_id: me, session_id: c.session_id, name: c.name, age: c.age ?? null,
    gender: c.gender || null, lore: c.lore || null, lore_visible: false,
  });
  return char_id;
}

function requireOwner(db, charId) {
  const me = myUserId(db);
  if (!db.characters.some((c) => c.char_id === charId && c.owner_id === me)) fail("Not your character");
}

function upsert(rows, match, values) {
  const row = rows.find((r) => Object.entries(match).every(([k, v]) => r[k] === v));
  if (row) Object.assign(row, values);
  else rows.push({ ...match, ...values });
}

// ---------------- Witcher ----------------

// CALL create_witcher_character(...)
export async function createWitcherCharacter(c) {
  await pause();
  const db = load();
  const me = myUserId(db);
  if ((c.race === "witcher") !== (c.profession === "witcher")) {
    fail("Only the witcher race can take the witcher profession, and vice versa");
  }
  if (["mage", "priest"].includes(c.profession) && !["human", "elf"].includes(c.race)) {
    fail("Only humans and elves can be mages or priests");
  }
  const stats = ["int", "ref", "dex", "body", "spd", "emp", "cra", "will", "luck"];
  if (stats.some((k) => !(c.stats[k] >= 1 && c.stats[k] <= 13))) fail("CONSTRAINT `chk_stats_range` failed");
  const char_id = insertCharacter(db, me, c, "witcher", "Witcher");
  const w = {
    char_id, race: c.race, profession: c.profession, homeland: c.homeland || null,
    social_standing: c.social_standing || null, reputation: 0, lifepath: c.lifepath || null, coin: c.coin ?? 0,
  };
  stats.forEach((k) => { w[`stat_${k}`] = c.stats[k]; });
  db.witcher_characters.push(w);
  save();
  return { char_id };
}

// CALL set_witcher_skill(char_id, skill, level)
export async function setWitcherSkill(charId, skill, level) {
  const db = load();
  requireOwner(db, charId);
  upsert(db.witcher_character_skills, { char_id: charId, skill_name: skill }, { level });
  save();
}

// ---------------- Vampire: The Masquerade ----------------

export const VTM_ATTRIBUTES = ["strength", "dexterity", "stamina", "charisma", "manipulation",
  "composure", "intelligence", "wits", "resolve"];

// CALL create_vtm_character(...)
export async function createVtmCharacter(c) {
  await pause();
  const db = load();
  const me = myUserId(db);
  const spread = VTM_ATTRIBUTES.map((a) => c.attributes[a]).sort((a, b) => b - a).join(",");
  if (spread !== "4,3,3,3,2,2,2,2,1") fail("Attributes must be one at 4, three at 3, four at 2 and one at 1");
  const thin = c.clan === "thin_blood";
  if (thin !== (c.generation >= 14 && c.generation <= 16) || (!thin && (c.generation < 10 || c.generation > 13))) {
    fail("Thin-bloods are 14th-16th generation; other clans 10th-13th");
  }
  const potency = (c.generation >= 14 ? 0 : c.generation >= 12 ? 1 : 2) + (c.predator_type === "blood_leech" ? 1 : 0);
  const char_id = insertCharacter(db, me, c, "vtm", "Vampire");
  const v = {
    char_id, clan: c.clan, concept: c.concept || null, ambition: c.ambition || null, desire: c.desire || null,
    sect: c.sect || null, sire: c.sire || null, generation: c.generation, blood_potency: potency,
    predator_type: c.predator_type, humanity: c.humanity,
    convictions: c.convictions || null, touchstones: c.touchstones || null,
    advantages: c.advantages || null, flaws: c.flaws || null,
  };
  VTM_ATTRIBUTES.forEach((a) => { v[`attr_${a}`] = c.attributes[a]; });
  db.vtm_characters.push(v);
  save();
  return { char_id };
}

// CALL set_vtm_skill(char_id, skill, level, specialty)
export async function setVtmSkill(charId, skill, level, specialty = null) {
  const db = load();
  requireOwner(db, charId);
  upsert(db.vtm_character_skills, { char_id: charId, skill_name: skill }, { level, specialty: specialty || null });
  save();
}

// CALL set_vtm_discipline(char_id, discipline, level)
export async function setVtmDiscipline(charId, discipline, level) {
  const db = load();
  requireOwner(db, charId);
  upsert(db.vtm_character_disciplines, { char_id: charId, discipline }, { level });
  save();
}

// ---------------- Cyberpunk 2020 ----------------

export const CP_STATS = ["int", "ref", "tech", "cool", "attr", "luck", "ma", "body", "emp"];

// CALL create_cyberpunk_character(...)
export async function createCyberpunkCharacter(c) {
  await pause();
  const db = load();
  const me = myUserId(db);
  if (c.age != null && c.age < 16) fail("Cyberpunk characters are at least 16");
  if (CP_STATS.some((k) => !(c.stats[k] >= 2 && c.stats[k] <= 10))) fail("CONSTRAINT `chk_cp_stats` failed");
  if (!c.show_name && !c.show_handle) fail("Show at least the name or the handle");
  if (!c.handle || !c.handle.trim()) fail("Column 'handle' cannot be null");
  const char_id = insertCharacter(db, me, c, "cyberpunk", "Cyberpunk");
  const row = {
    char_id, handle: c.handle.trim(), show_name: Boolean(c.show_name), show_handle: Boolean(c.show_handle),
    role: c.role, reputation: 0, ethnicity: c.ethnicity || null, style: c.style || null,
    motivations: c.motivations || null, lifepath: c.lifepath || null, cash: c.cash ?? 0,
  };
  CP_STATS.forEach((k) => { row[`stat_${k}`] = c.stats[k]; });
  db.cyberpunk_characters.push(row);
  save();
  return { char_id };
}

// CALL set_cyberpunk_skill(char_id, skill, level)
export async function setCyberpunkSkill(charId, skill, level) {
  const db = load();
  requireOwner(db, charId);
  upsert(db.cyberpunk_character_skills, { char_id: charId, skill_name: skill }, { level });
  save();
}

// CALL set_cyberpunk_visibility(char_id, show_name, show_handle)
export async function setCyberpunkVisibility(charId, showName, showHandle) {
  await pause();
  const db = load();
  requireOwner(db, charId);
  if (!showName && !showHandle) fail("Show at least the name or the handle");
  const cp = db.cyberpunk_characters.find((x) => x.char_id === charId);
  cp.show_name = Boolean(showName);
  cp.show_handle = Boolean(showHandle);
  save();
}

// ---------------- all systems ----------------

// CALL set_lore_visible(char_id, visible)
export async function setLoreVisible(charId, visible) {
  await pause();
  const db = load();
  const me = myUserId(db);
  const c = db.characters.find((x) => x.char_id === charId && x.owner_id === me);
  if (!c) fail("Not your character");
  c.lore_visible = Boolean(visible);
  save();
}

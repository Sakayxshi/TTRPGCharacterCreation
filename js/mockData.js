// =====================================================================
// mockData.js - a stand-in for the MariaDB database
//
// Each array mirrors one table from sql/01_schema.sql and holds the same
// rows as sql/02_seed.sql. Only api.js may import this file: pages talk
// to api.js, so replacing the mock with real fetch() calls later means
// changing api.js only.
//
// DEMO_PASSWORDS exists only because the mock has to "log in" somehow.
// In the real system no password is stored anywhere in our tables:
// MariaDB keeps an ED25519 verifier and checks logins itself.
// =====================================================================

export const DEMO_PASSWORDS = {
  gm_vesemir: "demo-vesemir-2026",
  player_ciri: "demo-ciri-2026",
  player_lambert: "demo-lambert-2026",
  outsider_zoltan: "demo-zoltan-2026",
};

export const seed = {
  users: [
    { user_id: 1, username: "gm_vesemir", created_at: "2026-10-27T15:00:00Z" },
    { user_id: 2, username: "player_ciri", created_at: "2026-10-27T15:00:00Z" },
    { user_id: 3, username: "player_lambert", created_at: "2026-10-27T15:00:00Z" },
    { user_id: 4, username: "outsider_zoltan", created_at: "2026-10-27T15:00:00Z" },
  ],

  game_sessions: [
    { session_id: 1, join_code: "KMR7Q2", game_type: "witcher", session_name: "Winter at Kaer Morhen", gm_id: 1 },
    { session_id: 2, join_code: "NC2020", game_type: "cyberpunk", session_name: "Night City Run", gm_id: 3 },
    { session_id: 3, join_code: "CHGNYT", game_type: "vtm", session_name: "Chicago by Night", gm_id: 1 },
  ],

  session_players: [
    { user_id: 2, session_id: 1, joined_at: "2026-10-27T15:05:00Z" },
    { user_id: 3, session_id: 1, joined_at: "2026-10-27T15:06:00Z" },
    { user_id: 2, session_id: 2, joined_at: "2026-10-27T15:07:00Z" },
    { user_id: 2, session_id: 3, joined_at: "2026-10-27T15:08:00Z" },
  ],

  characters: [
    {
      char_id: 1, owner_id: 2, session_id: 1, name: "Zireael", age: 21, gender: "female",
      lore: "Trained in a witcher keep, though no mutations. Hunted across the Continent.",
      lore_visible: false,
    },
    {
      char_id: 2, owner_id: 3, session_id: 1, name: "Lambert", age: 64, gender: "male",
      lore: "Sharp-tongued witcher of the Wolf School. Says what everyone else is thinking.",
      lore_visible: true,
    },
    {
      char_id: 3, owner_id: 2, session_id: 3, name: "Mara Voss", age: 34, gender: "female",
      lore: "Night-shift phlebotomist at Cook County. Embraced in the blood bank fridge room.",
      lore_visible: false,
    },
  ],

  witcher_characters: [
    {
      char_id: 1, race: "human", profession: "man_at_arms", homeland: "Cintra",
      social_standing: "Equal", reputation: 0, lifepath: "Noble family, lost in war.",
      stat_int: 6, stat_ref: 8, stat_dex: 8, stat_body: 6, stat_spd: 7,
      stat_emp: 5, stat_cra: 4, stat_will: 7, stat_luck: 6, coin: 250,
    },
    {
      char_id: 2, race: "witcher", profession: "witcher", homeland: "Kaedwen",
      social_standing: "Hated & Feared", reputation: 1, lifepath: "Taken to Kaer Morhen as a child.",
      stat_int: 6, stat_ref: 9, stat_dex: 8, stat_body: 8, stat_spd: 7,
      stat_emp: 3, stat_cra: 5, stat_will: 6, stat_luck: 5, coin: 180,
    },
  ],

  witcher_character_skills: [
    { char_id: 1, skill_name: "Swordsmanship", level: 6 },
    { char_id: 1, skill_name: "Dodge/Escape", level: 5 },
    { char_id: 1, skill_name: "Athletics", level: 4 },
    { char_id: 1, skill_name: "Riding", level: 3 },
    { char_id: 2, skill_name: "Swordsmanship", level: 6 },
    { char_id: 2, skill_name: "Alchemy", level: 4 },
    { char_id: 2, skill_name: "Monster Lore", level: 5 },
    { char_id: 2, skill_name: "Intimidation", level: 4 },
  ],

  vtm_characters: [
    {
      char_id: 3, clan: "tremere", concept: "Night-shift phlebotomist",
      ambition: "Find out who ordered my Embrace", desire: "Sleep through one quiet day",
      sect: "Camarilla", sire: "Dr. Edmund Hale", generation: 12, blood_potency: 1,
      predator_type: "consensualist", humanity: 8,
      attr_strength: 1, attr_dexterity: 2, attr_stamina: 2, attr_charisma: 2, attr_manipulation: 2,
      attr_composure: 3, attr_intelligence: 4, attr_wits: 3, attr_resolve: 3,
      convictions: "Never take blood from someone who did not agree.",
      touchstones: "Ruth Okafor, the night nurse who covers for her.",
      advantages: "Herd 2, Resources 1, Haven 2, Linguistics 1, Allies 1",
      flaws: "Dark Secret: Masquerade breacher 1, Prey Exclusion: non-consenting 1, Obvious Predator 2",
    },
  ],

  vtm_character_skills: [
    { char_id: 3, skill_name: "Medicine", level: 3, specialty: "Phlebotomy" },
    { char_id: 3, skill_name: "Occult", level: 3, specialty: null },
    { char_id: 3, skill_name: "Investigation", level: 3, specialty: null },
    { char_id: 3, skill_name: "Awareness", level: 2, specialty: null },
    { char_id: 3, skill_name: "Persuasion", level: 2, specialty: null },
    { char_id: 3, skill_name: "Science", level: 2, specialty: "Hematology" },
    { char_id: 3, skill_name: "Insight", level: 2, specialty: null },
    { char_id: 3, skill_name: "Stealth", level: 2, specialty: null },
    { char_id: 3, skill_name: "Academics", level: 1, specialty: "Medical history" },
    { char_id: 3, skill_name: "Etiquette", level: 1, specialty: null },
    { char_id: 3, skill_name: "Larceny", level: 1, specialty: null },
    { char_id: 3, skill_name: "Drive", level: 1, specialty: null },
    { char_id: 3, skill_name: "Subterfuge", level: 1, specialty: null },
    { char_id: 3, skill_name: "Technology", level: 1, specialty: null },
    { char_id: 3, skill_name: "Athletics", level: 1, specialty: null },
  ],

  vtm_character_disciplines: [
    { char_id: 3, discipline: "Blood Sorcery", level: 2 },
    { char_id: 3, discipline: "Auspex", level: 2 },
  ],

  cyberpunk_characters: [],
  cyberpunk_character_skills: [],
};

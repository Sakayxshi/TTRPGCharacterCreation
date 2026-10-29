USE ttrpg_forge;

CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW me AS
SELECT user_id, username, created_at
FROM users
WHERE username = SUBSTRING_INDEX(USER(), '@', 1);

CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW my_sessions AS
SELECT s.session_id, s.join_code, s.game_type, s.session_name,
       gm.username AS gm_name, 'gm' AS my_role
FROM game_sessions s
JOIN users gm ON gm.user_id = s.gm_id
JOIN me       ON me.user_id = s.gm_id
UNION ALL
SELECT s.session_id, s.join_code, s.game_type, s.session_name,
       gm.username AS gm_name, 'player' AS my_role
FROM game_sessions s
JOIN users gm           ON gm.user_id = s.gm_id
JOIN session_players sp ON sp.session_id = s.session_id
JOIN me                 ON me.user_id = sp.user_id;

CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW party_members AS
SELECT ms.session_id, u.username, sp.joined_at,
       c.char_id,

       CASE WHEN cp.char_id IS NULL THEN c.name
            WHEN cp.show_handle OR c.owner_id = me.user_id OR ms.my_role = 'gm'
            THEN cp.handle
            ELSE c.name END AS character_name,
       CASE WHEN c.char_id IS NULL THEN 'no_character' ELSE 'ready' END AS status
FROM my_sessions ms
JOIN session_players sp ON sp.session_id = ms.session_id
JOIN users u            ON u.user_id = sp.user_id
LEFT JOIN characters c  ON c.owner_id = sp.user_id
                       AND c.session_id = sp.session_id
LEFT JOIN cyberpunk_characters cp ON cp.char_id = c.char_id
CROSS JOIN me;

CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW party_characters AS
SELECT c.char_id, c.session_id, ms.game_type, u.username AS owner,
       CASE WHEN cp.char_id IS NULL OR cp.show_name
              OR c.owner_id = me.user_id OR ms.my_role = 'gm'
            THEN c.name END AS name,
       c.age, c.gender,
       w.race, w.profession,
       v.clan, v.sect,
       cp.role AS cyberpunk_role,
       CASE WHEN cp.show_handle
              OR c.owner_id = me.user_id OR ms.my_role = 'gm'
            THEN cp.handle END AS handle,
       CASE WHEN c.lore_visible
              OR c.owner_id = me.user_id
              OR ms.my_role = 'gm'
            THEN c.lore END AS lore
FROM characters c
JOIN my_sessions ms ON ms.session_id = c.session_id
JOIN users u        ON u.user_id = c.owner_id
LEFT JOIN witcher_characters   w  ON w.char_id  = c.char_id
LEFT JOIN vtm_characters       v  ON v.char_id  = c.char_id
LEFT JOIN cyberpunk_characters cp ON cp.char_id = c.char_id
CROSS JOIN me;

CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW full_characters AS
SELECT c.char_id, c.session_id, s.game_type, u.username AS owner,
       c.name, c.age, c.gender, c.lore, c.lore_visible
FROM characters c
JOIN game_sessions s ON s.session_id = c.session_id
JOIN users u         ON u.user_id = c.owner_id
JOIN me
WHERE c.owner_id = me.user_id
   OR s.gm_id = me.user_id;

CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW full_witcher_characters AS
SELECT f.*,
       w.race, w.profession, w.homeland, w.social_standing, w.reputation, w.lifepath,
       w.stat_int, w.stat_ref, w.stat_dex, w.stat_body, w.stat_spd,
       w.stat_emp, w.stat_cra, w.stat_will, w.stat_luck,
       w.coin, w.run_speed, w.encumbrance
FROM full_characters f
JOIN witcher_characters w ON w.char_id = f.char_id;

CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW full_witcher_skills AS
SELECT cs.char_id, cs.skill_name, ws.base_stat, ws.cost, cs.level
FROM witcher_character_skills cs
JOIN witcher_skills ws  ON ws.skill_name = cs.skill_name
JOIN full_characters f  ON f.char_id = cs.char_id;

CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW full_vtm_characters AS
SELECT f.*,
       v.clan, v.concept, v.ambition, v.desire, v.sect, v.sire,
       v.generation, v.blood_potency, v.predator_type, v.humanity,
       v.attr_strength, v.attr_dexterity, v.attr_stamina,
       v.attr_charisma, v.attr_manipulation, v.attr_composure,
       v.attr_intelligence, v.attr_wits, v.attr_resolve,
       v.convictions, v.touchstones, v.advantages, v.flaws,
       v.health, v.willpower
FROM full_characters f
JOIN vtm_characters v ON v.char_id = f.char_id;

CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW full_vtm_skills AS
SELECT vs.char_id, vs.skill_name, k.category, vs.level, vs.specialty
FROM vtm_character_skills vs
JOIN vtm_skills k      ON k.skill_name = vs.skill_name
JOIN full_characters f ON f.char_id = vs.char_id;

CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW full_vtm_disciplines AS
SELECT vd.char_id, vd.discipline, vd.level
FROM vtm_character_disciplines vd
JOIN full_characters f ON f.char_id = vd.char_id;

CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW full_cyberpunk_characters AS
SELECT f.*,
       cp.handle, cp.show_name, cp.show_handle,
       cp.role, cp.stat_int, cp.stat_ref, cp.stat_tech, cp.stat_cool, cp.stat_attr,
       cp.stat_luck, cp.stat_ma, cp.stat_body, cp.stat_emp,
       cp.reputation, cp.ethnicity, cp.style, cp.motivations, cp.lifepath, cp.cash,
       cp.run_m, cp.leap_m, cp.save_target, cp.humanity
FROM full_characters f
JOIN cyberpunk_characters cp ON cp.char_id = f.char_id;

CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW full_cyberpunk_skills AS
SELECT cs.char_id, cs.skill_name, k.stat, cs.level
FROM cyberpunk_character_skills cs
JOIN cyberpunk_skills k ON k.skill_name = cs.skill_name
JOIN full_characters f  ON f.char_id = cs.char_id;

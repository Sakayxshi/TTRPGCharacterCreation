USE ttrpg_forge;


/* Host: Account */
CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW me AS
SELECT user_id, username, created_at
FROM users
WHERE username = SUBSTRING_INDEX(USER(), '@', 1);


/* Host: Sessions  */
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


/* Player Accounts */
CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW party_members AS
SELECT ms.session_id, u.username, sp.joined_at,
       c.char_id, c.name AS character_name,
       CASE WHEN c.char_id IS NULL THEN 'no_character' ELSE 'ready' END AS status
FROM my_sessions ms
JOIN session_players sp ON sp.session_id = ms.session_id
JOIN users u            ON u.user_id = sp.user_id
LEFT JOIN characters c  ON c.owner_id = sp.user_id
                       AND c.session_id = sp.session_id;


-- ---------------------------------------------------------------------
-- party_characters: PUBLIC layer - every character in my sessions
-- lore only if: the owner shared it, OR it is mine, OR I am the GM
-- ---------------------------------------------------------------------
CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW party_characters AS
SELECT c.char_id, c.session_id, u.username AS owner,
       c.name, c.age, c.gender,
       w.race, w.profession,
       CASE WHEN c.lore_visible
              OR c.owner_id = me.user_id
              OR ms.my_role = 'gm'
            THEN c.lore END AS lore
FROM characters c
JOIN my_sessions ms ON ms.session_id = c.session_id
JOIN users u        ON u.user_id = c.owner_id
LEFT JOIN witcher_characters w ON w.char_id = c.char_id
CROSS JOIN me;


-- ---------------------------------------------------------------------
-- full_characters: PRIVATE layer - all fields, only my own characters
-- and characters in sessions I am GM of
-- ---------------------------------------------------------------------
CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW full_characters AS
SELECT c.char_id, c.session_id, u.username AS owner,
       c.name, c.age, c.gender, c.lore, c.lore_visible,
       w.race, w.profession, w.homeland, w.social_standing, w.reputation, w.lifepath,
       w.stat_int, w.stat_ref, w.stat_dex, w.stat_body, w.stat_spd,
       w.stat_emp, w.stat_cra, w.stat_will, w.stat_luck,
       w.coin, w.run_speed, w.encumbrance
FROM characters c
JOIN users u ON u.user_id = c.owner_id
LEFT JOIN witcher_characters w ON w.char_id = c.char_id
JOIN me
WHERE c.owner_id = me.user_id
   OR c.session_id IN (SELECT session_id FROM game_sessions WHERE gm_id = me.user_id);


-- ---------------------------------------------------------------------
-- full_character_skills: skills of the characters full_characters shows
-- ---------------------------------------------------------------------
CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost' SQL SECURITY DEFINER
VIEW full_character_skills AS
SELECT cs.char_id, cs.skill_name, ws.base_stat, ws.cost, cs.level
FROM character_skills cs
JOIN witcher_skills ws ON ws.skill_name = cs.skill_name
WHERE cs.char_id IN (SELECT char_id FROM full_characters);
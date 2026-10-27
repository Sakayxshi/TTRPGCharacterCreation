-- =====================================================================
-- TTRPG Forge - procedures: the only way users can WRITE data
-- Run AFTER 04_views.sql:   mariadb -u root -p < sql/05_procedures.sql
--
-- Users have no INSERT/UPDATE/DELETE on any table. Every change goes
-- through one of these procedures. They run as forge_owner
-- (SQL SECURITY DEFINER) and check WHO is calling via my_user_id(),
-- which reads USER() - the account that actually logged in.
--
-- forge_user already has EXECUTE on the whole schema (03), so every
-- procedure below is callable without any new GRANT.
--
-- Procedures:
--   create_session(name, game_type)        -> returns join_code
--   join_session(join_code)
--   create_witcher_character(...)          -> returns char_id
--   set_witcher_skill(char_id, skill, level)
--   create_vtm_character(...)              -> returns char_id
--   set_vtm_skill(char_id, skill, level, specialty)
--   set_vtm_discipline(char_id, discipline, level)
--   create_cyberpunk_character(...)        -> returns char_id
--   set_cyberpunk_skill(char_id, skill, level)
--   set_lore_visible(char_id, visible)
--   set_cyberpunk_visibility(char_id, show_name, show_handle)
-- =====================================================================

USE ttrpg_forge;

-- The definer must be allowed to execute its own routines (see 03).
GRANT EXECUTE ON ttrpg_forge.* TO 'forge_owner'@'localhost';

DELIMITER //

-- ---------------------------------------------------------------------
-- my_user_id(): user_id of the logged-in account, or an error
-- ---------------------------------------------------------------------
CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost'
    FUNCTION my_user_id() RETURNS INT
    READS SQL DATA
    SQL SECURITY DEFINER
BEGIN
    DECLARE v_id INT;
    SELECT user_id INTO v_id
    FROM users
    WHERE username = SUBSTRING_INDEX(USER(), '@', 1);
    IF v_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not a registered TTRPG Forge user';
    END IF;
    RETURN v_id;
END //


-- ---------------------------------------------------------------------
-- create_session: the caller becomes GM. Max 3 hosted sessions.
-- The join code is 6 characters from a 32-character alphabet without
-- look-alikes (no I/O/0/1), built from RANDOM_BYTES (cryptographically
-- secure, unlike RAND()). 32 divides 256, so every character is equally
-- likely.
-- ---------------------------------------------------------------------
CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost'
    PROCEDURE create_session(IN p_name VARCHAR(100),
                             IN p_game_type VARCHAR(20))
    SQL SECURITY DEFINER
BEGIN
    DECLARE v_me       INT DEFAULT my_user_id();
    DECLARE v_alphabet CHAR(32) DEFAULT 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    DECLARE v_code     CHAR(6);
    DECLARE v_bytes    BINARY(6);
    DECLARE i          INT;

    IF (SELECT COUNT(*) FROM game_sessions WHERE gm_id = v_me) >= 3 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'You already host 3 sessions';
    END IF;
    IF p_game_type NOT IN ('witcher', 'vtm', 'cyberpunk') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown game type';
    END IF;

    REPEAT
        SET v_bytes = RANDOM_BYTES(6), v_code = '', i = 1;
        WHILE i <= 6 DO
            SET v_code = CONCAT(v_code,
                SUBSTRING(v_alphabet, 1 + (ORD(SUBSTRING(v_bytes, i, 1)) MOD 32), 1));
            SET i = i + 1;
        END WHILE;
    UNTIL NOT EXISTS (SELECT 1 FROM game_sessions WHERE join_code = v_code) END REPEAT;

    INSERT INTO game_sessions (join_code, game_type, session_name, gm_id)
    VALUES (v_code, p_game_type, p_name, v_me);

    SELECT LAST_INSERT_ID() AS session_id, v_code AS join_code;
END //


-- ---------------------------------------------------------------------
-- join_session: become a player via the join code. Max 3 joined.
-- ---------------------------------------------------------------------
CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost'
    PROCEDURE join_session(IN p_code CHAR(6))
    SQL SECURITY DEFINER
BEGIN
    DECLARE v_me      INT DEFAULT my_user_id();
    DECLARE v_session INT;
    DECLARE v_gm      INT;

    SELECT session_id, gm_id INTO v_session, v_gm
    FROM game_sessions WHERE join_code = UPPER(p_code);

    IF v_session IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No session with that code';
    END IF;
    IF v_gm = v_me THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'You are the GM of this session';
    END IF;
    IF EXISTS (SELECT 1 FROM session_players
               WHERE user_id = v_me AND session_id = v_session) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'You already joined this session';
    END IF;
    IF (SELECT COUNT(*) FROM session_players WHERE user_id = v_me) >= 3 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'You already play in 3 sessions';
    END IF;

    INSERT INTO session_players (user_id, session_id) VALUES (v_me, v_session);
    SELECT v_session AS session_id;
END //


-- ---------------------------------------------------------------------
-- create_witcher_character: parent row + child row in ONE transaction,
-- so a character can never exist without its Witcher data (this is
-- where total participation of the ISA hierarchy is enforced).
-- Rulebook checks: only witchers can be Witchers (and vice versa);
-- only humans and elves can be mages or priests.
-- ---------------------------------------------------------------------
CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost'
    PROCEDURE create_witcher_character(
        IN p_session_id      INT,
        IN p_name            VARCHAR(60),
        IN p_age             SMALLINT UNSIGNED,
        IN p_gender          VARCHAR(30),
        IN p_lore            TEXT,
        IN p_race            VARCHAR(20),
        IN p_profession      VARCHAR(20),
        IN p_homeland        VARCHAR(40),
        IN p_social_standing VARCHAR(30),
        IN p_lifepath        TEXT,
        IN p_int TINYINT UNSIGNED, IN p_ref  TINYINT UNSIGNED, IN p_dex  TINYINT UNSIGNED,
        IN p_body TINYINT UNSIGNED, IN p_spd TINYINT UNSIGNED, IN p_emp  TINYINT UNSIGNED,
        IN p_cra TINYINT UNSIGNED, IN p_will TINYINT UNSIGNED, IN p_luck TINYINT UNSIGNED,
        IN p_coin            INT UNSIGNED)
    SQL SECURITY DEFINER
BEGIN
    DECLARE v_me      INT DEFAULT my_user_id();
    DECLARE v_char_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF NOT EXISTS (SELECT 1 FROM game_sessions
                   WHERE session_id = p_session_id AND game_type = 'witcher') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not a Witcher session';
    END IF;
    IF (p_race = 'witcher') <> (p_profession = 'witcher') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Only the witcher race can take the witcher profession, and vice versa';
    END IF;
    IF p_profession IN ('mage', 'priest') AND p_race NOT IN ('human', 'elf') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Only humans and elves can be mages or priests';
    END IF;

    IF p_gender IS NULL OR p_gender NOT IN ('male', 'female') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Gender must be male or female';
    END IF;

    START TRANSACTION;

    -- fk_char_player rejects this if the caller is not a player here;
    -- uq_one_char_per_session rejects a second character.
    INSERT INTO characters (owner_id, session_id, name, age, gender, lore)
    VALUES (v_me, p_session_id, p_name, p_age, p_gender, p_lore);
    SET v_char_id = LAST_INSERT_ID();

    INSERT INTO witcher_characters
        (char_id, race, profession, homeland, social_standing, lifepath,
         stat_int, stat_ref, stat_dex, stat_body, stat_spd,
         stat_emp, stat_cra, stat_will, stat_luck, coin)
    VALUES
        (v_char_id, p_race, p_profession, p_homeland, p_social_standing, p_lifepath,
         p_int, p_ref, p_dex, p_body, p_spd, p_emp, p_cra, p_will, p_luck, p_coin);

    COMMIT;
    SELECT v_char_id AS char_id;
END //


-- ---------------------------------------------------------------------
-- set_witcher_skill: add or change a skill on MY Witcher character
-- ---------------------------------------------------------------------
CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost'
    PROCEDURE set_witcher_skill(IN p_char_id INT,
                        IN p_skill   VARCHAR(40),
                        IN p_level   TINYINT UNSIGNED)
    SQL SECURITY DEFINER
BEGIN
    IF NOT EXISTS (SELECT 1 FROM characters
                   WHERE char_id = p_char_id AND owner_id = my_user_id()) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not your character';
    END IF;

    INSERT INTO witcher_character_skills (char_id, skill_name, level)
    VALUES (p_char_id, p_skill, p_level)
    ON DUPLICATE KEY UPDATE level = VALUES(level);
END //


-- ---------------------------------------------------------------------
-- set_lore_visible: the owner decides whether the party sees the lore
-- ---------------------------------------------------------------------
CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost'
    PROCEDURE set_lore_visible(IN p_char_id INT, IN p_visible BOOLEAN)
    SQL SECURITY DEFINER
BEGIN
    UPDATE characters
    SET lore_visible = p_visible
    WHERE char_id = p_char_id AND owner_id = my_user_id();

    IF ROW_COUNT() = 0 AND NOT EXISTS (SELECT 1 FROM characters
                                       WHERE char_id = p_char_id
                                         AND owner_id = my_user_id()) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not your character';
    END IF;
END //

-- ---------------------------------------------------------------------
-- set_cyberpunk_visibility: the owner decides whether the party sees the
-- real name, the handle, or both. Hiding both is refused here with a
-- clear message; the CHECK constraint chk_cp_shown would refuse it too.
-- ---------------------------------------------------------------------
CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost'
    PROCEDURE set_cyberpunk_visibility(IN p_char_id INT, IN p_show_name BOOLEAN,
                                       IN p_show_handle BOOLEAN)
    SQL SECURITY DEFINER
BEGIN
    IF NOT EXISTS (SELECT 1 FROM characters
                   WHERE char_id = p_char_id AND owner_id = my_user_id()) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not your character';
    END IF;
    IF NOT (p_show_name OR p_show_handle) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Show at least the name or the handle';
    END IF;

    UPDATE cyberpunk_characters
    SET show_name = p_show_name, show_handle = p_show_handle
    WHERE char_id = p_char_id;
END //

-- =====================================================================
-- VAMPIRE: THE MASQUERADE
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_vtm_character: parent + child row in ONE transaction.
-- Rulebook checks done here, in the database:
--   * attributes follow the V5 spread: one at 4, three at 3, four at 2,
--     one at 1
--   * thin-bloods are 14th-16th generation, everyone else 10th-13th
--   * Blood Potency follows from generation (+1 for Blood Leeches)
-- ---------------------------------------------------------------------
CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost'
    PROCEDURE create_vtm_character(
        IN p_session_id INT,
        IN p_name VARCHAR(60), IN p_age SMALLINT UNSIGNED, IN p_gender VARCHAR(30), IN p_lore TEXT,
        IN p_clan VARCHAR(20), IN p_concept VARCHAR(100), IN p_ambition VARCHAR(200),
        IN p_desire VARCHAR(200), IN p_sect VARCHAR(40), IN p_sire VARCHAR(60),
        IN p_generation TINYINT UNSIGNED, IN p_predator VARCHAR(20), IN p_humanity TINYINT UNSIGNED,
        IN p_str TINYINT UNSIGNED, IN p_dex TINYINT UNSIGNED, IN p_sta TINYINT UNSIGNED,
        IN p_cha TINYINT UNSIGNED, IN p_man TINYINT UNSIGNED, IN p_com TINYINT UNSIGNED,
        IN p_int TINYINT UNSIGNED, IN p_wit TINYINT UNSIGNED, IN p_res TINYINT UNSIGNED,
        IN p_convictions TEXT, IN p_touchstones TEXT, IN p_advantages TEXT, IN p_flaws TEXT)
    SQL SECURITY DEFINER
BEGIN
    DECLARE v_me      INT DEFAULT my_user_id();
    DECLARE v_char_id INT;
    DECLARE v_potency TINYINT;
    DECLARE v_spread  VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF NOT EXISTS (SELECT 1 FROM game_sessions
                   WHERE session_id = p_session_id AND game_type = 'vtm') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not a Vampire session';
    END IF;

    -- the attribute spread, written as a sorted string: 4,3,3,3,2,2,2,2,1
    SELECT GROUP_CONCAT(a ORDER BY a DESC) INTO v_spread FROM (
        SELECT p_str AS a UNION ALL SELECT p_dex UNION ALL SELECT p_sta
        UNION ALL SELECT p_cha UNION ALL SELECT p_man UNION ALL SELECT p_com
        UNION ALL SELECT p_int UNION ALL SELECT p_wit UNION ALL SELECT p_res) t;
    IF v_spread <> '4,3,3,3,2,2,2,2,1' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Attributes must be one at 4, three at 3, four at 2 and one at 1';
    END IF;

    IF (p_clan = 'thin_blood') <> (p_generation BETWEEN 14 AND 16) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Thin-bloods are 14th-16th generation; other clans 10th-13th';
    END IF;
    IF p_clan <> 'thin_blood' AND p_generation NOT BETWEEN 10 AND 13 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Thin-bloods are 14th-16th generation; other clans 10th-13th';
    END IF;

    SET v_potency = CASE WHEN p_generation >= 14 THEN 0
                         WHEN p_generation >= 12 THEN 1
                         ELSE 2 END
                  + IF(p_predator = 'blood_leech', 1, 0);

    IF p_gender IS NULL OR p_gender NOT IN ('male', 'female') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Gender must be male or female';
    END IF;

    START TRANSACTION;

    INSERT INTO characters (owner_id, session_id, name, age, gender, lore)
    VALUES (v_me, p_session_id, p_name, p_age, p_gender, p_lore);
    SET v_char_id = LAST_INSERT_ID();

    INSERT INTO vtm_characters
        (char_id, clan, concept, ambition, desire, sect, sire, generation, blood_potency,
         predator_type, humanity,
         attr_strength, attr_dexterity, attr_stamina, attr_charisma, attr_manipulation,
         attr_composure, attr_intelligence, attr_wits, attr_resolve,
         convictions, touchstones, advantages, flaws)
    VALUES
        (v_char_id, p_clan, p_concept, p_ambition, p_desire, p_sect, p_sire, p_generation, v_potency,
         p_predator, p_humanity,
         p_str, p_dex, p_sta, p_cha, p_man, p_com, p_int, p_wit, p_res,
         p_convictions, p_touchstones, p_advantages, p_flaws);

    COMMIT;
    SELECT v_char_id AS char_id;
END //


CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost'
    PROCEDURE set_vtm_skill(IN p_char_id INT, IN p_skill VARCHAR(30),
                            IN p_level TINYINT UNSIGNED, IN p_specialty VARCHAR(60))
    SQL SECURITY DEFINER
BEGIN
    IF NOT EXISTS (SELECT 1 FROM characters
                   WHERE char_id = p_char_id AND owner_id = my_user_id()) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not your character';
    END IF;
    INSERT INTO vtm_character_skills (char_id, skill_name, level, specialty)
    VALUES (p_char_id, p_skill, p_level, NULLIF(p_specialty, ''))
    ON DUPLICATE KEY UPDATE level = VALUES(level), specialty = VALUES(specialty);
END //


CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost'
    PROCEDURE set_vtm_discipline(IN p_char_id INT, IN p_discipline VARCHAR(30),
                                 IN p_level TINYINT UNSIGNED)
    SQL SECURITY DEFINER
BEGIN
    IF NOT EXISTS (SELECT 1 FROM characters
                   WHERE char_id = p_char_id AND owner_id = my_user_id()) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not your character';
    END IF;
    INSERT INTO vtm_character_disciplines (char_id, discipline, level)
    VALUES (p_char_id, p_discipline, p_level)
    ON DUPLICATE KEY UPDATE level = VALUES(level);
END //


-- =====================================================================
-- CYBERPUNK 2020
-- =====================================================================

CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost'
    PROCEDURE create_cyberpunk_character(
        IN p_session_id INT,
        IN p_name VARCHAR(60), IN p_handle VARCHAR(40),
        IN p_show_name BOOLEAN, IN p_show_handle BOOLEAN,
        IN p_age SMALLINT UNSIGNED, IN p_gender VARCHAR(30), IN p_lore TEXT,
        IN p_role VARCHAR(20),
        IN p_int TINYINT UNSIGNED, IN p_ref TINYINT UNSIGNED, IN p_tech TINYINT UNSIGNED,
        IN p_cool TINYINT UNSIGNED, IN p_attr TINYINT UNSIGNED, IN p_luck TINYINT UNSIGNED,
        IN p_ma TINYINT UNSIGNED, IN p_body TINYINT UNSIGNED, IN p_emp TINYINT UNSIGNED,
        IN p_ethnicity VARCHAR(40), IN p_style VARCHAR(200), IN p_motivations TEXT,
        IN p_lifepath TEXT, IN p_cash INT UNSIGNED)
    SQL SECURITY DEFINER
BEGIN
    DECLARE v_me      INT DEFAULT my_user_id();
    DECLARE v_char_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF NOT EXISTS (SELECT 1 FROM game_sessions
                   WHERE session_id = p_session_id AND game_type = 'cyberpunk') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not a Cyberpunk session';
    END IF;
    IF p_age IS NOT NULL AND p_age < 16 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cyberpunk characters are at least 16';
    END IF;
    IF NOT (p_show_name OR p_show_handle) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Show at least the name or the handle';
    END IF;

    IF p_gender IS NULL OR p_gender NOT IN ('male', 'female') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Gender must be male or female';
    END IF;

    START TRANSACTION;

    INSERT INTO characters (owner_id, session_id, name, age, gender, lore)
    VALUES (v_me, p_session_id, p_name, p_age, p_gender, p_lore);
    SET v_char_id = LAST_INSERT_ID();

    INSERT INTO cyberpunk_characters
        (char_id, handle, show_name, show_handle,
         role, stat_int, stat_ref, stat_tech, stat_cool, stat_attr,
         stat_luck, stat_ma, stat_body, stat_emp,
         ethnicity, style, motivations, lifepath, cash)
    VALUES
        (v_char_id, p_handle, p_show_name, p_show_handle,
         p_role, p_int, p_ref, p_tech, p_cool, p_attr,
         p_luck, p_ma, p_body, p_emp,
         p_ethnicity, p_style, p_motivations, p_lifepath, p_cash);

    COMMIT;
    SELECT v_char_id AS char_id;
END //


CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost'
    PROCEDURE set_cyberpunk_skill(IN p_char_id INT, IN p_skill VARCHAR(40),
                                  IN p_level TINYINT UNSIGNED)
    SQL SECURITY DEFINER
BEGIN
    IF NOT EXISTS (SELECT 1 FROM characters
                   WHERE char_id = p_char_id AND owner_id = my_user_id()) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not your character';
    END IF;
    INSERT INTO cyberpunk_character_skills (char_id, skill_name, level)
    VALUES (p_char_id, p_skill, p_level)
    ON DUPLICATE KEY UPDATE level = VALUES(level);
END //

DELIMITER ;

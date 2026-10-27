USE ttrpg_forge;


GRANT EXECUTE ON ttrpg_forge.* TO 'forge_owner'@'localhost';

DELIMITER //


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



CREATE OR REPLACE
    DEFINER = 'forge_owner'@'localhost'
    PROCEDURE set_skill(IN p_char_id INT,
                        IN p_skill   VARCHAR(40),
                        IN p_level   TINYINT UNSIGNED)
    SQL SECURITY DEFINER
BEGIN
    IF NOT EXISTS (SELECT 1 FROM characters
                   WHERE char_id = p_char_id AND owner_id = my_user_id()) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not your character';
    END IF;

    INSERT INTO character_skills (char_id, skill_name, level)
    VALUES (p_char_id, p_skill, p_level)
    ON DUPLICATE KEY UPDATE level = VALUES(level);
END //



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

DELIMITER ;
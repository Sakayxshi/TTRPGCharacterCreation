USE ttrpg_forge;


/* ED25519 authentication plugin */

INSTALL SONAME 'auth_ed25519';



CREATE OR REPLACE USER 'forge_owner'@'localhost' ACCOUNT LOCK;
GRANT SELECT, INSERT, UPDATE, DELETE ON ttrpg_forge.* TO 'forge_owner'@'localhost';

CREATE OR REPLACE USER 'forge_admin'@'localhost' ACCOUNT LOCK;
GRANT CREATE USER ON *.* TO 'forge_admin'@'localhost';
GRANT INSERT ON ttrpg_forge.users TO 'forge_admin'@'localhost';



CREATE OR REPLACE ROLE forge_user;

GRANT SELECT, EXECUTE ON ttrpg_forge.* TO forge_user;

DENY SELECT ON ttrpg_forge.users              TO forge_user;
DENY SELECT ON ttrpg_forge.game_sessions      TO forge_user;
DENY SELECT ON ttrpg_forge.session_players    TO forge_user;
DENY SELECT ON ttrpg_forge.characters         TO forge_user;
DENY SELECT ON ttrpg_forge.witcher_characters TO forge_user;
DENY SELECT ON ttrpg_forge.character_skills   TO forge_user;
-- witcher_skills stays readable: it is public rulebook data.

-- forge_admin hands this role to every new account
GRANT forge_user TO 'forge_admin'@'localhost' WITH ADMIN OPTION;



DELIMITER //

CREATE OR REPLACE
    DEFINER = 'forge_admin'@'localhost'
    PROCEDURE register_user(IN p_username VARCHAR(32), IN p_password VARCHAR(128))
    SQL SECURITY DEFINER
BEGIN
    DECLARE v_account  VARCHAR(64);
    DECLARE v_created  BOOLEAN DEFAULT FALSE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        IF v_created THEN
            EXECUTE IMMEDIATE CONCAT('DROP USER IF EXISTS ', v_account);
        END IF;
        RESIGNAL;
    END;

    IF p_username IS NULL OR p_username NOT REGEXP '^[a-z0-9_]{3,32}$' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Username: 3-32 characters, a-z, 0-9 and _ only';
    END IF;
    IF p_password IS NULL OR CHAR_LENGTH(p_password) < 10 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Password must be at least 10 characters';
    END IF;

    SET v_account = CONCAT(QUOTE(p_username), '@''localhost''');

    EXECUTE IMMEDIATE CONCAT('CREATE USER ', v_account,
                             ' IDENTIFIED VIA ed25519 USING PASSWORD(',
                             QUOTE(p_password), ')');
    SET v_created = TRUE;

    EXECUTE IMMEDIATE CONCAT('GRANT forge_user TO ', v_account);

    INSERT INTO users (username) VALUES (p_username);
END //

DELIMITER ;



CREATE OR REPLACE USER 'forge_registrar'@'localhost'
    IDENTIFIED VIA ed25519 USING PASSWORD('demo-registrar-2026');
GRANT EXECUTE ON PROCEDURE ttrpg_forge.register_user TO 'forge_registrar'@'localhost';

-- MariaDB also checks that the DEFINER may execute the procedure
GRANT EXECUTE ON PROCEDURE ttrpg_forge.register_user TO 'forge_admin'@'localhost';

-- Ordinary users must not be able to create accounts themselves:
-- they get EXECUTE on the whole schema above, except this procedure.
DENY EXECUTE ON PROCEDURE ttrpg_forge.register_user TO forge_user;


/*demo accounts*/
CREATE OR REPLACE USER 'gm_vesemir'@'localhost'
    IDENTIFIED VIA ed25519 USING PASSWORD('demo-vesemir-2026');
CREATE OR REPLACE USER 'player_ciri'@'localhost'
    IDENTIFIED VIA ed25519 USING PASSWORD('demo-ciri-2026');
CREATE OR REPLACE USER 'player_lambert'@'localhost'
    IDENTIFIED VIA ed25519 USING PASSWORD('demo-lambert-2026');
CREATE OR REPLACE USER 'outsider_zoltan'@'localhost'
    IDENTIFIED VIA ed25519 USING PASSWORD('demo-zoltan-2026');

GRANT forge_user TO 'gm_vesemir'@'localhost', 'player_ciri'@'localhost',
                    'player_lambert'@'localhost', 'outsider_zoltan'@'localhost';


-- =====================================================================
-- TTRPG Forge - accounts, roles and the DENY rules
-- Run AFTER 01_schema.sql and 02_seed.sql:
--     mariadb -u root -p < sql/03_accounts.sql
-- Requires MariaDB 13.1+ (DENY).
--
-- IMPORTANT: re-running 01_schema.sql drops the tables, and dropping an
-- object also removes the DENY rules that point at it. Always run the
-- files in order 01 -> 02 -> 03 -> 04.
--
-- Accounts created here:
--   forge_owner      LOCKED. Owns the data; definer of the views (04).
--   forge_admin      LOCKED. Definer of register_user(); may create users.
--   forge_registrar  ED25519. The website's signup connection. May ONLY
--                    call register_user() - nothing else.
--   4 demo players   ED25519, role forge_user (see 02_seed.sql)
--
-- Logging in as a user gives NO privileges until the connection runs:
--     SET ROLE forge_user;
--
-- DEMO PASSWORDS: the passwords below exist only so the project can be
-- reproduced locally. Real accounts are created through register_user()
-- and their passwords are never written to any file.
-- =====================================================================

USE ttrpg_forge;

-- ---------------------------------------------------------------------
-- 1. ED25519 authentication plugin (loaded once per server)
-- ---------------------------------------------------------------------
INSTALL SONAME 'auth_ed25519';


-- ---------------------------------------------------------------------
-- 2. Internal accounts. ACCOUNT LOCK = nobody can log in as them; they
--    exist only so views and procedures can run with their privileges.
-- ---------------------------------------------------------------------
CREATE OR REPLACE USER 'forge_owner'@'localhost' ACCOUNT LOCK;
GRANT SELECT, INSERT, UPDATE, DELETE ON ttrpg_forge.* TO 'forge_owner'@'localhost';

CREATE OR REPLACE USER 'forge_admin'@'localhost' ACCOUNT LOCK;
GRANT CREATE USER ON *.* TO 'forge_admin'@'localhost';
GRANT INSERT ON ttrpg_forge.users TO 'forge_admin'@'localhost';


-- ---------------------------------------------------------------------
-- 3. The role every website user gets
--    "May read everything in the schema EXCEPT the raw tables."
--    Views (04) are readable automatically because they live in the
--    schema; the base tables are carved out with DENY.
-- ---------------------------------------------------------------------
CREATE OR REPLACE ROLE forge_user;

GRANT SELECT, EXECUTE ON ttrpg_forge.* TO forge_user;

DENY SELECT ON ttrpg_forge.users              TO forge_user;
DENY SELECT ON ttrpg_forge.game_sessions      TO forge_user;
DENY SELECT ON ttrpg_forge.session_players    TO forge_user;
DENY SELECT ON ttrpg_forge.characters         TO forge_user;
DENY SELECT ON ttrpg_forge.witcher_characters TO forge_user;
DENY SELECT ON ttrpg_forge.witcher_character_skills   TO forge_user;
DENY SELECT ON ttrpg_forge.vtm_characters             TO forge_user;
DENY SELECT ON ttrpg_forge.vtm_character_skills       TO forge_user;
DENY SELECT ON ttrpg_forge.vtm_character_disciplines  TO forge_user;
DENY SELECT ON ttrpg_forge.cyberpunk_characters       TO forge_user;
DENY SELECT ON ttrpg_forge.cyberpunk_character_skills TO forge_user;
-- The lookup tables (witcher_skills, vtm_skills, vtm_disciplines,
-- vtm_clan_disciplines, cyberpunk_skills) stay readable: rulebook data.

-- forge_admin hands this role to every new account
GRANT forge_user TO 'forge_admin'@'localhost' WITH ADMIN OPTION;


-- ---------------------------------------------------------------------
-- 4. register_user(): the ONLY way new accounts are created.
--    Runs with forge_admin's privileges (SQL SECURITY DEFINER), so the
--    caller needs nothing but EXECUTE on this one procedure.
--    Order matters: CREATE USER causes an implicit commit, so the
--    account and the users-row cannot be one transaction. The account
--    is created first; if anything after it fails, it is dropped again.
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- 5. The signup account used by the website backend
-- ---------------------------------------------------------------------
CREATE OR REPLACE USER 'forge_registrar'@'localhost'
    IDENTIFIED VIA ed25519 USING PASSWORD('demo-registrar-2026');
GRANT EXECUTE ON PROCEDURE ttrpg_forge.register_user TO 'forge_registrar'@'localhost';

-- MariaDB also checks that the DEFINER may execute the procedure
GRANT EXECUTE ON PROCEDURE ttrpg_forge.register_user TO 'forge_admin'@'localhost';

-- Ordinary users must not be able to create accounts themselves:
-- they get EXECUTE on the whole schema above, except this procedure.
DENY EXECUTE ON PROCEDURE ttrpg_forge.register_user TO forge_user;


-- ---------------------------------------------------------------------
-- 6. Demo accounts (their users-rows already exist from 02_seed.sql)
-- ---------------------------------------------------------------------
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

-- No DEFAULT ROLE on purpose: a fresh login has NO privileges at all.
-- Every connection must switch the role on itself:   SET ROLE forge_user;
-- (the backend does this right after logging a user in). Setting a default
-- role for someone else would need write access to the mysql database,
-- which the signup procedure must never have.

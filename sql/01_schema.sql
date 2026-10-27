CREATE OR REPLACE DATABASE ttrpg_forge
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE ttrpg_forge;



CREATE TABLE users 
(
    user_id     INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(32) NOT NULL UNIQUE,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_username_format
        CHECK (username REGEXP '^[a-z0-9_]{3,32}$')
);



CREATE TABLE game_sessions 
(
    session_id    INT AUTO_INCREMENT PRIMARY KEY,
    join_code     CHAR(6)      NOT NULL UNIQUE,
    game_type     ENUM('witcher', 'vtm', 'cyberpunk') NOT NULL,
    session_name  VARCHAR(100) NOT NULL,
    gm_id         INT          NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_session_gm
        FOREIGN KEY (gm_id) REFERENCES users(user_id)
);



CREATE TABLE session_players 
(
    user_id     INT       NOT NULL,
    session_id  INT       NOT NULL,
    joined_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, session_id),
    CONSTRAINT fk_sp_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_sp_session
        FOREIGN KEY (session_id) REFERENCES game_sessions(session_id)
        ON DELETE CASCADE
);



CREATE TABLE characters 
(
    char_id       INT AUTO_INCREMENT PRIMARY KEY,
    owner_id      INT          NOT NULL,
    session_id    INT          NOT NULL,
    name          VARCHAR(60)  NOT NULL,
    age           SMALLINT UNSIGNED,
    gender        VARCHAR(30),
    lore          TEXT,
    lore_visible  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_one_char_per_session
        UNIQUE (owner_id, session_id),
    CONSTRAINT fk_char_player
        FOREIGN KEY (owner_id, session_id)
        REFERENCES session_players(user_id, session_id)
        ON DELETE CASCADE
);




CREATE TABLE witcher_characters 
(
    char_id          INT PRIMARY KEY,
    race             ENUM('human', 'elf', 'dwarf', 'witcher') NOT NULL,
    profession       ENUM('bard', 'craftsman', 'criminal', 'doctor', 'mage',
                          'man_at_arms', 'merchant', 'priest', 'witcher') NOT NULL,
    homeland         VARCHAR(40),
    social_standing  VARCHAR(30),
    reputation       TINYINT          NOT NULL DEFAULT 0,
    lifepath         TEXT,
    stat_int         TINYINT UNSIGNED NOT NULL,
    stat_ref         TINYINT UNSIGNED NOT NULL,
    stat_dex         TINYINT UNSIGNED NOT NULL,
    stat_body        TINYINT UNSIGNED NOT NULL,
    stat_spd         TINYINT UNSIGNED NOT NULL,
    stat_emp         TINYINT UNSIGNED NOT NULL,
    stat_cra         TINYINT UNSIGNED NOT NULL,
    stat_will        TINYINT UNSIGNED NOT NULL,
    stat_luck        TINYINT UNSIGNED NOT NULL,
    coin             INT UNSIGNED     NOT NULL DEFAULT 0,
    run_speed        SMALLINT AS (stat_spd * 3)   VIRTUAL,
    encumbrance      SMALLINT AS (stat_body * 10) VIRTUAL,
    CONSTRAINT chk_stats_range CHECK (
        stat_int  BETWEEN 1 AND 13 AND stat_ref  BETWEEN 1 AND 13 AND
        stat_dex  BETWEEN 1 AND 13 AND stat_body BETWEEN 1 AND 13 AND
        stat_spd  BETWEEN 1 AND 13 AND stat_emp  BETWEEN 1 AND 13 AND
        stat_cra  BETWEEN 1 AND 13 AND stat_will BETWEEN 1 AND 13 AND
        stat_luck BETWEEN 1 AND 13
    ),
    CONSTRAINT fk_witcher_char
        FOREIGN KEY (char_id) REFERENCES characters(char_id)
        ON DELETE CASCADE
);



CREATE TABLE witcher_skills 
(
    skill_name  VARCHAR(40) PRIMARY KEY,
    base_stat   ENUM('int', 'ref', 'dex', 'body', 'emp', 'cra', 'will') NOT NULL,
    cost        TINYINT UNSIGNED NOT NULL DEFAULT 1,
    CONSTRAINT chk_skill_cost CHECK (cost IN (1, 2))
);



CREATE TABLE character_skills 
(
    char_id     INT              NOT NULL,
    skill_name  VARCHAR(40)      NOT NULL,
    level       TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (char_id, skill_name),
    CONSTRAINT chk_skill_level CHECK (level BETWEEN 0 AND 10),
    CONSTRAINT fk_cs_char
        FOREIGN KEY (char_id) REFERENCES witcher_characters(char_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_cs_skill
        FOREIGN KEY (skill_name) REFERENCES witcher_skills(skill_name)
);
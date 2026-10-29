SET FOREIGN_KEY_CHECKS = 0;
CREATE OR REPLACE DATABASE ttrpg_forge
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 1;
USE ttrpg_forge;

CREATE TABLE users (
    user_id     INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(32) NOT NULL UNIQUE,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_username_format
        CHECK (username REGEXP '^[a-z0-9_]{3,32}$')
);

CREATE TABLE game_sessions (
    session_id    INT AUTO_INCREMENT PRIMARY KEY,
    join_code     CHAR(6)      NOT NULL UNIQUE,
    game_type     ENUM('witcher', 'vtm', 'cyberpunk') NOT NULL,
    session_name  VARCHAR(100) NOT NULL,
    gm_id         INT          NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_session_gm
        FOREIGN KEY (gm_id) REFERENCES users(user_id)
);

CREATE TABLE session_players (
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

CREATE TABLE characters (
    char_id       INT AUTO_INCREMENT PRIMARY KEY,
    owner_id      INT          NOT NULL,
    session_id    INT          NOT NULL,
    name          VARCHAR(60)  NOT NULL,
    age           SMALLINT UNSIGNED,
    gender        ENUM('male', 'female') NOT NULL,
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

CREATE TABLE witcher_characters (
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

CREATE TABLE witcher_skills (
    skill_name  VARCHAR(40) PRIMARY KEY,
    base_stat   ENUM('int', 'ref', 'dex', 'body', 'emp', 'cra', 'will') NOT NULL,
    cost        TINYINT UNSIGNED NOT NULL DEFAULT 1,
    CONSTRAINT chk_skill_cost CHECK (cost IN (1, 2))
);

CREATE TABLE witcher_character_skills (
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

CREATE TABLE vtm_characters (
    char_id            INT PRIMARY KEY,
    clan               ENUM('brujah', 'gangrel', 'malkavian', 'nosferatu', 'toreador',
                            'tremere', 'ventrue', 'caitiff', 'thin_blood') NOT NULL,
    concept            VARCHAR(100),
    ambition           VARCHAR(200),
    desire             VARCHAR(200),
    sect               VARCHAR(40),
    sire               VARCHAR(60),
    generation         TINYINT UNSIGNED NOT NULL,
    blood_potency      TINYINT UNSIGNED NOT NULL,
    predator_type      ENUM('alleycat', 'bagger', 'blood_leech', 'cleaver', 'consensualist',
                            'farmer', 'osiris', 'sandman', 'scene_queen', 'siren') NOT NULL,
    humanity           TINYINT UNSIGNED NOT NULL DEFAULT 7,
    attr_strength      TINYINT UNSIGNED NOT NULL,
    attr_dexterity     TINYINT UNSIGNED NOT NULL,
    attr_stamina       TINYINT UNSIGNED NOT NULL,
    attr_charisma      TINYINT UNSIGNED NOT NULL,
    attr_manipulation  TINYINT UNSIGNED NOT NULL,
    attr_composure     TINYINT UNSIGNED NOT NULL,
    attr_intelligence  TINYINT UNSIGNED NOT NULL,
    attr_wits          TINYINT UNSIGNED NOT NULL,
    attr_resolve       TINYINT UNSIGNED NOT NULL,
    convictions        TEXT,
    touchstones        TEXT,
    advantages         TEXT,
    flaws              TEXT,
    health             TINYINT AS (attr_stamina + 3) VIRTUAL,
    willpower          TINYINT AS (attr_composure + attr_resolve) VIRTUAL,
    CONSTRAINT chk_vtm_attrs CHECK (
        attr_strength     BETWEEN 1 AND 5 AND attr_dexterity    BETWEEN 1 AND 5 AND
        attr_stamina      BETWEEN 1 AND 5 AND attr_charisma     BETWEEN 1 AND 5 AND
        attr_manipulation BETWEEN 1 AND 5 AND attr_composure    BETWEEN 1 AND 5 AND
        attr_intelligence BETWEEN 1 AND 5 AND attr_wits         BETWEEN 1 AND 5 AND
        attr_resolve      BETWEEN 1 AND 5
    ),
    CONSTRAINT chk_vtm_generation CHECK (generation BETWEEN 4 AND 16),
    CONSTRAINT chk_vtm_potency    CHECK (blood_potency BETWEEN 0 AND 10),
    CONSTRAINT chk_vtm_humanity   CHECK (humanity BETWEEN 0 AND 10),
    CONSTRAINT fk_vtm_char
        FOREIGN KEY (char_id) REFERENCES characters(char_id)
        ON DELETE CASCADE
);

CREATE TABLE vtm_skills (
    skill_name  VARCHAR(30) PRIMARY KEY,
    category    ENUM('physical', 'social', 'mental') NOT NULL
);

CREATE TABLE vtm_disciplines (
    discipline  VARCHAR(30) PRIMARY KEY
);

CREATE TABLE vtm_clan_disciplines (
    clan        ENUM('brujah', 'gangrel', 'malkavian', 'nosferatu', 'toreador',
                     'tremere', 'ventrue', 'caitiff', 'thin_blood') NOT NULL,
    discipline  VARCHAR(30) NOT NULL,
    PRIMARY KEY (clan, discipline),
    CONSTRAINT fk_vcd_discipline
        FOREIGN KEY (discipline) REFERENCES vtm_disciplines(discipline)
);

CREATE TABLE vtm_character_skills (
    char_id     INT              NOT NULL,
    skill_name  VARCHAR(30)      NOT NULL,
    level       TINYINT UNSIGNED NOT NULL,
    specialty   VARCHAR(60),
    PRIMARY KEY (char_id, skill_name),
    CONSTRAINT chk_vtm_skill_level CHECK (level BETWEEN 0 AND 5),
    CONSTRAINT fk_vcs_char
        FOREIGN KEY (char_id) REFERENCES vtm_characters(char_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_vcs_skill
        FOREIGN KEY (skill_name) REFERENCES vtm_skills(skill_name)
);

CREATE TABLE vtm_character_disciplines (
    char_id     INT              NOT NULL,
    discipline  VARCHAR(30)      NOT NULL,
    level       TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (char_id, discipline),
    CONSTRAINT chk_vtm_disc_level CHECK (level BETWEEN 1 AND 5),
    CONSTRAINT fk_vcdisc_char
        FOREIGN KEY (char_id) REFERENCES vtm_characters(char_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_vcdisc_discipline
        FOREIGN KEY (discipline) REFERENCES vtm_disciplines(discipline)
);

CREATE TABLE cyberpunk_characters (
    char_id      INT PRIMARY KEY,
    handle       VARCHAR(40)      NOT NULL,
    show_name    BOOLEAN          NOT NULL DEFAULT TRUE,
    show_handle  BOOLEAN          NOT NULL DEFAULT TRUE,
    role         ENUM('rockerboy', 'solo', 'netrunner', 'techie', 'medtechie',
                      'media', 'cop', 'corporate', 'fixer', 'nomad') NOT NULL,
    stat_int     TINYINT UNSIGNED NOT NULL,
    stat_ref     TINYINT UNSIGNED NOT NULL,
    stat_tech    TINYINT UNSIGNED NOT NULL,
    stat_cool    TINYINT UNSIGNED NOT NULL,
    stat_attr    TINYINT UNSIGNED NOT NULL,
    stat_luck    TINYINT UNSIGNED NOT NULL,
    stat_ma      TINYINT UNSIGNED NOT NULL,
    stat_body    TINYINT UNSIGNED NOT NULL,
    stat_emp     TINYINT UNSIGNED NOT NULL,
    reputation   TINYINT          NOT NULL DEFAULT 0,
    ethnicity    VARCHAR(40),
    style        VARCHAR(200),
    motivations  TEXT,
    lifepath     TEXT,
    cash         INT UNSIGNED     NOT NULL DEFAULT 0,
    run_m        SMALLINT AS (stat_ma * 3) VIRTUAL,
    leap_m       SMALLINT AS (FLOOR(stat_ma * 3 / 4)) VIRTUAL,
    save_target  TINYINT  AS (stat_body) VIRTUAL,
    humanity     SMALLINT AS (stat_emp * 10) VIRTUAL,
    CONSTRAINT chk_cp_stats CHECK (
        stat_int  BETWEEN 2 AND 10 AND stat_ref  BETWEEN 2 AND 10 AND
        stat_tech BETWEEN 2 AND 10 AND stat_cool BETWEEN 2 AND 10 AND
        stat_attr BETWEEN 2 AND 10 AND stat_luck BETWEEN 2 AND 10 AND
        stat_ma   BETWEEN 2 AND 10 AND stat_body BETWEEN 2 AND 10 AND
        stat_emp  BETWEEN 2 AND 10
    ),
    CONSTRAINT chk_cp_shown CHECK (show_name OR show_handle),
    CONSTRAINT fk_cp_char
        FOREIGN KEY (char_id) REFERENCES characters(char_id)
        ON DELETE CASCADE
);

CREATE TABLE cyberpunk_skills (
    skill_name  VARCHAR(40) PRIMARY KEY,
    stat        ENUM('special', 'attr', 'body', 'cool', 'emp', 'int', 'ref', 'tech') NOT NULL
);

CREATE TABLE cyberpunk_character_skills (
    char_id     INT              NOT NULL,
    skill_name  VARCHAR(40)      NOT NULL,
    level       TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (char_id, skill_name),
    CONSTRAINT chk_cp_skill_level CHECK (level BETWEEN 0 AND 10),
    CONSTRAINT fk_cpcs_char
        FOREIGN KEY (char_id) REFERENCES cyberpunk_characters(char_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_cpcs_skill
        FOREIGN KEY (skill_name) REFERENCES cyberpunk_skills(skill_name)
);

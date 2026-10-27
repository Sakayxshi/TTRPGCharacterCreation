USE ttrpg_forge;


/*Part 1: Witcher skills*/

INSERT INTO witcher_skills (skill_name, base_stat, cost) VALUES

    -- Intelligence
    ('Awareness',               'int',  1),
    ('Business',                'int',  1),
    ('Deduction',               'int',  1),
    ('Education',               'int',  1),
    ('Language: Nordling',      'int',  2),
    ('Language: Elder Speech',  'int',  2),
    ('Language: Dwarven',       'int',  2),
    ('Monster Lore',            'int',  2),
    ('Social Etiquette',        'int',  1),
    ('Streetwise',              'int',  1),
    ('Tactics',                 'int',  2),
    ('Teaching',                'int',  1),
    ('Wilderness Survival',     'int',  1),

    -- Reflex
    ('Brawling',                'ref',  1),
    ('Dodge/Escape',            'ref',  1),
    ('Melee',                   'ref',  1),
    ('Riding',                  'ref',  1),
    ('Sailing',                 'ref',  1),
    ('Small Blades',            'ref',  1),
    ('Staff/Spear',             'ref',  1),
    ('Swordsmanship',           'ref',  1),

    -- Dexterity
    ('Archery',                 'dex',  1),
    ('Athletics',               'dex',  1),
    ('Crossbow',                'dex',  1),
    ('Sleight of Hand',         'dex',  1),
    ('Stealth',                 'dex',  1),

    -- Body
    ('Physique',                'body', 1),
    ('Endurance',               'body', 1),

    -- Empathy
    ('Charisma',                'emp',  1),
    ('Deceit',                  'emp',  1),
    ('Fine Arts',               'emp',  1),
    ('Gambling',                'emp',  1),
    ('Grooming and Style',      'emp',  1),
    ('Human Perception',        'emp',  1),
    ('Leadership',              'emp',  1),
    ('Persuasion',              'emp',  1),
    ('Performance',             'emp',  1),
    ('Seduction',               'emp',  1),

    -- Craft
    ('Alchemy',                 'cra',  2),
    ('Crafting',                'cra',  2),
    ('Disguise',                'cra',  1),
    ('First Aid',               'cra',  1),
    ('Forgery',                 'cra',  1),
    ('Pick Lock',               'cra',  1),
    ('Trap Crafting',           'cra',  2),

    -- Will
    ('Courage',                 'will', 1),
    ('Hex Weaving',             'will', 2),
    ('Intimidation',            'will', 1),
    ('Spell Casting',           'will', 2),
    ('Resist Magic',            'will', 2),
    ('Resist Coercion',         'will', 1),
    ('Ritual Crafting',         'will', 2);


/* Demo Data*/

--Players 

INSERT INTO users (user_id, username) VALUES
    (1, 'player_1'),
    (2, 'player_2'),
    (3, 'player_3'),
    (4, 'player_4(outsider)'),
    (5, 'player_5');

--Game Sessions

INSERT INTO game_sessions (session_id, join_code, game_type, session_name, gm_id) VALUES
    (1, 'KMR7Q2', 'witcher',   'Winter at Kaer Morhen', 1), --Player 1 is the GM
    (2, 'NC2020', 'cyberpunk', 'Night City Run',        3); --Player 3 is the GM 

INSERT INTO session_players (user_id, session_id) VALUES
    (2, 1),   -- Player 2 playes in Session 1 (GM: Player 1)
    (3, 1),   -- Player 3 playes in Session 1 (GM: Player 1)
    (2, 2);   -- Player 2 playes in Session 2 (GM: Player 3)


/* Information of Players Characters */

INSERT INTO characters (char_id, owner_id, session_id, name, age, gender, lore, lore_visible) VALUES
    (1, 2, 1, 'Zireael', 21, 'female',
        'Trained in a witcher keep, though no mutations. Hunted across the Continent.',
        FALSE),   -- private lore (GM sees this information)
    (2, 3, 1, 'Lambert', 64, 'male',
        'Sharp-tongued witcher of the Wolf School. Says what everyone else is thinking.',
        TRUE);    -- shared lore (Players and GM see this information)



INSERT INTO witcher_characters
    (char_id, race, profession, homeland, social_standing, reputation, lifepath,
     stat_int, stat_ref, stat_dex, stat_body, stat_spd, stat_emp, stat_cra, stat_will, stat_luck, coin)
VALUES
    (1, 'human',   'man_at_arms', 'Cintra',  'Equal',    0, 'Noble family, lost in war.',
     6, 8, 8, 6, 7, 5, 4, 7, 6, 250),
    (2, 'witcher', 'witcher',     'Kaedwen', 'Feared',   1, 'Taken to Kaer Morhen as a child.',
     6, 9, 8, 8, 7, 3, 5, 6, 5, 180);

INSERT INTO character_skills (char_id, skill_name, level) VALUES
    (1, 'Swordsmanship',  6),
    (1, 'Dodge/Escape',   5),
    (1, 'Athletics',      4),
    (1, 'Riding',         3),
    (2, 'Swordsmanship',  6),
    (2, 'Alchemy',        4),
    (2, 'Monster Lore',   5),
    (2, 'Intimidation',   4);
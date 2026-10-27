-- =====================================================================
-- TTRPG Forge - seed data
-- Run AFTER 01_schema.sql:   mariadb -u root -p < sql/02_seed.sql
--
-- Part 1: reference data - skill and discipline lists from the three
--         rulebooks (Witcher TRPG, Vampire: The Masquerade 5th edition,
--         Cyberpunk 2020)
-- Part 2: demo data - 4 users, 3 sessions, 3 characters - chosen so that
--         every access-control rule has someone to test it on:
--   gm_vesemir       GM of the Witcher AND the Vampire session
--   player_ciri      player in all three; characters in Witcher + Vampire,
--                    none yet in Cyberpunk ("no character" state)
--   player_lambert   player in Witcher, but GM of the Cyberpunk session
--   outsider_zoltan  in no session at all - should see nothing
-- =====================================================================

USE ttrpg_forge;

-- ---------------------------------------------------------------------
-- Part 1: Witcher skills  (cost 2 = "difficult skill" in the rulebook)
-- ---------------------------------------------------------------------
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
    ('Ritual Crafting',         'will', 2),
    -- Defining skills: each profession has exactly one, only it can take it
    ('Busking',                 'emp',  1),   -- Bard
    ('Patch Job',               'cra',  1),   -- Craftsman
    ('Practiced Paranoia',      'int',  1),   -- Criminal
    ('Healing Hands',           'cra',  1),   -- Doctor
    ('Magic Training',          'int',  1),   -- Mage
    ('Tough As Nails',          'body', 1),   -- Man at Arms
    ('Well Traveled',           'int',  1),   -- Merchant
    ('Initiate of the Gods',    'emp',  1),   -- Priest
    ('Witcher Training',        'int',  1);   -- Witcher


-- ---------------------------------------------------------------------
-- Part 1b: Vampire: The Masquerade (V5) reference data
-- ---------------------------------------------------------------------
INSERT INTO vtm_skills (skill_name, category) VALUES
    ('Athletics', 'physical'), ('Brawl', 'physical'), ('Craft', 'physical'),
    ('Drive', 'physical'), ('Firearms', 'physical'), ('Larceny', 'physical'),
    ('Melee', 'physical'), ('Stealth', 'physical'), ('Survival', 'physical'),
    ('Animal Ken', 'social'), ('Etiquette', 'social'), ('Insight', 'social'),
    ('Intimidation', 'social'), ('Leadership', 'social'), ('Performance', 'social'),
    ('Persuasion', 'social'), ('Streetwise', 'social'), ('Subterfuge', 'social'),
    ('Academics', 'mental'), ('Awareness', 'mental'), ('Finance', 'mental'),
    ('Investigation', 'mental'), ('Medicine', 'mental'), ('Occult', 'mental'),
    ('Politics', 'mental'), ('Science', 'mental'), ('Technology', 'mental');

INSERT INTO vtm_disciplines (discipline) VALUES
    ('Animalism'), ('Auspex'), ('Blood Sorcery'), ('Celerity'), ('Dominate'),
    ('Fortitude'), ('Obfuscate'), ('Potence'), ('Presence'), ('Protean');

INSERT INTO vtm_clan_disciplines (clan, discipline) VALUES
    ('brujah', 'Celerity'),    ('brujah', 'Potence'),       ('brujah', 'Presence'),
    ('gangrel', 'Animalism'),  ('gangrel', 'Fortitude'),    ('gangrel', 'Protean'),
    ('malkavian', 'Auspex'),   ('malkavian', 'Dominate'),   ('malkavian', 'Obfuscate'),
    ('nosferatu', 'Animalism'),('nosferatu', 'Obfuscate'),  ('nosferatu', 'Potence'),
    ('toreador', 'Auspex'),    ('toreador', 'Celerity'),    ('toreador', 'Presence'),
    ('tremere', 'Auspex'),     ('tremere', 'Blood Sorcery'),('tremere', 'Dominate'),
    ('ventrue', 'Dominate'),   ('ventrue', 'Fortitude'),    ('ventrue', 'Presence');


-- ---------------------------------------------------------------------
-- Part 1c: Cyberpunk 2020 reference data (master skill list)
-- 'special' = the role's Special Ability
-- ---------------------------------------------------------------------
INSERT INTO cyberpunk_skills (skill_name, stat) VALUES
    ('Authority', 'special'), ('Charismatic Leadership', 'special'), ('Combat Sense', 'special'),
    ('Credibility', 'special'), ('Family', 'special'), ('Interface', 'special'),
    ('Jury Rig', 'special'), ('Medical Tech', 'special'), ('Resources', 'special'),
    ('Streetdeal', 'special'),
    ('Personal Grooming', 'attr'), ('Wardrobe & Style', 'attr'),
    ('Endurance', 'body'), ('Strength Feat', 'body'), ('Swimming', 'body'),
    ('Interrogation', 'cool'), ('Intimidate', 'cool'), ('Oratory', 'cool'),
    ('Resist Torture/Drugs', 'cool'), ('Streetwise', 'cool'),
    ('Human Perception', 'emp'), ('Interview', 'emp'), ('Leadership', 'emp'),
    ('Seduction', 'emp'), ('Social', 'emp'), ('Persuasion & Fast Talk', 'emp'), ('Perform', 'emp'),
    ('Accounting', 'int'), ('Anthropology', 'int'), ('Awareness/Notice', 'int'), ('Biology', 'int'),
    ('Botany', 'int'), ('Chemistry', 'int'), ('Composition', 'int'), ('Diagnose Illness', 'int'),
    ('Education & Gen. Know', 'int'), ('Expert', 'int'), ('Gamble', 'int'), ('Geology', 'int'),
    ('Hide/Evade', 'int'), ('History', 'int'), ('Know Language', 'int'), ('Library Search', 'int'),
    ('Mathematics', 'int'), ('Physics', 'int'), ('Programming', 'int'), ('Shadow/Track', 'int'),
    ('Stock Market', 'int'), ('System Knowledge', 'int'), ('Teaching', 'int'),
    ('Wilderness Survival', 'int'), ('Zoology', 'int'),
    ('Archery', 'ref'), ('Athletics', 'ref'), ('Brawling', 'ref'), ('Dance', 'ref'),
    ('Dodge & Escape', 'ref'), ('Driving', 'ref'), ('Fencing', 'ref'), ('Handgun', 'ref'),
    ('Heavy Weapons', 'ref'), ('Martial Arts', 'ref'), ('Melee', 'ref'), ('Motorcycle', 'ref'),
    ('Operate Hvy. Machinery', 'ref'), ('Pilot (Gyro)', 'ref'), ('Pilot (Fixed Wing)', 'ref'),
    ('Pilot (Dirigible)', 'ref'), ('Pilot (Vect. Thrust)', 'ref'), ('Rifle', 'ref'),
    ('Stealth', 'ref'), ('Submachinegun', 'ref'),
    ('Aero Tech', 'tech'), ('AV Tech', 'tech'), ('Basic Tech', 'tech'), ('Cryotank Operation', 'tech'),
    ('Cyberdeck Design', 'tech'), ('CyberTech', 'tech'), ('Demolitions', 'tech'), ('Disguise', 'tech'),
    ('Electronics', 'tech'), ('Elect. Security', 'tech'), ('First Aid', 'tech'), ('Forgery', 'tech'),
    ('Gyro Tech', 'tech'), ('Paint or Draw', 'tech'), ('Photo & Film', 'tech'),
    ('Pharmaceuticals', 'tech'), ('Pick Lock', 'tech'), ('Pick Pocket', 'tech'),
    ('Play Instrument', 'tech'), ('Weaponsmith', 'tech');


-- ---------------------------------------------------------------------
-- Part 2: demo data
-- IDs are written out explicitly so the rows below can refer to them.
-- ---------------------------------------------------------------------
INSERT INTO users (user_id, username) VALUES
    (1, 'gm_vesemir'),
    (2, 'player_ciri'),
    (3, 'player_lambert'),
    (4, 'outsider_zoltan');

INSERT INTO game_sessions (session_id, join_code, game_type, session_name, gm_id) VALUES
    (1, 'KMR7Q2', 'witcher',   'Winter at Kaer Morhen', 1),
    (2, 'NC2020', 'cyberpunk', 'Night City Run',        3),
    (3, 'CHGNYT', 'vtm',       'Chicago by Night',      1);

INSERT INTO session_players (user_id, session_id) VALUES
    (2, 1),   -- Ciri plays in the Witcher session
    (3, 1),   -- Lambert plays in the Witcher session ...
    (2, 2),   -- ... while Ciri also plays in Lambert's Cyberpunk session
    (2, 3);   -- ... and in Vesemir's Vampire session (her 3rd = the maximum)

INSERT INTO characters (char_id, owner_id, session_id, name, age, gender, lore, lore_visible) VALUES
    (1, 2, 1, 'Zireael', 21, 'female',
        'Trained in a witcher keep, though no mutations. Hunted across the Continent.',
        FALSE),   -- private lore
    (2, 3, 1, 'Lambert', 64, 'male',
        'Sharp-tongued witcher of the Wolf School. Says what everyone else is thinking.',
        TRUE),    -- shared lore
    (3, 2, 3, 'Mara Voss', 34, 'female',
        'Night-shift phlebotomist at Cook County. Embraced in the blood bank fridge room.',
        FALSE);

INSERT INTO witcher_characters
    (char_id, race, profession, homeland, social_standing, reputation, lifepath,
     stat_int, stat_ref, stat_dex, stat_body, stat_spd, stat_emp, stat_cra, stat_will, stat_luck, coin)
VALUES
    (1, 'human',   'man_at_arms', 'Cintra',  'Equal',    0, 'Noble family, lost in war.',
     6, 8, 8, 6, 7, 5, 4, 7, 6, 250),
    (2, 'witcher', 'witcher',     'Kaedwen', 'Hated & Feared', 1, 'Taken to Kaer Morhen as a child.',
     6, 9, 8, 8, 7, 3, 5, 6, 5, 180);

INSERT INTO witcher_character_skills (char_id, skill_name, level) VALUES
    (1, 'Swordsmanship',  6),
    (1, 'Dodge/Escape',   5),
    (1, 'Athletics',      4),
    (1, 'Riding',         3),
    (2, 'Swordsmanship',  6),
    (2, 'Alchemy',        4),
    (2, 'Monster Lore',   5),
    (2, 'Intimidation',   4);


-- Ciri's Vampire character: Tremere, Consensualist predator.
-- Attributes follow the V5 spread exactly: one 4, three 3, four 2, one 1.
INSERT INTO vtm_characters
    (char_id, clan, concept, ambition, desire, sect, sire, generation, blood_potency,
     predator_type, humanity,
     attr_strength, attr_dexterity, attr_stamina, attr_charisma, attr_manipulation,
     attr_composure, attr_intelligence, attr_wits, attr_resolve,
     convictions, touchstones, advantages, flaws)
VALUES
    (3, 'tremere', 'Night-shift phlebotomist', 'Find out who ordered my Embrace',
     'Sleep through one quiet day', 'Camarilla', 'Dr. Edmund Hale', 12, 1,
     'consensualist', 8,
     1, 2, 2, 2, 2, 3, 4, 3, 3,
     'Never take blood from someone who did not agree.',
     'Ruth Okafor, the night nurse who covers for her.',
     'Herd 2, Resources 1, Haven 2, Linguistics 1, Allies 1',
     'Dark Secret: Masquerade breacher 1, Prey Exclusion: non-consenting 1, Obvious Predator 2');

INSERT INTO vtm_character_skills (char_id, skill_name, level, specialty) VALUES
    (3, 'Medicine', 3, 'Phlebotomy'),
    (3, 'Occult', 3, NULL),
    (3, 'Investigation', 3, NULL),
    (3, 'Awareness', 2, NULL),
    (3, 'Persuasion', 2, NULL),
    (3, 'Science', 2, 'Hematology'),
    (3, 'Insight', 2, NULL),
    (3, 'Stealth', 2, NULL),
    (3, 'Academics', 1, 'Medical history'),
    (3, 'Etiquette', 1, NULL),
    (3, 'Larceny', 1, NULL),
    (3, 'Drive', 1, NULL),
    (3, 'Subterfuge', 1, NULL),
    (3, 'Technology', 1, NULL),
    (3, 'Athletics', 1, NULL);

INSERT INTO vtm_character_disciplines (char_id, discipline, level) VALUES
    (3, 'Blood Sorcery', 2),
    (3, 'Auspex', 2);   -- 1 from clan + 1 from the Consensualist predator type

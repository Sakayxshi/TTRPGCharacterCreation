// =====================================================================
// witcherHelp.js - short explanations shown by the "?" buttons
// Written in our own words from The Witcher TRPG core rulebook.
// Keys match witcherRules.js and the witcher_skills table.
// =====================================================================

export const STAT_HELP = {
  int: "Intelligence: book smarts, memory and noticing things. Used for knowledge skills like Monster Lore and Deduction.",
  ref: "Reflexes: how fast you react. Every melee weapon skill and dodging runs on REF.",
  dex: "Dexterity: hand-eye coordination. Ranged weapons, Athletics and Stealth run on DEX.",
  body: "Body: strength and toughness. Together with WILL it sets your Health, Stamina and how much you can carry.",
  spd: "Speed: how fast you move. Sets how far you can run and leap in one turn.",
  emp: "Empathy: reading and charming people. Social skills like Persuasion and Charisma run on EMP.",
  cra: "Craft: working with your hands. Crafting, Alchemy, First Aid and lockpicking run on CRA.",
  will: "Will: mental strength. Magic, Courage and resisting fear or control run on WILL, and it adds to Health and Stamina.",
  luck: "Luck: a pool of points you can spend to add to any roll. It refills each game session.",
};

export const DERIVED_HELP = {
  HP: "Health Points: how much damage you can take. At 0 you are dying. (BODY + WILL) / 2 x 5.",
  STA: "Stamina: spent on extra actions, casting spells and running. Same formula as HP.",
  REC: "Recovery: how much Health and Stamina you get back each turn you rest. (BODY + WILL) / 2.",
  STUN: "Stun: the number you roll under to avoid being stunned when hit hard. Capped at 10, shown x10.",
  RUN: "Run: metres you can move in one turn when you spend your action running. SPD x 3.",
  LEAP: "Leap: metres you can jump with a running start. RUN / 5.",
  ENC: "Encumbrance: kilograms you can carry before you slow down. BODY x 10 (dwarves +25).",
  PUNCH: "Damage of an unarmed punch, based on BODY.",
  KICK: "Damage of a kick, based on BODY. Kicks hit harder but are easier to see coming.",
  VIGOR: "Vigor: how much magic you can channel safely each round. Only mages, priests and witchers have any.",
  CROWNS: "Starting money in crowns, rolled once from your profession.",
};

export const SKILL_HELP = {
  // INT
  "Awareness": "Noticing things: ambushes, hidden doors, someone following you.",
  "Business": "Trading, haggling and running a shop or deal.",
  "Deduction": "Putting clues together to work out what happened.",
  "Education": "General schooling: history, maths, reading and writing.",
  "Language: Nordling": "Speaking and reading the Common Speech of the Northern Kingdoms.",
  "Language: Elder Speech": "Speaking and reading the old elven tongue, also used in magic.",
  "Language: Dwarven": "Speaking and reading the dwarves' language.",
  "Monster Lore": "Knowing monsters: their weaknesses, habits and how to kill them.",
  "Social Etiquette": "Behaving properly at court, at a feast or in a temple.",
  "Streetwise": "Finding your way in a city's underworld: fences, rumours, safe houses.",
  "Tactics": "Planning battles and reading an enemy's formation.",
  "Teaching": "Passing a skill on to someone else.",
  "Wilderness Survival": "Tracking, hunting, foraging and finding shelter outside towns.",
  // REF
  "Brawling": "Fighting with fists, feet and dirty tricks.",
  "Dodge/Escape": "Getting out of the way of attacks and slipping out of grapples.",
  "Melee": "Fighting with axes, maces, hammers and clubs.",
  "Riding": "Controlling a horse, including in combat or a chase.",
  "Sailing": "Steering and crewing a boat.",
  "Small Blades": "Fighting with daggers and knives.",
  "Staff/Spear": "Fighting with staves, spears and polearms.",
  "Swordsmanship": "Fighting with swords, from short swords to two-handers.",
  // DEX
  "Archery": "Shooting bows.",
  "Athletics": "Climbing, jumping, swimming and throwing things.",
  "Crossbow": "Shooting crossbows.",
  "Sleight of Hand": "Pickpocketing, palming objects and small tricks of the hand.",
  "Stealth": "Moving without being seen or heard.",
  // BODY
  "Physique": "Raw strength: lifting, pushing, breaking doors.",
  "Endurance": "Holding out against poison, drink, cold and exhaustion.",
  // EMP
  "Charisma": "Being likeable and making a good first impression.",
  "Deceit": "Lying convincingly.",
  "Fine Arts": "Painting, sculpting and judging art.",
  "Gambling": "Playing dice poker, Gwent and other games of chance.",
  "Grooming and Style": "Looking good and dressing for the occasion.",
  "Human Perception": "Reading people: spotting lies and hidden feelings.",
  "Leadership": "Leading a group and keeping it together.",
  "Persuasion": "Talking people into things with arguments.",
  "Performance": "Singing, acting, playing music.",
  "Seduction": "Attracting someone romantically.",
  // CRA
  "Alchemy": "Brewing potions, oils and bombs from formulae.",
  "Crafting": "Forging and repairing weapons, armour and tools from diagrams.",
  "Disguise": "Changing your look so people don't recognise you.",
  "First Aid": "Stopping bleeding and treating wounds in the field.",
  "Forgery": "Faking documents, seals and signatures.",
  "Pick Lock": "Opening locks without the key.",
  "Trap Crafting": "Building and setting traps.",
  // WILL
  "Courage": "Standing your ground against fear and terrifying monsters.",
  "Hex Weaving": "Placing and lifting curses.",
  "Intimidation": "Scaring people into doing what you want.",
  "Spell Casting": "Casting spells and witcher Signs.",
  "Resist Magic": "Shaking off spells aimed at your mind or body.",
  "Resist Coercion": "Resisting torture, threats and persuasion.",
  "Ritual Crafting": "Performing long magical rituals.",
  // defining skills (one per profession)
  "Busking": "Bard. Perform in the street for coin; the higher the roll, the more you earn.",
  "Patch Job": "Craftsman. Quickly repair a broken weapon or armour so it works for now.",
  "Practiced Paranoia": "Criminal. You automatically get a roll to notice traps and ambushes before they spring.",
  "Healing Hands": "Doctor. Real surgery: you can treat critical wounds that First Aid cannot.",
  "Magic Training": "Mage. Your academy schooling: identify spells, magical places and phenomena.",
  "Tough As Nails": "Man at Arms. Keep fighting below 0 Health instead of falling unconscious.",
  "Well Traveled": "Merchant. You have been everywhere: recall facts about places, people and goods.",
  "Initiate of the Gods": "Priest. Your faith: lead worshippers and call on your god's teachings.",
  "Witcher Training": "Witcher. Keep fighting and reacting even when hurt, and know the witcher trade.",
};

export const RACE_HELP = {
  human: "The most common people of the Continent. Their perks help with other humans and with stubbornness.",
  elf: "The Aen Seidhe. Natural archers and artists, close to nature. Often hated in the North.",
  dwarf: "Tough and strong craftsfolk from Mahakam. Good at business and hard to hurt.",
  witcher: "A mutated monster hunter. Fast and resilient, but feared nearly everywhere. Can only take the Witcher profession.",
};

export const UPBRINGING = {
  "Aristocracy": "Raised among nobles: fine manners, a good education, and rivals at court.",
  "Merchant family": "Grew up around trade. You know what things are worth, and what people want.",
  "Craftsmen": "A workshop childhood: practical, hard-working and handy with tools.",
  "Peasants": "Village life: hard work, simple food and a healthy fear of what lives in the woods.",
  "Soldiers": "An army family: discipline, drills and stories of old wars.",
  "Scholars": "Raised among books and teachers at an academy or temple school.",
  "Clergy": "Brought up in a temple, surrounded by priests and faith.",
  "Street orphan": "No family. You survived on the streets by wits and luck.",
};

export const POOL_NOTES = {
  60: "Ordinary people of the Continent.",
  70: "Capable adventurers. The usual choice for a new party.",
  75: "Above-average heroes.",
  80: "Legendary figures, on the level of Geralt or Yennefer.",
};

export const VIGOR_NOTES = {
  0: "No magic. This profession can't cast spells.",
  2: "A little magic: witcher Signs or priestly invocations.",
  5: "A trained spellcaster: mages can channel the most chaos.",
};

export const TEXT = {
  defining: "Your profession's special skill. Only that profession has it, and it starts at least at 1.",
  vigor: "How much magic you can channel safely each round. 0 means you can't cast magic.",
  pool: "How many points you split between the nine statistics. Your GM decides; 70 is a normal hero.",
  roll: "Roll 1d10 for each statistic instead of spending points (low rolls are rerolled). You only get one roll.",
  race: "Some races change statistics after you assign them. Witchers get +1 REF, +1 DEX and -4 EMP.",
  profSkills: "44 points to spend on your defining skill and your profession's skill package. Each skill starts at 1 and can go up to 6.",
  pickup: "Extra skills learned along the way. You get INT + REF points. You can leave some unspent.",
  standing: "How people in that region treat you: Equal, Tolerated, Hated, or Hated & Feared. It changes prices and reactions.",
  homeland: "Where you grew up. Together with your race it decides your social standing.",
  coin: "You roll once. There are no rerolls, so what you get is what you start with.",
  gear: "Pick your starting equipment from your profession's list.",
};

// =====================================================================
// witcherRules.js - rule data for the Witcher creator
// Source: The Witcher TRPG core rulebook (R. Talsorian Games / CD PROJEKT),
// pp. 22-50 and 71. Descriptions are short paraphrases, not quotes.
// Skill names match the witcher_skills table in sql/02_seed.sql exactly.
// =====================================================================

export const STATS = [
  { key: "int", label: "INT", name: "Intelligence" },
  { key: "ref", label: "REF", name: "Reflexes" },
  { key: "dex", label: "DEX", name: "Dexterity" },
  { key: "body", label: "BODY", name: "Body" },
  { key: "spd", label: "SPD", name: "Speed" },
  { key: "emp", label: "EMP", name: "Empathy" },
  { key: "cra", label: "CRA", name: "Craft" },
  { key: "will", label: "WILL", name: "Will" },
  { key: "luck", label: "LUCK", name: "Luck" },
];

// skill_name -> [base stat, cost]   (cost 2 = difficult skill)
export const SKILLS = {
  "Awareness": ["int", 1], "Business": ["int", 1], "Deduction": ["int", 1],
  "Education": ["int", 1], "Language: Nordling": ["int", 2],
  "Language: Elder Speech": ["int", 2], "Language: Dwarven": ["int", 2],
  "Monster Lore": ["int", 2], "Social Etiquette": ["int", 1], "Streetwise": ["int", 1],
  "Tactics": ["int", 2], "Teaching": ["int", 1], "Wilderness Survival": ["int", 1],
  "Brawling": ["ref", 1], "Dodge/Escape": ["ref", 1], "Melee": ["ref", 1],
  "Riding": ["ref", 1], "Sailing": ["ref", 1], "Small Blades": ["ref", 1],
  "Staff/Spear": ["ref", 1], "Swordsmanship": ["ref", 1],
  "Archery": ["dex", 1], "Athletics": ["dex", 1], "Crossbow": ["dex", 1],
  "Sleight of Hand": ["dex", 1], "Stealth": ["dex", 1],
  "Physique": ["body", 1], "Endurance": ["body", 1],
  "Charisma": ["emp", 1], "Deceit": ["emp", 1], "Fine Arts": ["emp", 1],
  "Gambling": ["emp", 1], "Grooming and Style": ["emp", 1], "Human Perception": ["emp", 1],
  "Leadership": ["emp", 1], "Persuasion": ["emp", 1], "Performance": ["emp", 1],
  "Seduction": ["emp", 1],
  "Alchemy": ["cra", 2], "Crafting": ["cra", 2], "Disguise": ["cra", 1],
  "First Aid": ["cra", 1], "Forgery": ["cra", 1], "Pick Lock": ["cra", 1],
  "Trap Crafting": ["cra", 2],
  "Courage": ["will", 1], "Hex Weaving": ["will", 2], "Intimidation": ["will", 1],
  "Spell Casting": ["will", 2], "Resist Magic": ["will", 2], "Resist Coercion": ["will", 1],
  "Ritual Crafting": ["will", 2],
};

export const LANGUAGES = ["Language: Nordling", "Language: Elder Speech", "Language: Dwarven"];
export const COMBAT_SKILLS = ["Archery", "Brawling", "Crossbow", "Melee", "Small Blades", "Staff/Spear", "Swordsmanship"];

export const RACES = {
  human: {
    name: "Human",
    blurb: "The dominant people of the Continent: varied, stubborn and resourceful.",
    perks: [
      ["Trustworthy", "+1 to Charisma, Seduction and Persuasion with other humans."],
      ["Ingenuity", "+1 to Deduction."],
      ["Blindly Stubborn", "Reroll a failed Courage or Resist Coercion check, three times per session."],
    ],
  },
  elf: {
    name: "Elf",
    blurb: "Elder folk with a deep bond to nature, art and the bow.",
    perks: [
      ["Artistic", "+1 to Fine Arts."],
      ["Marksman", "+2 to Archery; draw and string a bow without an action."],
      ["Natural Attunement", "Beasts are friendly unless provoked; common plants are found automatically."],
    ],
  },
  dwarf: {
    name: "Dwarf",
    blurb: "Mountain folk with tough skin, strong backs and a sharp eye for value.",
    perks: [
      ["Tough", "Natural stopping power 2 on the skin."],
      ["Strong", "+1 to Physique and +25 Encumbrance."],
      ["Crafter's Eye", "+1 to Business."],
    ],
  },
  witcher: {
    name: "Witcher",
    blurb: "Mutated monster hunters: fast, resilient, and distrusted almost everywhere.",
    perks: [
      ["Enhanced Senses", "No dim-light penalties, +1 Awareness, track by scent."],
      ["Resilient Mutation", "Immune to disease; can use mutagens."],
      ["Lightning Reflexes", "+1 REF and +1 DEX, even above 10."],
      ["Dulled Emotions", "Immune to Intimidation, but -4 EMP (minimum 1)."],
    ],
  },
};

// Racial stat modifiers applied on top of the points the player assigns
export const RACE_STAT_MODS = {
  witcher: { ref: 1, dex: 1, emp: -4 },
};

export const PROFESSIONS = {
  bard: {
    name: "Bard", defining: "Busking", vigor: 0, coinBase: 120,
    blurb: "Poets, performers and spies who talk their way into any room.",
    skills: ["Charisma", "Deceit", "Performance", "Human Perception", "Persuasion",
             "Streetwise", "Fine Arts", "Seduction", "Social Etiquette"],
    languages: 1,
    gear: { pick: 5, items: ["Dice poker board", "Gwent deck", "Hand mirror", "An instrument",
      "Flask of spirits", "Dagger", "Perfume/cologne", "Belt pouch", "Garter sheath", "A journal with a lock"] },
  },
  craftsman: {
    name: "Craftsman", defining: "Patch Job", vigor: 0, coinBase: 120,
    blurb: "Smiths and alchemists who can fix, forge or brew almost anything.",
    skills: ["Crafting", "Business", "Athletics", "Endurance", "Physique", "Streetwise",
             "Fine Arts", "Alchemy", "Education", "Persuasion"],
    gear: { pick: 5, items: ["Tinker's forge", "Merchant's tools", "Iron long sword", "Forging tools",
      "Alchemy set", "Hourglass", "Small chest", "Mace", "50 crowns of components", "Lock"] },
  },
  criminal: {
    name: "Criminal", defining: "Practiced Paranoia", vigor: 0, coinBase: 100,
    blurb: "Thieves, smugglers and assassins who always see the trap first.",
    skills: ["Sleight of Hand", "Pick Lock", "Streetwise", "Forgery", "Deceit", "Stealth",
             "Intimidation", "Small Blades", "Athletics", "Awareness"],
    gear: { pick: 5, items: ["Loaded dice", "Bullseye lantern", "Secret pocket", "Thieves' tools",
      "Sleeve sheath", "Stiletto", "Brass knuckles", "Throwing knives x5", "Chloroform", "Satchel"] },
  },
  doctor: {
    name: "Doctor", defining: "Healing Hands", vigor: 0, coinBase: 150,
    blurb: "Surgeons and herbalists who pull people back from death's door.",
    skills: ["Resist Coercion", "Charisma", "Social Etiquette", "Courage", "Human Perception",
             "Wilderness Survival", "Business", "Deduction", "Small Blades", "Alchemy"],
    gear: { pick: 5, items: ["Clotting powder x10", "Sterilizing fluid x10", "Numbing herbs x10",
      "Surgeon's kit", "Writing kit", "Hourglass", "Candles x10", "Blanket", "Large tent", "Dagger"] },
  },
  mage: {
    name: "Mage", defining: "Magic Training", vigor: 5, coinBase: 200,
    blurb: "Academy-trained channellers of chaos. Powerful, political, feared.",
    skills: ["Human Perception", "Spell Casting", "Hex Weaving", "Resist Magic", "Staff/Spear",
             "Education", "Ritual Crafting", "Social Etiquette", "Seduction", "Grooming and Style"],
    magicOnly: true,
    gear: { pick: 5, items: ["Hourglass", "Makeup kit", "Belt pouch", "Writing kit", "Hand mirror",
      "Dagger", "Staff", "Garter sheath", "Journal"] },
  },
  man_at_arms: {
    name: "Man at Arms", defining: "Tough As Nails", vigor: 0, coinBase: 150,
    blurb: "Soldiers, mercenaries and bodyguards who live for the fight.",
    skills: ["Wilderness Survival", "Courage", "Physique", "Intimidation", "Dodge/Escape"],
    combatChoices: 5,
    gear: { pick: 5, items: ["Kord", "Spear", "Battle axe", "Throwing knives x5", "Satchel",
      "Chain coif", "Brigandine", "Armored trousers", "Crossbow & bolts x20", "Steel buckler"] },
  },
  merchant: {
    name: "Merchant", defining: "Well Traveled", vigor: 0, coinBase: 180,
    blurb: "Traders who know where anything can be found, and for how much.",
    skills: ["Charisma", "Small Blades", "Education", "Streetwise", "Business", "Persuasion",
             "Human Perception", "Gambling", "Resist Coercion"],
    languages: 2,
    gear: { pick: 3, items: ["Writing kit", "Merchant's tools", "Large tent", "Journal",
      "Crossbow & bolts x20", "Dagger", "Cart", "A mule and a cart"] },
  },
  priest: {
    name: "Priest", defining: "Initiate of the Gods", vigor: 2, coinBase: 75,
    blurb: "Clergy and druids whose god (they insist) grants them power.",
    skills: ["Ritual Crafting", "Leadership", "Courage", "Human Perception", "Hex Weaving",
             "First Aid", "Charisma", "Wilderness Survival", "Teaching", "Spell Casting"],
    magicOnly: true,
    gear: { pick: 5, items: ["Holy symbol", "Sterilizing fluid x5", "Alchemy set", "Surgeon's kit",
      "Hourglass", "Dagger", "Staff", "Clotting powder x5", "Numbing herbs x5", "100 crowns of components"] },
  },
  witcher: {
    name: "Witcher", defining: "Witcher Training", vigor: 2, coinBase: 50,
    blurb: "Professional monster slayers, trained and mutated in the old keeps.",
    skills: ["Awareness", "Deduction", "Spell Casting", "Alchemy", "Dodge/Escape",
             "Wilderness Survival", "Swordsmanship", "Athletics", "Stealth", "Riding"],
    witcherOnly: true,
    gear: { pick: 2, items: ["Alchemy set", "A horse", "Throwing knives x5", "A hand crossbow",
      "Double woven gambeson"],
      fixed: ["Witcher medallion", "Witcher's steel sword", "Witcher's silver sword", "Potion formulae x2"] },
  },
};

// Which professions a race may take (rulebook: only witchers are witchers,
// only humans and elves can channel magic)
export function professionAllowed(race, profKey) {
  const p = PROFESSIONS[profKey];
  if (race === "witcher") return profKey === "witcher";
  if (p.witcherOnly) return false;
  if (p.magicOnly && !["human", "elf"].includes(race)) return false;
  return true;
}

// Homelands grouped by territory; territory decides social standing
export const HOMELANDS = {
  "The North": ["Redania", "Temeria", "Kaedwen", "Aedirn", "Lyria & Rivia", "Kovir & Poviss", "Cidaris", "Verden", "Cintra"],
  "Nilfgaard": ["The Heart of Nilfgaard", "Vicovaro", "Angren", "Nazair", "Mettina", "Mag Turga", "Gheso", "Ebbing", "Maecht", "Gemmera", "Etolia"],
  "Skellige": ["Skellige"],
  "Dol Blathanna": ["Dol Blathanna"],
  "Mahakam": ["Mahakam"],
};

const STANDING = {
  "The North":     { human: "Equal",     elf: "Hated", dwarf: "Tolerated", witcher: "Hated & Feared" },
  "Nilfgaard":     { human: "Equal",     elf: "Equal", dwarf: "Equal",     witcher: "Hated & Feared" },
  "Skellige":      { human: "Equal",     elf: "Equal", dwarf: "Equal",     witcher: "Tolerated" },
  "Dol Blathanna": { human: "Hated",     elf: "Equal", dwarf: "Equal",     witcher: "Tolerated" },
  "Mahakam":       { human: "Tolerated", elf: "Equal", dwarf: "Equal",     witcher: "Tolerated" },
};

export function territoryOf(homeland) {
  return Object.keys(HOMELANDS).find((t) => HOMELANDS[t].includes(homeland)) || null;
}

export function socialStanding(race, homeland) {
  const t = territoryOf(homeland);
  return t ? STANDING[t][race] : null;
}

export const STAT_POOLS = [
  { points: 60, label: "Average (60)" },
  { points: 70, label: "Skilled (70)" },
  { points: 75, label: "Heroes (75)" },
  { points: 80, label: "Legends (80)" },
];

export const PROFESSION_SKILL_POINTS = 44;
export const CREATION_SKILL_CAP = 6;

// Derived statistics (rulebook p. 48). Never stored in the database:
// they always follow from BODY, WILL, SPD and race.
export function derivedStats(s, race) {
  const bw = Math.floor((s.body + s.will) / 2);
  const run = s.spd * 3;
  const punchKick = [
    [2, "1d6-4", "1d6"], [4, "1d6-2", "1d6+2"], [6, "1d6", "1d6+4"], [8, "1d6+2", "1d6+6"],
    [10, "1d6+4", "1d6+8"], [12, "1d6+6", "1d6+10"], [99, "1d6+8", "1d6+12"],
  ].find(([max]) => s.body <= max);
  return {
    HP: bw * 5,
    STA: bw * 5,
    REC: bw,
    STUN: Math.min(bw, 10) * 10,
    RUN: run,
    LEAP: Math.floor(run / 5),
    ENC: s.body * 10 + (race === "dwarf" ? 25 : 0),
    PUNCH: punchKick[1],
    KICK: punchKick[2],
  };
}

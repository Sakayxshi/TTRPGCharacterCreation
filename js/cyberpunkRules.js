// =====================================================================
// cyberpunkRules.js - rule data for the Cyberpunk 2020 creator
// Source: Cyberpunk 2020 (2nd edition, revised), "Getting Cyberpunk"
// (pp. 25-58). Descriptions are short paraphrases. Skill names match
// sql/02_seed.sql exactly.
// =====================================================================

export const STATS = [
  { key: "int", label: "INT", name: "Intelligence" },
  { key: "ref", label: "REF", name: "Reflexes" },
  { key: "tech", label: "TECH", name: "Technical Ability" },
  { key: "cool", label: "COOL", name: "Cool" },
  { key: "attr", label: "ATTR", name: "Attractiveness" },
  { key: "luck", label: "LUCK", name: "Luck" },
  { key: "ma", label: "MA", name: "Movement Allowance" },
  { key: "body", label: "BODY", name: "Body Type" },
  { key: "emp", label: "EMP", name: "Empathy" },
];

// Character points (p. 25): Cinematic option, set by the Referee
export const POINT_OPTIONS = [
  { points: 50, label: "Average (50)" },
  { points: 60, label: "Minor supporting character (60)" },
  { points: 70, label: "Major supporting character (70)" },
  { points: 75, label: "Minor hero (75)" },
  { points: 80, label: "Major hero (80)" },
];

export const SKILLS = {
  special: ["Authority", "Charismatic Leadership", "Combat Sense", "Credibility", "Family",
    "Interface", "Jury Rig", "Medical Tech", "Resources", "Streetdeal"],
  attr: ["Personal Grooming", "Wardrobe & Style"],
  body: ["Endurance", "Strength Feat", "Swimming"],
  cool: ["Interrogation", "Intimidate", "Oratory", "Resist Torture/Drugs", "Streetwise"],
  emp: ["Human Perception", "Interview", "Leadership", "Seduction", "Social", "Persuasion & Fast Talk", "Perform"],
  int: ["Accounting", "Anthropology", "Awareness/Notice", "Biology", "Botany", "Chemistry", "Composition",
    "Diagnose Illness", "Education & Gen. Know", "Expert", "Gamble", "Geology", "Hide/Evade", "History",
    "Know Language", "Library Search", "Mathematics", "Physics", "Programming", "Shadow/Track",
    "Stock Market", "System Knowledge", "Teaching", "Wilderness Survival", "Zoology"],
  ref: ["Archery", "Athletics", "Brawling", "Dance", "Dodge & Escape", "Driving", "Fencing", "Handgun",
    "Heavy Weapons", "Martial Arts", "Melee", "Motorcycle", "Operate Hvy. Machinery", "Pilot (Gyro)",
    "Pilot (Fixed Wing)", "Pilot (Dirigible)", "Pilot (Vect. Thrust)", "Rifle", "Stealth", "Submachinegun"],
  tech: ["Aero Tech", "AV Tech", "Basic Tech", "Cryotank Operation", "Cyberdeck Design", "CyberTech",
    "Demolitions", "Disguise", "Electronics", "Elect. Security", "First Aid", "Forgery", "Gyro Tech",
    "Paint or Draw", "Photo & Film", "Pharmaceuticals", "Pick Lock", "Pick Pocket", "Play Instrument", "Weaponsmith"],
};
export const STAT_GROUP_NAMES = {
  special: "Special ability", attr: "Attractiveness", body: "Body", cool: "Cool / Will", emp: "Empathy",
  int: "Intelligence", ref: "Reflexes", tech: "Tech",
};
export const statOf = (skill) => Object.keys(SKILLS).find((k) => SKILLS[k].includes(skill));

// Career skill packages (p. 44). `choose` = pick N from `from`.
export const ROLES = {
  rockerboy: {
    name: "Rockerboy", special: "Charismatic Leadership",
    blurb: "Rebel musicians who use the stage to start fires.",
    skills: ["Awareness/Notice", "Perform", "Wardrobe & Style", "Composition", "Brawling",
      "Play Instrument", "Streetwise", "Persuasion & Fast Talk", "Seduction"],
    salary: [1000, 1500, 2000, 5000, 8000, 12000],
  },
  solo: {
    name: "Solo", special: "Combat Sense",
    blurb: "Hired guns, bodyguards and assassins. Chrome and reflexes.",
    skills: ["Awareness/Notice", "Handgun", "Melee", "Weaponsmith", "Rifle", "Athletics", "Submachinegun", "Stealth"],
    choose: { n: 1, from: ["Brawling", "Martial Arts"], label: "Brawling or Martial Arts" },
    salary: [2000, 3000, 4500, 7000, 9000, 12000],
  },
  netrunner: {
    name: "Netrunner", special: "Interface",
    blurb: "Hackers who jack into the Net and crack data fortresses.",
    skills: ["Awareness/Notice", "Basic Tech", "Education & Gen. Know", "System Knowledge", "CyberTech",
      "Cyberdeck Design", "Composition", "Electronics", "Programming"],
    salary: [1000, 2000, 3000, 5000, 7000, 10000],
  },
  techie: {
    name: "Techie", special: "Jury Rig",
    blurb: "Renegade mechanics who can fix or build anything.",
    skills: ["Awareness/Notice", "Basic Tech", "CyberTech", "Teaching", "Education & Gen. Know", "Electronics"],
    choose: { n: 3, from: ["Aero Tech", "AV Tech", "Gyro Tech", "Weaponsmith", "Elect. Security", "Demolitions"], label: "three other Tech skills" },
    salary: [1000, 2000, 3000, 4000, 5000, 8000],
  },
  medtechie: {
    name: "Medtechie", special: "Medical Tech",
    blurb: "Street doctors and ripperdocs who keep people alive.",
    skills: ["Awareness/Notice", "Basic Tech", "Diagnose Illness", "Education & Gen. Know", "Cryotank Operation",
      "Library Search", "Pharmaceuticals", "Zoology", "Human Perception"],
    salary: [1600, 3000, 5000, 7000, 10000, 15000],
  },
  media: {
    name: "Media", special: "Credibility",
    blurb: "Reporters who expose the corps, if they live long enough.",
    skills: ["Awareness/Notice", "Composition", "Education & Gen. Know", "Persuasion & Fast Talk",
      "Human Perception", "Social", "Streetwise", "Photo & Film", "Interview"],
    salary: [1000, 1200, 3000, 5000, 7000, 10000],
  },
  cop: {
    name: "Cop", special: "Authority",
    blurb: "Law in a lawless city. Badge, gun, and not much backup.",
    skills: ["Awareness/Notice", "Handgun", "Human Perception", "Athletics", "Education & Gen. Know",
      "Brawling", "Melee", "Interrogation", "Streetwise"],
    salary: [1000, 1200, 3000, 5000, 7000, 9000],
  },
  corporate: {
    name: "Corporate", special: "Resources",
    blurb: "Ambitious executives who command money and people.",
    skills: ["Awareness/Notice", "Human Perception", "Education & Gen. Know", "Library Search", "Social",
      "Persuasion & Fast Talk", "Stock Market", "Wardrobe & Style", "Personal Grooming"],
    salary: [1500, 3000, 5000, 7000, 9000, 12000],
  },
  fixer: {
    name: "Fixer", special: "Streetdeal",
    blurb: "Deal-makers and smugglers who can get you anything.",
    skills: ["Awareness/Notice", "Forgery", "Handgun", "Brawling", "Melee", "Pick Lock", "Pick Pocket",
      "Intimidate", "Persuasion & Fast Talk"],
    salary: [1500, 3000, 5000, 7000, 8000, 10000],
  },
  nomad: {
    name: "Nomad", special: "Family",
    blurb: "Road warriors of the wandering clans.",
    skills: ["Awareness/Notice", "Endurance", "Melee", "Rifle", "Driving", "Basic Tech",
      "Wilderness Survival", "Brawling", "Athletics"],
    salary: [1000, 1500, 2000, 3000, 4000, 5000],
  },
};

export const CAREER_POINTS = 40;

// Monthly salary column from the Special Ability level (p. 58)
export function monthlySalary(role, specialLevel) {
  const col = specialLevel <= 5 ? 0 : Math.min(specialLevel, 10) - 5;
  return ROLES[role].salary[col];
}

// Body Type Modifier (p. 103)
export function btm(body) {
  if (body <= 2) return { type: "Very weak", btm: 0 };
  if (body <= 4) return { type: "Weak", btm: -1 };
  if (body <= 7) return { type: "Average", btm: -2 };
  if (body <= 9) return { type: "Strong", btm: -3 };
  if (body === 10) return { type: "Very strong", btm: -4 };
  return { type: "Superhuman", btm: -5 };
}

export function derived(s) {
  const run = s.ma * 3;
  return {
    RUN: `${run} m`,
    LEAP: `${Math.floor(run / 4)} m`,
    CARRY: `${s.body * 10} kg`,
    LIFT: `${s.body * 40} kg`,
    SAVE: s.body,
    BTM: btm(s.body).btm,
    HUMANITY: s.emp * 10,
  };
}

// Lifepath (pp. 34-37)
export const STYLE = {
  clothes: ["Biker leathers", "Blue jeans", "Corporate suits", "Jumpsuits", "Miniskirts", "High fashion",
    "Cammos", "Normal clothes", "Nude", "Bag lady chic"],
  hair: ["Mohawk", "Long & ratty", "Short & spiked", "Wild & all over", "Bald", "Striped", "Tinted",
    "Neat, short", "Short, curly", "Long, straight"],
  affectations: ["Tattoos", "Mirrorshades", "Ritual scars", "Spiked gloves", "Nose rings", "Earrings",
    "Long fingernails", "Spike heeled boots", "Weird contact lenses", "Fingerless gloves"],
};
export const ETHNICITIES = ["Anglo-American", "African", "Japanese / Korean", "Central European / Soviet",
  "Pacific Islander", "Chinese / Southeast Asian", "Black American", "Hispanic American",
  "Central / South American", "European"];
// Languages that go with each ethnic origin (Lifepath)
export const LANGUAGES = {
  "Anglo-American": ["English"],
  "African": ["Bantu", "Fanti", "Kongo", "Ganda", "Maasai", "Swahili"],
  "Japanese / Korean": ["Japanese", "Korean"],
  "Central European / Soviet": ["Bulgarian", "Russian", "Czech", "Polish", "Ukrainian", "Slovak"],
  "Pacific Islander": ["Micronesian", "Tagalog", "Polynesian", "Malay", "Indonesian", "Hawaiian"],
  "Chinese / Southeast Asian": ["Burmese", "Cantonese", "Mandarin", "Thai", "Tibetan", "Vietnamese"],
  "Black American": ["English", "Blackfolk"],
  "Hispanic American": ["Spanish", "English"],
  "Central / South American": ["Spanish", "Portuguese"],
  "European": ["English", "French", "German", "Italian", "Spanish"],
};
export const POINT_NOTES = {
  50: "An ordinary person on the street.",
  60: "A side character: capable, but not the star.",
  70: "An important side character in the story.",
  75: "A starting hero. A common choice for a new crew.",
  80: "A top-tier main character.",
};

export const MOTIVATIONS = {
  trait: ["Shy and secretive", "Rebellious, antisocial, violent", "Arrogant, proud and aloof",
    "Moody, rash and headstrong", "Picky, fussy and nervous", "Stable and serious", "Silly and fluffheaded",
    "Sneaky and deceptive", "Intellectual and detached", "Friendly and outgoing"],
  person: ["A parent", "Brother or sister", "Lover", "Friend", "Yourself", "A pet", "Teacher or mentor",
    "Public figure", "A personal hero", "No one"],
  value: ["Money", "Honor", "Your word", "Honesty", "Knowledge", "Vengeance", "Love", "Power",
    "Having a good time", "Friendship"],
  people: ["Neutral", "I like almost everyone", "I hate almost everyone", "People are tools",
    "Every person is a valuable individual", "People are obstacles to be destroyed if they cross me",
    "People are untrustworthy", "Wipe 'em all out", "People are wonderful"],
  possession: ["A weapon", "A tool", "A piece of clothing", "A photograph", "A book or diary", "A recording",
    "A musical instrument", "A piece of jewelry", "A toy", "A letter"],
};
export const MOTIVATION_LABELS = {
  trait: "Personality", person: "Person you value most", value: "What you value most",
  people: "How you feel about most people", possession: "Most valued possession",
};

export const d = (sides) => 1 + Math.floor(Math.random() * sides);

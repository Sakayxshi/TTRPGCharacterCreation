// =====================================================================
// vtmRules.js - rule data for the Vampire: The Masquerade creator
// Source: Vampire: The Masquerade 5th Edition core rulebook,
// "Character Creation" (pp. 134-182). Descriptions are short
// paraphrases, not quotes. Names match sql/02_seed.sql exactly.
// =====================================================================

export const ATTRIBUTES = {
  Physical: ["strength", "dexterity", "stamina"],
  Social: ["charisma", "manipulation", "composure"],
  Mental: ["intelligence", "wits", "resolve"],
};
export const ATTRIBUTE_SPREAD = [4, 3, 3, 3, 2, 2, 2, 2, 1];
export const cap = (s) => s[0].toUpperCase() + s.slice(1);

export const SKILLS = {
  Physical: ["Athletics", "Brawl", "Craft", "Drive", "Firearms", "Larceny", "Melee", "Stealth", "Survival"],
  Social: ["Animal Ken", "Etiquette", "Insight", "Intimidation", "Leadership", "Performance", "Persuasion", "Streetwise", "Subterfuge"],
  Mental: ["Academics", "Awareness", "Finance", "Investigation", "Medicine", "Occult", "Politics", "Science", "Technology"],
};

// How many skills at each level, per distribution
export const SKILL_DISTRIBUTIONS = {
  jack: { name: "Jack of all trades", spread: { 3: 1, 2: 8, 1: 10 }, text: "One at 3, eight at 2, ten at 1. Knows a little of everything." },
  balanced: { name: "Balanced", spread: { 3: 3, 2: 5, 1: 7 }, text: "Three at 3, five at 2, seven at 1." },
  specialist: { name: "Specialist", spread: { 4: 1, 3: 3, 2: 3, 1: 3 }, text: "One at 4, three at 3, three at 2, three at 1. Very good at a few things." },
};

export const CLANS = {
  brujah: {
    name: "Brujah", disciplines: ["Celerity", "Potence", "Presence"],
    blurb: "Rebels and firebrands, quick to anger and quicker to act.",
    bane: "Violent Temper: resisting fury frenzy is harder.",
  },
  gangrel: {
    name: "Gangrel", disciplines: ["Animalism", "Fortitude", "Protean"],
    blurb: "Feral wanderers closest to the Beast.",
    bane: "Bestial Features: frenzies leave animal traits behind.",
  },
  malkavian: {
    name: "Malkavian", disciplines: ["Auspex", "Dominate", "Obfuscate"],
    blurb: "Seers and madmen who hear what others cannot.",
    bane: "Fractured Perspective: a lasting mental affliction.",
  },
  nosferatu: {
    name: "Nosferatu", disciplines: ["Animalism", "Obfuscate", "Potence"],
    blurb: "Hideous information brokers of the sewers and the net.",
    bane: "Repulsiveness: they can never pass as human.",
  },
  toreador: {
    name: "Toreador", disciplines: ["Auspex", "Celerity", "Presence"],
    blurb: "Artists and aesthetes obsessed with beauty.",
    bane: "Aesthetic Fixation: ugly surroundings cost them dice.",
  },
  tremere: {
    name: "Tremere", disciplines: ["Auspex", "Blood Sorcery", "Dominate"],
    blurb: "Blood sorcerers whose old pyramid has fallen.",
    bane: "Deficient Blood: their vitae no longer binds others easily.",
  },
  ventrue: {
    name: "Ventrue", disciplines: ["Dominate", "Fortitude", "Presence"],
    blurb: "Aristocrats and executives who rule the night.",
    bane: "Rarefied Tastes: they can only feed from one kind of mortal.",
  },
  caitiff: {
    name: "Caitiff", disciplines: [],
    blurb: "Clanless outcasts. Distrusted, but free to learn anything.",
    bane: "Outcast: other Kindred look down on them.",
  },
  thin_blood: {
    name: "Thin-blood", disciplines: [],
    blurb: "Barely vampires: weak Blood, but closer to being human.",
    bane: "Thin Blood: no clan Disciplines; uses Thin-blood Alchemy instead.",
  },
};

export const ALL_DISCIPLINES = ["Animalism", "Auspex", "Blood Sorcery", "Celerity", "Dominate",
  "Fortitude", "Obfuscate", "Potence", "Presence", "Protean"];

export const DISCIPLINE_TEXT = {
  "Animalism": "Command and commune with beasts.",
  "Auspex": "Supernatural senses and insight.",
  "Blood Sorcery": "Rituals and magic of the Blood.",
  "Celerity": "Inhuman speed and reflexes.",
  "Dominate": "Override and rewrite minds.",
  "Fortitude": "Shrug off harm and resist control.",
  "Obfuscate": "Go unseen and unremembered.",
  "Potence": "Monstrous physical strength.",
  "Presence": "Inspire awe, love or terror.",
  "Protean": "Reshape the body into the Beast.",
};

// p. 175-178. specialties: pick one. disciplines: pick one (+1 dot).
export const PREDATORS = {
  alleycat: {
    name: "Alleycat", blurb: "You take blood by force: mugging, threatening, overpowering.",
    specialties: ["Intimidation (Stickups)", "Brawl (Grappling)"], disciplines: ["Celerity", "Potence"],
    humanity: -1, potency: 0, gains: "Three dots of criminal Contacts.",
  },
  bagger: {
    name: "Bagger", blurb: "You steal or buy blood bags, from blood banks and the black market.",
    specialties: ["Larceny (Lock-picking)", "Streetwise (Black Market)"], disciplines: ["Blood Sorcery", "Obfuscate"],
    tremereOnly: "Blood Sorcery", humanity: 0, potency: 0,
    gains: "Iron Gullet (3) to drink rancid blood; an Enemy (2) who wants you gone.",
  },
  blood_leech: {
    name: "Blood Leech", blurb: "You feed on other vampires. Taboo, dangerous and powerful.",
    specialties: ["Brawl (Kindred)", "Stealth (against Kindred)"], disciplines: ["Celerity", "Protean"],
    humanity: -1, potency: 1, gains: "+1 Blood Potency; Dark Secret: Diablerist or Shunned; Prey Exclusion: mortals.",
  },
  cleaver: {
    name: "Cleaver", blurb: "You feed on your own mortal family or friends, in secret.",
    specialties: ["Persuasion (Gaslighting)", "Subterfuge (Coverups)"], disciplines: ["Dominate", "Animalism"],
    humanity: 0, potency: 0, gains: "Herd (2); Dark Secret: Cleaver (1).",
  },
  consensualist: {
    name: "Consensualist", blurb: "You only feed from people who agree to it.",
    specialties: ["Medicine (Phlebotomy)", "Persuasion (Victims)"], disciplines: ["Auspex", "Fortitude"],
    humanity: 1, potency: 0, gains: "Dark Secret: Masquerade breacher (1); Prey Exclusion: non-consenting (1).",
  },
  farmer: {
    name: "Farmer", blurb: "You feed only from animals and refuse to hurt people.",
    specialties: ["Animal Ken (specific animal)", "Survival (Hunting)"], disciplines: ["Animalism", "Protean"],
    humanity: 1, potency: 0, gains: "Feeding Flaw: Vegan (2).",
  },
  osiris: {
    name: "Osiris", blurb: "A celebrity or cult leader. Your followers feed you.",
    specialties: ["Occult (specific tradition)", "Performance (specific field)"], disciplines: ["Blood Sorcery", "Presence"],
    tremereOnly: "Blood Sorcery", humanity: 0, potency: 0,
    gains: "Three dots of Fame and/or Herd; two dots of Enemies and/or Mythic flaws.",
  },
  sandman: {
    name: "Sandman", blurb: "You feed from people while they sleep.",
    specialties: ["Medicine (Anesthetics)", "Stealth (Break-in)"], disciplines: ["Auspex", "Obfuscate"],
    humanity: 0, potency: 0, gains: "Resources (1).",
  },
  scene_queen: {
    name: "Scene Queen", blurb: "You rule a subculture and feed on its admirers.",
    specialties: ["Etiquette (specific scene)", "Leadership (specific scene)", "Streetwise (specific scene)"],
    disciplines: ["Dominate", "Potence"], humanity: 0, potency: 0,
    gains: "Fame (1); Contacts (1); Influence Flaw (1) or Prey Exclusion (1).",
  },
  siren: {
    name: "Siren", blurb: "You feed during sex or seduction.",
    specialties: ["Persuasion (Seduction)", "Subterfuge (Seduction)"], disciplines: ["Fortitude", "Presence"],
    humanity: 0, potency: 0, gains: "Looks: Beautiful (2); an Enemy (1), a jilted lover.",
  },
};

// "Sea of time" (p. 137): when the coterie was Embraced
export const ERAS = {
  childer: { name: "Childer", text: "Embraced in the last 15 years.", generations: [12, 13], thinGenerations: [14, 15, 16], humanity: 0, advantages: 7, flaws: 2 },
  neonate: { name: "Neonate", text: "Embraced between 1940 and a decade ago.", generations: [12, 13], thinGenerations: [14, 15, 16], humanity: 0, advantages: 7, flaws: 2 },
  ancilla: { name: "Ancilla", text: "Embraced between 1780 and 1940. +2 Advantages, +2 Flaws, -1 Humanity.", generations: [10, 11], thinGenerations: [], humanity: -1, advantages: 9, flaws: 4 },
};

export const SECTS = ["Camarilla", "Anarch", "Autarkis (independent)", "Unaligned"];

export function bloodPotency(generation, predator) {
  return (generation >= 14 ? 0 : generation >= 12 ? 1 : 2) + (predator === "blood_leech" ? 1 : 0);
}

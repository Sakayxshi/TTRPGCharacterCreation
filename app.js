// Data
const RACES = 
[
  { id: "human",   name: "Human" },
  { id: "elf",     name: "Elf" },
  { id: "dwarf",   name: "Dwarf" },
  { id: "witcher", name: "Witcher" },
  { id: "mage",    name: "Mage" },
];
const STEPS = 
[
    {id: "race", name: "Race"},
    {id: "lifepath", name: "Lifepath"},
    {id: "profession", name: "Profession"},
    {id: "statistics", name: "Statistics"},
    {id: "skills", name: "Skills"},
    {id: "money", name: "Money"},
    {id: "outfit", name: "Outfit"},    
    
]

// State
const character = {
  race: null,
};
let currentStep = 0;

// Ref
const list = document.getElementById("racelist");
const progress = document.getElementById("progress");
const backBtn = document.getElementById("btn-back");
const nextBtn = document.getElementById("btn-next");


// Render

    //Races
    function renderRaces() {
    const html = RACES.map((race) => {
        const isSelected = character.race === race.id;
        return `<li class="${isSelected ? "selected" : ""}" data-id="${race.id}">${race.name}</li>`;
    }).join("");

    list.innerHTML = html;

    document.querySelectorAll(".RaceList li").forEach((item) => {
        item.addEventListener("click", () => {
        character.race = item.dataset.id;
        console.log(character);
        renderRaces();
        });
    });
    }

    //Steps
    function renderStep() {
    document.querySelectorAll(".step").forEach((section) => {
        section.classList.add("hidden");
        });

    
    const currentSection = document.getElementById(STEPS[currentStep].id);
    currentSection.classList.remove("hidden");


    progress.textContent = `Step ${currentStep + 1} of ${STEPS.length}`;


    backBtn.disabled = currentStep === 0;
    nextBtn.disabled = currentStep === STEPS.length - 1;
    }

//Events
nextBtn.addEventListener("click", () => {
  currentStep++;
  renderStep();
});

backBtn.addEventListener("click", () => {
  currentStep--;
  renderStep();
});

//Exec
renderRaces();
renderStep();
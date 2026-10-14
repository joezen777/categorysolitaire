// External product contract, transcribed from the original README, never from app state.
export const DECK = {
  King: ['Scepter','Orb','Throne'], Chimera: ['Goat','Lion','Snake'],
  Ceramic: ['Vase','Mug','Plate','Tile','Bowl'], Jupiter: ['Io','Ganymedes','Callisto','Europa'],
  Think: ['Consider','Suppose','Imagine','Ponder','Suggestion'], Smell: ['Nose','Odor','Perfume','Bouquet','Aroma','Scent'],
  Winds: ['Vendavel','Mistral','Bora','Breeze','Piteraq','Chinook','Zephyr','Sirocco'],
  Refuge: ['Den','Hideout','Hideaway','Safety','Lair','Security','Shelter'],
  Beds: ['Bunk','Crib','Cradle','Berth','Sofa bed','Futon','Cot','Hammock'],
  Wine: ['Riesling','Prosecco','Merlot','Cabernet','Rose','Cava'], Neck: ['Bowtie','Dress Shirt','Scarf','Tie'],
  Pirate: ['Rum','Pegleg','Treasure','Cannon','Cutlass','Parrot'], Aviation: ['Jet','Runway','Flight','Airport','Pilot','Fuselage','Airline','Airship'],
};
export const RULESET = 'category-solitaire-v1';
export const CATEGORIES = Object.keys(DECK);
export const TOTAL_CARDS = CATEGORIES.length + Object.values(DECK).flat().length;
export function identify(label) {
  if (typeof label !== 'string') return null;
  const text=label.trim().replace(/\s+/g,' ');
  for (const [category,items] of Object.entries(DECK)) {
    const item=items.find(x=>x.toLowerCase()===text.toLowerCase());
    if(item) return {label:item, category, kind:'item'};
    if(category.toLowerCase()===text.toLowerCase()) return {label:category,category,kind:'title'};
  }
  return null;
}
export const RULE_IDS = [...Array.from({length:22},(_,i)=>`R${String(i+1).padStart(2,'0')}`),'R90'];

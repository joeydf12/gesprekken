export const PLATFORMS = ['Reddit', 'Discord', 'Telegram', 'WhatsApp', 'Instagram', 'Snapchat', 'Anders'];
export const LOG_VIA = ['Discord', 'WhatsApp', 'Telegram', 'Reddit', 'Instagram', 'Snapchat', 'Telefoon', 'Videobellen', 'In het echt', 'Anders'];
export const RELATIES = ['Online vriend', 'Gamemaatje', 'Vriend', 'Kennis', 'Collega', 'Familie', 'Anders'];

export const IDLE_MS = 15 * 60 * 1000;      // automatisch uitloggen na inactiviteit
export const DEFAULT_CONTACT_DAYS = 60;     // waarschuwing zonder eigen herinnering

// Categorieën voor "Favoriete dingen" (opgeslagen als jsonb { sleutel: [items] })
export const FAVORIET_CATS = [
  ['eten', 'Eten'], ['drinken', 'Drinken'], ['games', 'Games'], ['muziek', 'Muziek'],
  ['series', 'Series'], ['films', 'Films'], ['sport', 'Sport / club']
];

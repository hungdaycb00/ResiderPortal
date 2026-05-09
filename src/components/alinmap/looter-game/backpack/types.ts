// ==========================================
// Backpack / Inventory Types
// ==========================================

export interface LooterItem {
  uid: string;
  id: string;
  name: string;
  icon: string;
  imageUrl?: string;
  type?: 'item' | 'bag' | 'portal' | 'grid_expander';
  rarity: string;
  tier: number;
  price: number;
  weight: number;
  hpBonus: number;
  energyMax: number;
  energyRegen: number;
  energyCost?: number;
  gridW: number;
  gridH: number;
  rotated: boolean;
  gridX: number;
  gridY: number;
  shape?: (number | boolean)[][];
  floatX?: number;
  floatY?: number;
  stagingX?: number;
  stagingY?: number;
  currentLat?: number;
  currentLng?: number;
}

export interface GridExpander {
  id: string;
  name: string;
  icon: string;
  expandW: number;
  expandH: number;
  type: 'grid_expander';
}

export interface PortalItem {
  id: string;
  name: string;
  icon: string;
  type: 'portal';
}

export interface BagItem {
  uid: string;
  id: string;
  name: string;
  icon: string;
  rarity: string;
  price?: number;
  weight?: number;
  hpBonus?: number;
  energyMax?: number;
  energyRegen?: number;
  gridX: number;
  gridY: number;
  rotated: boolean;
  shape: boolean[][];
  width: number;
  height: number;
  cells?: number;
  type?: 'bag';
  isStarter?: boolean;
  dropProtected?: boolean;
}

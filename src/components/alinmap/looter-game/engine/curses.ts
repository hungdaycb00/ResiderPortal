/**
 * curses.js - Hệ thống lời nguyền (Curse System)
 */

import { getSettings } from './constants';

function rollCurse(cursePercent) {
  return Math.random() * 100 < cursePercent;
}

/**
 * Roll thử thách cho MỖI 1% curse tăng thêm.
 * Ví dụ: curse từ 30% -> 35% (gain=5), sẽ roll 5 lần tại 31%, 32%, 33%, 34%, 35%.
 * Return true ngay khi trúng lần đầu tiên.
 */
function rollCursePerIncrement(currentCurse: number, curseGain: number): boolean {
  const steps = Math.floor(curseGain);
  for (let i = 1; i <= steps; i++) {
    const curseAtStep = currentCurse + i;
    if (Math.random() * 100 < curseAtStep) {
      return true;
    }
  }
  return false;
}

function calculateCurseGain(type, distanceMeters, activeCurses = {}) {
  const settings = getSettings();
  const distPerCurse = settings.distancePerCurseMeters || 250;
  const curses = (activeCurses && typeof activeCurses === 'object' && !Array.isArray(activeCurses)
    ? activeCurses
    : {}) as Record<string, number>;
  
  // Apply Curse Mult (5% increase each stack)
  const curseMult = 1 + (curses.curse_gain || 0) * 0.05;

  if (type === 'move') {
    // Tăng 1% mỗi distPerCurse mét. Tối đa 15% mỗi lần di chuyển
    const gain = Math.min(Math.floor(distanceMeters / distPerCurse), 15);
    return gain * curseMult;
  }
  if (type === 'pickup') return 25 * curseMult;
  if (type === 'minigame_lose') return 20 * curseMult;
  return 0;
}

export { 
  rollCurse,
  rollCursePerIncrement,
  calculateCurseGain,
 };

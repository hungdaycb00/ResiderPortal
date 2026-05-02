/**
 * curses.js - Hệ thống lời nguyền (Curse System)
 */

import { getSettings } from './constants';

function rollCurse(cursePercent) {
  return Math.random() * 100 < cursePercent;
}

function calculateCurseGain(type, distanceMeters, activeCurses = {}) {
  const settings = getSettings();
  const distPerCurse = settings.distancePerCurseMeters || 250;
  
  // Apply Curse Mult (5% increase each stack)
  const curseMult = 1 + (activeCurses.curse_gain || 0) * 0.05;

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
  calculateCurseGain,
 };

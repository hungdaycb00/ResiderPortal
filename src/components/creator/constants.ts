import React from 'react';
import { Brain, Sword, Shield, Zap, Trophy, Users, Layout, Gamepad2, Book } from 'lucide-react';

export const NAME_REGEX = /^[a-zA-Z0-9\sàáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũụủưứừửữựỳýỵỷỹÀÁÃẠẢĂẮẰẲẴẶÂẤẦẨẪẬÈÉẸẺẼÊỀẾỂỄỆĐÌÍĨỈỊÒÓÕỌỎÔỐỒỔỖỘƠỚỜỞỠỢÙÚŨỤỦƯỨỪỬỮỰỲÝỴỶỸ]+$/;

export const AVAILABLE_CATEGORIES = [
  { id: 'puzzle', name: 'Puzzle', icon: React.createElement(Brain, { className: 'w-3 h-3' }) },
  { id: 'action', name: 'Action', icon: React.createElement(Sword, { className: 'w-3 h-3' }) },
  { id: 'strategy', name: 'Strategy', icon: React.createElement(Shield, { className: 'w-3 h-3' }) },
  { id: 'racing', name: 'Racing', icon: React.createElement(Zap, { className: 'w-3 h-3' }) },
  { id: 'rpg', name: 'RPG', icon: React.createElement(Trophy, { className: 'w-3 h-3' }) },
  { id: 'multiplayer', name: 'Multiplayer', icon: React.createElement(Users, { className: 'w-3 h-3' }) },
  { id: 'simulation', name: 'Simulation', icon: React.createElement(Layout, { className: 'w-3 h-3' }) },
  { id: 'arcade', name: 'Arcade', icon: React.createElement(Gamepad2, { className: 'w-3 h-3' }) },
  { id: 'sports', name: 'Sports', icon: React.createElement(Zap, { className: 'w-3 h-3' }) },
  { id: 'education', name: 'Education', icon: React.createElement(Book, { className: 'w-3 h-3' }) },
  { id: 'adventure', name: 'Adventure', icon: React.createElement(Sword, { className: 'w-3 h-3' }) },
];

export const DEVICE_DIMENSIONS = {
  pc: { landscape: { w: 1920, h: 1080 }, portrait: { w: 1920, h: 1080 } },
  tablet: { landscape: { w: 1024, h: 768 }, portrait: { w: 768, h: 1024 } },
  mobile: { landscape: { w: 844, h: 390 }, portrait: { w: 390, h: 844 } },
} as const;

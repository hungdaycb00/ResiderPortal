/**
 * Public entry point cho toàn bộ API service.
 * Re-export các utility functions và assembly object `externalApi`.
 *
 * Các file domain cụ thể nằm trong ./api/:
 *   coreApi.ts   – URL helpers, request wrapper, auth token
 *   friendsApi.ts – friends CRUD
 *   gamesApi.ts  – game publish/upload/download
 *   profileApi.ts – auth & avatar
 *   chatApi.ts   – world chat
 *   roomsApi.ts  – P2P rooms
 */

// ── Re-export utility functions (backward compatible) ──────────────────────
export {
  getBaseUrl,
  getLooterServerUrl,
  getServerVpsBaseUrl,
  normalizeImageUrl,
  getDeviceId,
  getToken,
  setToken,
  clearDeviceId,
  checkStatus,
  request,
} from './api/coreApi';

import {
  checkStatus,
  clearDeviceId,
  getDeviceId,
  getToken,
  request,
  setToken,
} from './api/coreApi';

import * as friendsApi from './api/friendsApi';
import * as gamesApi from './api/gamesApi';
import * as profileApi from './api/profileApi';
import * as chatApi from './api/chatApi';
import * as roomsApi from './api/roomsApi';

// ── Assembled object (backward compatible) ────────────────────────────────
export const externalApi = {
  // Core
  checkStatus,
  getDeviceId,
  getToken,
  setToken,
  clearDeviceId,
  request,

  // Friends
  ...friendsApi,

  // Games
  ...gamesApi,

  // Profile & Auth
  ...profileApi,

  // Chat
  ...chatApi,

  // P2P Rooms
  ...roomsApi,
};

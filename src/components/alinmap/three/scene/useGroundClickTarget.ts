/**
 * useGroundClickTarget.ts — Tính toán Lat/Lng từ click trên Ground mesh.
 *
 * Tách riêng để dễ debug, test và tái sử dụng. Logic không phụ thuộc vào
 * looter game state, chỉ cần moveGroup, origin, và dữ liệu từ raycaster.
 *
 * Vấn đề đã fix:
 *   Camera nằm NGOÀI tiltGroup, Ground nằm TRONG tiltGroup (bị xoay nghiêng).
 *   Khi click, nếu chỉ un-tilt điểm giao cắt (worldToLocal), tọa độ lat/lng
 *   bị sai lệch vài km do không tính đến đường đi của tia từ camera.
 *
 *   Fix: Transform toàn bộ TIA (origin + direction) về moveGroup space,
 *   rồi tính giao với mặt phẳng ngang Y = GROUND_Y.
 */

import { Vector3, Ray, Object3D } from 'three';
import { DEGREES_TO_PX, MAP_PLANE_SCALE } from '../../constants';
import { MAP_COORD_SCENE_SCALE, type LatLng } from '../sceneUtils';

// Vị trí Y của Ground mesh trong moveGroup space (sau khi mesh bị xoay -90deg X)
const GROUND_Y = -1;

// Hằng số scale tổng hợp: pixel -> scene unit
function computeScale(sceneWorldScale: number = 1): number {
  return DEGREES_TO_PX * MAP_PLANE_SCALE * MAP_COORD_SCENE_SCALE * sceneWorldScale;
}

/**
 * Chuyển đổi tọa độ trong moveGroup space thành lat/lng.
 *
 * Công thức ngược của worldToScene:
 *   worldToScene: x = (lng - origin.lng) * SCALE
 *                 z = -(lat - origin.lat) * SCALE
 *   => lng = origin.lng + x / SCALE
 *   => lat = origin.lat - z / SCALE
 */
function localToLatLng(
  localX: number,
  localZ: number,
  origin: LatLng,
  sceneWorldScale: number = 1
): LatLng {
  const SCALE = computeScale(sceneWorldScale);
  return {
    lat: origin.lat - localZ / SCALE,
    lng: origin.lng + localX / SCALE,
  };
}

/**
 * Phương pháp transform RAY (chính xác):
 * Biến đổi toàn bộ tia từ world space về moveGroup local space,
 * tính giao điểm với mặt phẳng ngang Y = GROUND_Y.
 */
function rayToLatLng(
  ray: Ray,
  moveGroup: Object3D,
  origin: LatLng,
  sceneWorldScale: number = 1
): LatLng {
  // Transform ray origin và 1 điểm trên tia về moveGroup space
  const localOrigin = moveGroup.worldToLocal(ray.origin.clone());
  const rayEndWorld = ray.origin.clone().add(ray.direction);
  const localEnd = moveGroup.worldToLocal(rayEndWorld);
  const localDir = new Vector3().subVectors(localEnd, localOrigin).normalize();

  const denom = localDir.y;
  if (Math.abs(denom) < 1e-9) {
    // Tia song song với mặt đất (gần như không thể xảy ra)
    console.warn('[GroundClick] Ray near-parallel to ground, result may be inaccurate');
    return { lat: origin.lat, lng: origin.lng };
  }

  // Giao điểm: localOrigin + t * localDir, với Y = GROUND_Y
  // => t = (GROUND_Y - localOrigin.y) / localDir.y
  const t = (GROUND_Y - localOrigin.y) / denom;

  if (t < 0) {
    // Giao điểm nằm sau camera (click vào bầu trời?)
    console.warn('[GroundClick] Intersection behind camera, t =', t);
  }

  const localX = localOrigin.x + t * localDir.x;
  const localZ = localOrigin.z + t * localDir.z;

  return localToLatLng(localX, localZ, origin, sceneWorldScale);
}

/**
 * Phương pháp worldToLocal(point) — FALLBACK khi không có ray.
 * Kém chính xác hơn khi ground bị tilt, nhưng dùng được khi
 * không có sẵn ray (một số event cũ).
 */
function pointToLatLng(
  point: Vector3,
  moveGroup: Object3D,
  origin: LatLng,
  sceneWorldScale: number = 1
): LatLng {
  const localPt = moveGroup.worldToLocal(point.clone());
  return localToLatLng(localPt.x, localPt.z, origin, sceneWorldScale);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface GroundClickInput {
  /** Intersection point từ raycaster (world space) */
  point: Vector3;
  /** Ray từ raycaster (world space) — nếu có, dùng phương pháp chính xác */
  ray?: Ray;
  /** Object3D cha của Ground mesh (moveGroupRef) */
  moveGroup: Object3D;
  /** Vị trí GPS gốc của bản đồ (origin) */
  origin: LatLng;
  /** Hệ số scale bổ sung (sceneWorldScale), mặc định 1 */
  sceneWorldScale?: number;
}

export interface GroundClickResult {
  lat: number;
  lng: number;
  /** Phương pháp đã dùng để tính toán */
  method: 'ray' | 'point-fallback';
}

/**
 * Tính toán Lat/Lng từ một cú click lên Ground mesh.
 *
 * @example
 * ```ts
 * // Trong Ground onClick:
 * const result = computeGroundClickTarget({
 *   point: e.point,
 *   ray: e.ray,
 *   moveGroup: moveGroupRef.current,
 *   origin: { lat: 10.7, lng: 106.6 },
 * });
 * console.log(`Clicked at ${result.lat}, ${result.lng} (method: ${result.method})`);
 * ```
 */
export function computeGroundClickTarget(input: GroundClickInput): GroundClickResult {
  const { point, ray, moveGroup, origin, sceneWorldScale = 1 } = input;

  if (ray) {
    const latlng = rayToLatLng(ray, moveGroup, origin, sceneWorldScale);
    return { ...latlng, method: 'ray' };
  }

  const latlng = pointToLatLng(point, moveGroup, origin, sceneWorldScale);
  return { ...latlng, method: 'point-fallback' };
}

// Re-export hằng số để debug
export { computeScale, GROUND_Y, localToLatLng, rayToLatLng, pointToLatLng };

# AlinMap — Kiến trúc Render 3D & Hệ tọa độ

> Tài liệu mô tả chi tiết cách AlinMap render nền (ground plane), camera, item, avatar, boat và cơ chế click-to-move trong chế độ Looter.

---

## 1. Tổng quan kiến trúc

AlinMap có **2 đường render** song song, chọn dựa vào `mapMode` và `isLooterGameMode`:

| Mode | Ground | Items/Avatar |
|------|--------|-------------|
| **Roadmap (thường)** | DOM `<MapTiles>` (tile map) | DOM `RoadmapAvatarLayer` |
| **Roadmap (looter)** | DOM `<MapTiles>` | DOM `LooterMapPlaneLayer` (dùng `useDomLooterLayer=true`) |
| **Satellite (thường)** | Three.js `Ground` + `ZenKoiPond` | Three.js `UserLayers` |
| **Satellite (looter)** | Three.js `Ground` | Three.js `LooterLayers` — đây là luồng chính cần quan tâm |

Toàn bộ logic lõi nằm ở `SceneContent.tsx` (R3F component render trong `<Canvas>`).

---

## 2. Hằng số cốt lõi

```ts
// File: src/components/alinmap/constants.ts
DEGREES_TO_PX        = 11100   // 1° lat/lng ≈ 111km → 1km ≈ 100px → 1° = 11100px
MAP_PLANE_SCALE       = 1.32    // Hệ số scale toàn cục của mặt phẳng map
MAP_PLANE_Y_SCALE     = 1.32 * cos(55°) // Y-scale khi camera tilt 55°
MAP_TILT_DEGREES      = 55      // Góc nghiêng mặc định của camera
CAMERA_FOV_DEGREES    = 75      // FOV mặc định
CAMERA_Z_NEAR         = 260     // Z xa nhất (camera near nhất với map)
CAMERA_Z_FAR          = -100000 // Z gần nhất (camera xa nhất)
CAMERA_Z_WATER_DEFAULT = 38     // Z mặc định cho satellite (≈95% zoom)
```

```ts
// File: src/components/alinmap/three/sceneCoords.ts
MAP_COORD_SCENE_SCALE = 0.34   // Hệ số thu nhỏ từ pixel → scene unit (Three.js)
```

---

## 3. Hệ tọa độ (Coordinate System)

### 3.1. Công thức chuyển đổi Lat/Lng → Scene

```ts
// worldToScene(origin, target) → { x, z }
// origin: vị trí GPS của người chơi (trung tâm bản đồ)
// target: vị trí GPS cần chuyển đổi

sceneX = (target.lng - origin.lng) * DEGREES_TO_PX * MAP_PLANE_SCALE * MAP_COORD_SCENE_SCALE
sceneZ = -(target.lat - origin.lat) * DEGREES_TO_PX * MAP_PLANE_SCALE * MAP_COORD_SCENE_SCALE
```

**Diễn giải:**
- `(lng - origin.lng) * 11100` → pixel ngang
- `* 1.32` → scale phóng to mặt phẳng
- `* 0.34` → thu nhỏ về scene unit (Three.js world unit)
- **Trục X** ≡ Kinh độ (longitude), dương = phía đông
- **Trục Z** ≡ Vĩ độ (latitude), âm = phía bắc (Z dương khi xuống nam)
- **Trục Y** ≡ Độ cao (up vector)

### 3.2. Công thức Scene → Lat/Lng (click trên ground)

```ts
// Trong handleGroundClick, worldToLocal undo pan translation:
// localPt = moveGroup.worldToLocal(clickPoint)

SCALE = DEGREES_TO_PX * MAP_PLANE_SCALE * MAP_COORD_SCENE_SCALE * sceneWorldScale

lng = origin.lng + localPt.x / SCALE           // Trục X ↔ kinh độ
lat = origin.lat - localPt.z / SCALE            // Trục Z (âm) ↔ vĩ độ
```

### 3.3. Pixel (DOM) → Scene

```ts
// pxToScene(px) = px * MAP_COORD_SCENE_SCALE
// Dùng để chuyển pixel offset (boatOffsetX/Y) vào không gian scene
```

---

## 4. Scene Graph — Cây phân cấp Three.js

```
<R3F Canvas>
  └── <group ref=tiltGroupRef>        ← Xoay theo tiltAngle, cameraRotateYDeg, cameraRotateDeg
        ├── <group ref=moveGroupRef>  ← Dịch chuyển theo panX * scale, 0, panY * scale
        │     ├── <Ground />          ← Mặt phẳng vô hình bắt click (size 90000)
        │     ├── <UserLayers />      ← Avatar người chơi + người xung quanh
        │     ├── <SceneMarkers />    ← Marker tỉnh, marker tìm kiếm
        │     └── <LooterLayers />    ← Fortress, loot items, target pin (chỉ looter mode)
        │
        └── <CameraRig />             ← Camera được reposition mỗi frame
```

**Chi tiết từng tầng:**

### 4.1. `tiltGroupRef` — Nhóm xoay
```ts
// Mỗi frame trong useFrame():
tiltGroupRef.current.rotation.set(
  degToRad(tiltAngle),        // Góc nghiêng (pitch) — thay đổi khi zoom
  degToRad(cameraRotateYDeg), // Xoay quanh trục Y (yaw)
  degToRad(cameraRotateDeg)   // Xoay quanh trục Z (roll)
);
```

### 4.2. `moveGroupRef` — Nhóm dịch chuyển
```ts
// Mỗi frame:
moveGroupRef.current.position.set(
  panX * MAP_COORD_SCENE_SCALE * sceneWorldScale,  // X
  0,                                                  // Y (luôn = 0)
  panY * MAP_COORD_SCENE_SCALE * sceneWorldScale   // Z
);
```
`panX/panY` được cập nhật từ `useMapInteractions` khi người dùng kéo bản đồ.

---

## 5. Camera Setup (`CameraRig.tsx`)

Camera được reposition **mỗi frame** trong `useFrame`, không dùng OrbitControls.

```ts
// CameraRig — useFrame logic:
const altitude = perspectivePx - cameraZ;  // Khoảng cách Z từ camera đến mặt phẳng
const vy = cameraHeightOffset + perspectivePx * heightRatio;

camera.position.set(0, vy, cameraZ);
camera.lookAt(0, vy, cameraZ + altitude); // Luôn nhìn về phía Z+
```

**Tham số:**
| Tham số | Ý nghĩa | Mặc định (looter) |
|---------|---------|-------------------|
| `cameraZ` | Khoảng cách Z của camera | ≈38 (gần mặt đất) |
| `cameraHeightOffset` | Nâng/hạ camera theo trục Y | 0 |
| `perspectivePx` | `viewportHeight / (2 * tan(FOV/2))` | Phụ thuộc viewport |
| `heightRatio` | `0.22 + heightPct/620` | Tỉ lệ góc nhìn |
| `minDistance` | Khoảng cách tối thiểu camera-mặt đất | 95 (looter) / 140 (thường) |

Kết quả: Camera đặt tại `(0, vy, cameraZ)`, luôn nhìn về điểm `(0, vy, cameraZ + altitude)` — tức nhìn thẳng về phía trước (Z+) ở cùng độ cao. Góc nhìn được tạo ra bởi `tiltGroupRef` (xoay toàn bộ thế giới), không phải camera.

---

## 6. Ground Plane (`Ground.tsx`)

Là một **mặt phẳng vô hình** kích thước **90,000 × 90,000** units, dùng để bắt sự kiện click từ Raycaster.

```tsx
<mesh
  ref={meshRef}
  rotation-x={-Math.PI / 2}    // Xoay -90° để nằm ngang (mặt phẳng XY → XZ)
  position={[0, -1, 0]}        // Đặt thấp hơn gốc 1 unit để không che khuất vật thể khác
  onClick={handleClick}        // Bắt click, gọi onGroundClick(e.point)
>
  <planeGeometry args={[90000, 90000, 1, 1]} />
  <meshBasicMaterial visible={false} />  // Vô hình!
</mesh>
```

**Trong satellite mode**, có thêm component `<ZenKoiPond />` render hiệu ứng mặt nước trang trí phía trên Ground.

---

## 7. Avatar & User Layers (`UserLayers.tsx`)

### 7.1. Chế độ thường (không looter)
- Render **Self Avatar** (người chơi) + **Nearby Users** (người xung quanh)
- Avatar dùng model 3D `.glb` nếu `USE_3D_AVATARS=true`, nếu không dùng billboard 2D
- Có **spatial clustering** — nhóm các user gần nhau
- Filter theo `searchTag`, `filterDistance`, `filterAgeMin/Max`
- Self avatar có thể **kéo thả** (drag) để đặt lại vị trí

### 7.2. Chế độ looter
- Self avatar được thay bằng `<ProceduralBoat />`
- Nearby users vẫn hiển thị nhưng không có spatial clustering
- Vị trí boat được tính từ `boatOffsetX/Y` (Framer Motion values)

### 7.3. Vị trí trong scene
Mỗi avatar/item được đặt trong scene qua `worldToScene`:
```ts
const pos = worldToScene(origin, { lat: user.lat, lng: user.lng });
// → sceneX = (lng - origin.lng) * SCALE
// → sceneZ = -(lat - origin.lat) * SCALE
```
Sau đó nhân với `sceneWorldScale` (chỉ khác 1 trong roadmap mode).

---

## 8. Boat (`ProceduralBoat.tsx`) — Looter Mode

Boat của người chơi trong chế độ looter được render bằng `ProceduralBoat`.

```tsx
// Vị trí được cập nhật mỗi frame (mỗi 3 frame) trong useFrame của SceneContent:
const visualBoatX = boatOffsetX.get() * MAP_PLANE_SCALE;
const visualBoatY = boatOffsetY.get() * MAP_PLANE_SCALE;
boatPosRef.current = [sp.x + pxToScaledScene(visualBoatX), 5.0, sp.z + pxToScaledScene(visualBoatY)];
```

**Animation:**
- **Bobbing**: Nhấp nhô lên xuống theo sóng (`Math.sin(time * 2.5) * 0.3`)
- **Rocking**: Lắc lư theo sóng (`Math.sin(time * 1.8 + 1.2) * 0.04`)
- **Distance text**: Hiển thị khoảng cách đến Fortress phía dưới boat, auto-resize theo camera

**Chuyển đổi offset → Lat/Lng:**
```ts
boatLat = origin.lat - boatOffsetY / DEGREES_TO_PX
boatLng = origin.lng + boatOffsetX / DEGREES_TO_PX
```

---

## 9. Loot Items / Sprites (`LootSprite.tsx`)

Mỗi item trên bản đồ looter được render bằng component `LootSprite`:

### 9.1. Cấu trúc
```tsx
<Billboard>                    // Luôn hướng về camera (billboarding)
  <sprite>                     // Sprite chính
    <spriteMaterial map={texture} />
  </sprite>
  <mesh>                       // Vòng tròn dưới chân để dễ click
    <circleGeometry args={[4.2, 16]} />
    <meshBasicMaterial visible={false} />
  </mesh>
</Billboard>
```

### 9.2. Texture
Texture được tạo động bằng Canvas 2D:
- `makeLootSpriteTexture(type, title, accent, icon)` → Canvas → `THREE.CanvasTexture`
- Size: 128×128px
- Có icon + text + màu accent theo rarity

### 9.3. Raycaster interaction
- `raycast` prop mặc định `undefined` → Three.js sẽ raycast bình thường
- Khi `interactive=false`, `raycast={() => {}}` → vô hiệu hóa raycast
- **Click footprint**: Vòng tròn vô hình radius 4.2 ở mặt đất (pos Y=0.1), giúp người chơi dễ click vào item hơn
- Sự kiện: `onClick` → gọi `handleWorldItemClick(item)`

### 9.4. Phân loại item
| Type | Icon | Accent |
|------|------|--------|
| `portal` | `'🌀'` | `#a78bfa` (tím) |
| `chest` (có minigameType) | `'📦'` | theo rarity |
| `bag` | `'🎒'` | theo rarity |
| `item` (thường) | icon từ data | rarity color |

---

## 10. LooterLayers (`LooterLayers.tsx`)

Layer render các đối tượng looter trong không gian 3D:

1. **Fortress Waypoint**: Hiển thị fortress ở vị trí GPS `state.fortressLat/Lng`
2. **Waypoint Items**: 3 item gần nhất (bypass culling) — đảm bảo luôn hiển thị dù xa
3. **Dashed Path**: Đường nét đứt SVG overlay từ boat → target pin (nếu có `boatTargetPin`)
4. **Target Pin**: Vòng tròn + chấm tại vị trí đích (`boatTargetPin`)
5. **Enemy Sprite**: Hiển thị thuyền địch khi đang combat
6. **World Items**: Các loot item đã được culling (tối đa 42 desktop / 24 mobile)

---

## 11. Cơ chế Click-to-Move

### 11.1. Luồng tổng quan

```
Người dùng click trên map
  │
  ├─ DOM MapCanvas bắt PointerDown/PointerUp
  │   └─ useMapInteractions phân biệt tap vs drag (threshold 30px)
  │
  ├─ Nếu là tap hợp lệ:
  │   └─ Three.js Raycaster tự động bắn tia từ camera qua vị trí chuột
  │       │
  │       ├─ Trúng LootSprite? → onClick của sprite → handleWorldItemClick
  │       │   ├─ Khoảng cách ≤ 250m? → Tương tác ngay (pickup/open chest/portal)
  │       │   └─ Khoảng cách > 250m? → Set arrival action + RequestMove đến item
  │       │
  │       └─ Trúng Ground? → handleGroundClick
  │           ├─ worldToLocal(clickPoint) → undo pan translation
  │           ├─ Chuyển localPt → lat/lng
  │           ├─ Proximity check (100m radius) → phát hiện item gần
  │           │   ├─ Có item? → handleWorldItemClick
  │           │   └─ Không có item? → onRequestMove(lat, lng, 'map')
  │           │
  │           └─ onRequestMove → executeMoveToExact
  │               ├─ Safety reset (3 clicks trong 2s → clear stuck state)
  │               ├─ Tính speed = SPEED_DEG_PER_SEC * tierMultiplier
  │               ├─ Tính duration = distance / speed (giới hạn 15s)
  │               ├─ animateBoatTo(lat, lng, duration) — visual animation
  │               └─ Khi animation kết thúc:
  │                   ├─ moveBoat() — gọi API server sync (curse, encounter, drop)
  │                   └─ onArrivalAction() — thực thi action đã queue
```

### 11.2. handleGroundClick — Chi tiết chuyển đổi tọa độ

```ts
// Bước 1: Lấy intersection point từ Raycaster (world space)
// point = e.point (Vector3) — vị trí giao cắt trong world space

// Bước 2: Chuyển về local space của moveGroup
const moveGroup = groundMeshRef.current.parent;
const localPt = moveGroup.worldToLocal(point.clone());
// → Undo pan translation: localPt = point - moveGroup.position

// Bước 3: Chuyển localPt → lat/lng
const SCALE = DEGREES_TO_PX * MAP_PLANE_SCALE * MAP_COORD_SCENE_SCALE * sceneWorldScale;
const lng = origin.lng + localPt.x / SCALE;   // Trục X ↔ kinh độ
const lat = origin.lat - localPt.z / SCALE;    // Trục Z (đảo dấu) ↔ vĩ độ
```

### 11.3. Proximity check
```ts
const CLICK_RADIUS_DEG = 0.0009; // ≈100 mét
// Kiểm tra tất cả waypointItems + renderedWorldItems
// Item nào có (item.lat - lat)² + (item.lng - lng)² ≤ CLICK_RADIUS_DEG²
// → Chọn item gần nhất để tương tác
```

---

## 12. DOM Layer (`LooterMapPlaneLayer.tsx`) — Alternative Path

Khi `useDomLooterLayer=true` (roadmap mode), looter được render bằng DOM thay vì Three.js:

### 12.1. Projection
Dùng phép chiếu **Mercator tile-based**:
```ts
projectToPlane(center, target, visualScale, planeSize) → { x, y }
// Chuyển lat/lng → tile coordinates → pixel trên DOM plane
```

### 12.2. PlaneSprite
Mỗi item là một `<button>` với texture được render bằng Canvas 2D (giống LootSprite):
- **Hitbox**: Chiều cao được mở rộng 2.5× để bù lực nén do camera tilt
- Transform: `translate(-50%, calc(-100% + size/2))` để căn giữa đáy sprite
- Sprites: Fortress (112px), Boat (72px), Items (54px)

### 12.3. Dashed Path
Đường nét đứt SVG từ boat → target được render bằng `<line>` với `strokeDasharray="12 10"` và animation CSS.

---

## 13. Tổng kết các file quan trọng

| File | Chức năng |
|------|-----------|
| `three/scene/SceneContent.tsx` | Orchestrator chính, chứa scene graph + useFrame sync loop |
| `three/ Ground.tsx` | Mặt phẳng vô hình bắt click (90,000 units) |
| `three/CameraRig.tsx` | Camera reposition mỗi frame theo scale/perspective/height |
| `three/sceneCoords.ts` | `worldToScene`, `pxToScene`, hằng số `MAP_COORD_SCENE_SCALE` |
| `constants.ts` | Tất cả hằng số: DEGREES_TO_PX, MAP_PLANE_SCALE, tilt, FOV, zoom range |
| `three/scene/UserLayers.tsx` | Self avatar / boat + nearby users + spatial clustering |
| `three/scene/LooterLayers.tsx` | Fortress, waypoint items, target pin, enemy, world loot |
| `three/scene/looterInteraction.ts` | Logic click: handleGroundClick, handleWorldItemClick, handleFortressClick |
| `three/scene/SceneMarkers.tsx` | Province marker + search marker |
| `three/models/LootSprite.tsx` | Billboard sprite cho loot item + click footprint |
| `three/models/ProceduralBoat.tsx` | Boat người chơi với animation bobbing/rocking |
| `MapCanvas.tsx` | Main viewport: DOM tiles + R3F Canvas + pointer handlers |
| `AlinMapInner.tsx` | Top-level: geolocation, websocket, navigation, game state |
| `hooks/useMapInteractions.ts` | Pointer events: drag map, pinch zoom, tap detection |
| `components/LooterMapPlaneLayer.tsx` | DOM-based looter rendering (roadmap alternative) |
| `looter-game/hooks/useBoatAnimation.ts` | Framer Motion animation cho boat movement |
| `looter-game/hooks/useLooterMovement.ts` | Server sync: curse, encounters, item drops |
| `looter-game/services/looterApi.ts` | API endpoints cho moveBoat, pickupItem, combat, etc. |

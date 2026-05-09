import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

// Constants
const ECO_SIZE = 500.0;
const simWorldSize = new THREE.Vector2(ECO_SIZE, ECO_SIZE);
const MAX_RIPPLES = 60;

function posMod(v: number, m: number) {
    return ((v % m) + m) % m;
}

// Helpers to generate Canvas Textures
function createKoiTexture(isPlayer: boolean) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);
    
    const grad = ctx.createLinearGradient(128, 0, 128, 512);
    grad.addColorStop(0, isPlayer ? '#ffffff' : '#ff9933');
    grad.addColorStop(1, isPlayer ? '#dddddd' : '#cc6600');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(128, 200, 65, 180, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = isPlayer ? '#ff3300' : '#ffffff';
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(100 + Math.random() * 50, 100 + i * 60, 20 + Math.random() * 20, 30 + Math.random() * 20, Math.random(), 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = isPlayer ? '#ffffff' : '#ffcc99';
    ctx.beginPath();
    ctx.moveTo(128, 380);
    ctx.quadraticCurveTo(40, 500, 128, 480);
    ctx.quadraticCurveTo(216, 500, 128, 380);
    ctx.fill();
    
    return new THREE.CanvasTexture(canvas);
}

function createLilyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.fillStyle = '#226633';
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 1.8);
    ctx.lineTo(128, 128);
    ctx.fill();
    
    ctx.strokeStyle = '#113311';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(128, 128);
        ctx.lineTo(128 + Math.cos(i) * 110, 128 + Math.sin(i) * 110);
        ctx.stroke();
    }
    
    return new THREE.CanvasTexture(canvas);
}

// Shaders
const vertexShaderWorldXZ = `
    varying vec2 vWorldPos;
    void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xz;
        gl_Position = projectionMatrix * viewMatrix * wp;
    }
`;

const floorFragmentShader = `
    uniform float time;
    uniform vec2 simWorldSize;
    varying vec2 vWorldPos;
    
    float random(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        float a = random(i); float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
        float n = noise(vWorldPos * 2.0);
        vec3 sand = mix(vec3(0.05, 0.1, 0.15), vec3(0.08, 0.12, 0.18), n);
        
        vec2 p = vWorldPos * 0.15;
        float caustic = 0.0;
        for(int i=1; i<=3; i++) {
            vec2 p2 = p + time * 0.1 / float(i);
            p2 += vec2(sin(p2.y + time), cos(p2.x + time));
            caustic += pow(0.5 + 0.5 * sin(length(p2) * 5.0), 2.0);
        }
        caustic /= 3.0;
        
        gl_FragColor = vec4(sand + caustic * 0.06, 1.0);
    }
`;

const waterFragmentShader = `
    uniform sampler2D tWater;
    uniform float time;
    uniform float opacity;
    uniform vec2 simWorldSize;
    varying vec2 vWorldPos;
    void main() {
        vec2 uv = mod(vWorldPos, simWorldSize) / simWorldSize;
        float wave = texture2D(tWater, uv).r;
        
        vec2 texel = vec2(1.0/1024.0);
        float dx = texture2D(tWater, uv + vec2(texel.x, 0.0)).r - texture2D(tWater, uv - vec2(texel.x, 0.0)).r;
        float dy = texture2D(tWater, uv + vec2(0.0, texel.y)).r - texture2D(tWater, uv - vec2(0.0, texel.y)).r;
        
        vec3 normal = normalize(vec3(-dx * 3.0, -dy * 3.0, 1.0));
        // Rotate lightDir to match XZ plane (Y is up)
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
        
        // Since plane is XZ, normal.y is up.
        // Wait, dx is along X, dy is along Z. The normal vector in World Space should be:
        vec3 worldNormal = normalize(vec3(-dx * 3.0, 1.0, -dy * 3.0));
        float spec = pow(max(dot(worldNormal, lightDir), 0.0), 120.0);
        
        vec3 waterColor = mix(vec3(0.02, 0.15, 0.2), vec3(0.1, 0.4, 0.5), wave * 0.5 + 0.5);
        gl_FragColor = vec4(waterColor + spec * 0.7, opacity + abs(wave)*0.4);
    }
`;

const entityVertexShader = `
    varying vec2 vUv;
    varying float vY;
    uniform float time;
    uniform int isFish;
    uniform int isShadow;
    void main() {
        vUv = uv;
        vec3 p = position;
        if(isFish == 1 && isShadow == 0) {
            p.x += sin(time * 5.0 + uv.y * 8.0) * (1.0 - uv.y) * 0.7;
        }
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vY = wp.y;
        gl_Position = projectionMatrix * viewMatrix * wp;
    }
`;

const entityFragmentShader = `
    varying vec2 vUv;
    varying float vY;
    uniform sampler2D map;
    uniform int isShadow;
    void main() {
        vec4 c = texture2D(map, vUv);
        if(c.a < 0.1) discard;
        if(isShadow == 1) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, c.a * 0.4);
            return;
        }
        // Fade out fish if they go deep (vY < -2.0)
        if(vY < -2.0) {
            c.rgb = mix(c.rgb, vec3(0.0, 0.08, 0.12), clamp((-vY - 2.0)/10.0, 0.0, 0.8));
        }
        gl_FragColor = c;
    }
`;

interface ZenKoiPondProps {
    boatPosRef?: React.RefObject<[number, number, number]>;
    camPosRef?: React.RefObject<THREE.Vector3>;
}

export default function ZenKoiPond({ boatPosRef, camPosRef }: ZenKoiPondProps) {
    const { gl } = useThree();
    
    // Textures
    const { texPlayer, texAI, texLily } = useMemo(() => ({
        texPlayer: createKoiTexture(true),
        texAI: createKoiTexture(false),
        texLily: createLilyTexture()
    }), []);

    // FBO setup
    const { rtA, rtB, simMaterial, simScene, orthoCamera } = useMemo(() => {
        // Option to reduce resolution for performance on mobile: 512x512
        const res = 512;
        const rtOptions = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.HalfFloatType,
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping
        };
        const rtA = new THREE.WebGLRenderTarget(res, res, rtOptions);
        const rtB = new THREE.WebGLRenderTarget(res, res, rtOptions);
        
        const rippleUniforms = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector3(0, 0, 0));
        
        const simMat = new THREE.ShaderMaterial({
            uniforms: {
                tWater: { value: null },
                simWorldSize: { value: simWorldSize },
                camUv: { value: new THREE.Vector2() },
                rippleData: { value: rippleUniforms },
                damping: { value: 0.985 },
                rippleRadius: { value: 2.8 }
            },
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
            fragmentShader: `
                uniform sampler2D tWater; uniform vec2 simWorldSize; uniform vec2 camUv; 
                uniform vec3 rippleData[${MAX_RIPPLES}]; uniform float damping; uniform float rippleRadius; varying vec2 vUv;
                float getToroidalDist(vec2 uv1, vec2 uv2) { vec2 d = abs(uv1 - uv2); d = min(d, 1.0 - d); return length(d * simWorldSize); }
                void main() {
                    vec2 texel = vec2(1.0 / ${res}.0);
                    float c = texture2D(tWater, vUv).r; float p = texture2D(tWater, vUv).g;
                    float l = texture2D(tWater, vUv - vec2(texel.x, 0.0)).r; float r = texture2D(tWater, vUv + vec2(texel.x, 0.0)).r;
                    float t = texture2D(tWater, vUv + vec2(0.0, texel.y)).r; float b = texture2D(tWater, vUv - vec2(0.0, texel.y)).r;
                    float wave = (l + r + t + b) / 2.0 - p; wave *= damping; 
                    for(int i = 0; i < ${MAX_RIPPLES}; i++) {
                        float dist = getToroidalDist(vUv, rippleData[i].xy);
                        if (dist < rippleRadius && rippleData[i].z > 0.0) wave -= rippleData[i].z * smoothstep(rippleRadius, 0.0, dist);
                    }
                    gl_FragColor = vec4(clamp(wave, -2.0, 2.0), c, 0.0, 1.0);
                }
            `
        });
        
        const simSc = new THREE.Scene();
        simSc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMat));
        const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        return { rtA, rtB, simMaterial: simMat, simScene: simSc, orthoCamera: orthoCam };
    }, []);

    const rtRef = useRef({ rtA, rtB });

    // Entities
    const { fishes, lilypads } = useMemo(() => {
        const entityMat = (tex: THREE.Texture, isFish: boolean) => new THREE.ShaderMaterial({
            transparent: true,
            uniforms: { map: { value: tex }, time: { value: 0 }, isFish: { value: isFish ? 1 : 0 }, isShadow: { value: 0 } },
            vertexShader: entityVertexShader,
            fragmentShader: entityFragmentShader,
            depthWrite: false
        });

        const fishesList = [];
        for (let i = 0; i < 40; i++) {
            const isPlayer = i === 0;
            const fish = {
                isPlayer,
                worldPos: new THREE.Vector2((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100),
                y: isPlayer ? -2 : -3 - Math.random() * 10,
                vel: new THREE.Vector2(),
                facing: Math.random() * 6.28,
                meshMat: entityMat(isPlayer ? texPlayer : texAI, true),
                shadowMat: entityMat(isPlayer ? texPlayer : texAI, true)
            };
            fish.shadowMat.uniforms.isShadow.value = 1;
            fishesList.push(fish);
        }

        const lilypadsList = [];
        for (let i = 0; i < 30; i++) {
            const pad = {
                worldPos: new THREE.Vector2((Math.random() - 0.5) * ECO_SIZE, (Math.random() - 0.5) * ECO_SIZE),
                meshMat: entityMat(texLily, false),
                shadowMat: entityMat(texLily, false),
                rot: Math.random() * 7
            };
            pad.shadowMat.uniforms.isShadow.value = 1;
            lilypadsList.push(pad);
        }

        return { fishes: fishesList, lilypads: lilypadsList };
    }, [texPlayer, texAI, texLily]);

    // Materials
    const floorMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, simWorldSize: { value: simWorldSize } },
        vertexShader: vertexShaderWorldXZ,
        fragmentShader: floorFragmentShader
    }), []);

    const waterMaterial = useMemo(() => new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { 
            tWater: { value: null }, 
            time: { value: 0 }, 
            simWorldSize: { value: simWorldSize }, 
            opacity: { value: 0.45 } 
        },
        vertexShader: vertexShaderWorldXZ,
        fragmentShader: waterFragmentShader
    }), []);

    // Refs for meshes to update positions
    const fishesRefs = useRef<Array<{ mesh: THREE.Mesh | null; shadow: THREE.Mesh | null }>>(fishes.map(() => ({ mesh: null, shadow: null })));
    const lilypadsRefs = useRef<Array<{ mesh: THREE.Mesh | null; shadow: THREE.Mesh | null }>>(lilypads.map(() => ({ mesh: null, shadow: null })));
    const floorRef = useRef<THREE.Mesh>(null);
    const waterRef = useRef<THREE.Mesh>(null);

    // Animation Loop
    useFrame(({ clock }) => {
        const time = clock.getElapsedTime();
        
        // 1. We need a reference "camera" pos to wrap the infinite pond around.
        // If AlinMap provides camPosRef, use its X and Z. Otherwise, use 0,0.
        let centerX = 0, centerZ = 0;
        if (camPosRef && camPosRef.current) {
            centerX = camPosRef.current.x;
            centerZ = camPosRef.current.z;
        } else if (boatPosRef && boatPosRef.current) {
            centerX = boatPosRef.current[0];
            centerZ = boatPosRef.current[2];
        }

        // Center the 12000x12000 plane around the camera/boat to cover the view
        if (floorRef.current) floorRef.current.position.set(centerX, -25, centerZ);
        if (waterRef.current) waterRef.current.position.set(centerX, -0.5, centerZ);

        floorMaterial.uniforms.time.value = time;
        waterMaterial.uniforms.time.value = time;

        const p = fishes[0];
        // If boatPosRef is provided, the boat is the player.
        // We'll let the first fish follow the boat or just be an AI.
        // Since we want the boat to create ripples, we can inject the boat's ripple.
        let boatX = 0, boatZ = 0;
        let boatStrength = 0;
        if (boatPosRef && boatPosRef.current) {
            boatX = boatPosRef.current[0];
            boatZ = boatPosRef.current[2];
            // Infer boat speed from movement (we could track delta, but just apply a constant ripple if moving)
            // Or just always have a small ripple.
            boatStrength = 0.5; // Example constant ripple
        }

        // Update Fishes
        fishes.forEach((f, i) => {
            if (!f.isPlayer) {
                f.facing += Math.sin(time * 0.1 + i) * 0.02;
                f.worldPos.add(new THREE.Vector2(Math.cos(f.facing) * 0.1, Math.sin(f.facing) * 0.1));
                f.y = -3 + Math.sin(time * 0.5 + i) * 1.5;
            } else {
                // If it's the player fish, maybe just let it wander too if we have the boat?
                f.facing += Math.sin(time * 0.1 + i) * 0.02;
                f.worldPos.add(new THREE.Vector2(Math.cos(f.facing) * 0.1, Math.sin(f.facing) * 0.1));
                f.y = -2 + Math.sin(time * 0.5) * 0.5;
            }

            // Wrapping logic based on center
            const rX = posMod(f.worldPos.x - centerX + ECO_SIZE / 2, ECO_SIZE) - ECO_SIZE / 2 + centerX;
            const rZ = posMod(f.worldPos.y - centerZ + ECO_SIZE / 2, ECO_SIZE) - ECO_SIZE / 2 + centerZ;
            
            const refs = fishesRefs.current[i];
            if (refs.mesh && refs.shadow) {
                refs.mesh.position.set(rX, f.y, rZ);
                // In AlinMap XZ is plane. So rotation is on Y axis.
                // Original fish3D: rotation.z = f.facing - PI/2.
                // Since our mesh is XZ, rotating around Y:
                refs.mesh.rotation.x = -Math.PI / 2; // Flat on plane
                refs.mesh.rotation.z = f.facing - Math.PI / 2; // Point in direction
                
                f.meshMat.uniforms.time.value = time;
                
                refs.shadow.position.set(rX + 2.0, -24.5, rZ + 2.0);
                refs.shadow.rotation.x = -Math.PI / 2;
                refs.shadow.rotation.z = refs.mesh.rotation.z;
            }

            // Ripple Uniforms update
            let strength = f.isPlayer ? 0.06 : 0.06;
            // Overwrite first ripple with Boat if available
            if (i === 0 && boatStrength > 0) {
                simMaterial.uniforms.rippleData.value[i].set(
                    posMod(boatX, ECO_SIZE) / ECO_SIZE,
                    posMod(boatZ, ECO_SIZE) / ECO_SIZE,
                    boatStrength
                );
            } else {
                simMaterial.uniforms.rippleData.value[i].set(
                    posMod(f.worldPos.x, ECO_SIZE) / ECO_SIZE,
                    posMod(f.worldPos.y, ECO_SIZE) / ECO_SIZE,
                    strength * THREE.MathUtils.smoothstep(f.y, -6.0, -0.5)
                );
            }
        });

        // Update Lilypads
        lilypads.forEach((l, i) => {
            const rX = posMod(l.worldPos.x - centerX + ECO_SIZE / 2, ECO_SIZE) - ECO_SIZE / 2 + centerX;
            const rZ = posMod(l.worldPos.y - centerZ + ECO_SIZE / 2, ECO_SIZE) - ECO_SIZE / 2 + centerZ;
            
            const refs = lilypadsRefs.current[i];
            if (refs.mesh && refs.shadow) {
                refs.mesh.position.set(rX, -0.4 + Math.sin(time + i) * 0.1, rZ);
                refs.mesh.rotation.x = -Math.PI / 2;
                refs.mesh.rotation.z = l.rot + Math.sin(time * 0.3 + i) * 0.1;
                
                refs.shadow.position.set(rX + 3.0, -24.8, rZ + 3.0);
                refs.shadow.rotation.x = -Math.PI / 2;
                refs.shadow.rotation.z = refs.mesh.rotation.z;
            }
        });

        // FBO Ping-Pong
        simMaterial.uniforms.tWater.value = rtRef.current.rtA.texture;
        simMaterial.uniforms.camUv.value.set(posMod(centerX, ECO_SIZE) / ECO_SIZE, posMod(centerZ, ECO_SIZE) / ECO_SIZE);
        
        // Render to rtB
        gl.setRenderTarget(rtRef.current.rtB);
        gl.render(simScene, orthoCamera);
        
        // Swap
        const temp = rtRef.current.rtA;
        rtRef.current.rtA = rtRef.current.rtB;
        rtRef.current.rtB = temp;

        // Apply new texture to water
        waterMaterial.uniforms.tWater.value = rtRef.current.rtA.texture;
        
        // Return render target to canvas
        gl.setRenderTarget(null);
    });

    return (
        <group>
            {/* Floor */}
            <mesh ref={floorRef} material={floorMaterial} rotation-x={-Math.PI / 2}>
                <planeGeometry args={[12000, 12000]} />
            </mesh>

            {/* Fishes */}
            {fishes.map((f, i) => (
                <group key={`fish-${i}`}>
                    <mesh 
                        ref={(el) => { fishesRefs.current[i].mesh = el; }} 
                        material={f.meshMat}
                    >
                        <planeGeometry args={[3, 6]} />
                    </mesh>
                    <mesh 
                        ref={(el) => { fishesRefs.current[i].shadow = el; }} 
                        material={f.shadowMat}
                    >
                        <planeGeometry args={[3, 6]} />
                    </mesh>
                </group>
            ))}

            {/* Lilypads */}
            {lilypads.map((l, i) => (
                <group key={`lily-${i}`}>
                    <mesh 
                        ref={(el) => { lilypadsRefs.current[i].mesh = el; }} 
                        material={l.meshMat}
                    >
                        <planeGeometry args={[8, 8]} />
                    </mesh>
                    <mesh 
                        ref={(el) => { lilypadsRefs.current[i].shadow = el; }} 
                        material={l.shadowMat}
                    >
                        <planeGeometry args={[8, 8]} />
                    </mesh>
                </group>
            ))}

            {/* Water Surface */}
            <mesh ref={waterRef} material={waterMaterial} rotation-x={-Math.PI / 2}>
                <planeGeometry args={[12000, 12000]} />
            </mesh>
        </group>
    );
}

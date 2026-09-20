"use client";

import * as THREE from "three";
import { ContactShadows, Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import type { DesignPlacement, DesignState } from "@/lib/design";
import type { CameraPreset } from "@/lib/design/presentation";
import {
  createDesignRenderPlan,
  getArchitecturalPlacement,
  getAssetLocalTransform,
  type NormalizedAssetManifestEntry,
  type RenderablePlacement,
} from "@/lib/renderer/designStateRenderer";
import {
  generateCalacattaMarbleCanvas,
  generateFlutedSlatCanvas,
  generateHonedPorcelainCanvas,
  generateTerrazzoCanvas,
  resolveTemplateAesthetic,
  type TemplateAesthetic,
} from "@/lib/renderer/architecturalAesthetics";
import { applyFixtureDisplayMaterials } from "@/lib/renderer/fixtureMaterialSystem";

function pseudoRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function useArchitecturalMaterials(room: DesignState["room"], aesthetic: TemplateAesthetic) {
  return useMemo(() => {
    if (typeof document === "undefined") {
      return null;
    }

    // 1. Template-calibrated Floor Texture (Restrained Architectural Porcelain / Stone)
    let floorTexture: THREE.CanvasTexture | null = null;
    if (aesthetic.floorArchetype === "calacatta_marble") {
      const c = generateCalacattaMarbleCanvas(aesthetic.floorBaseColor, 1024, 1024);
      if (c) {
        floorTexture = new THREE.CanvasTexture(c);
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(room.widthM / 1.5, room.depthM / 1.5);
      }
    } else {
      const c = generateHonedPorcelainCanvas(aesthetic.floorBaseColor, 1024, 1024);
      if (c) {
        floorTexture = new THREE.CanvasTexture(c);
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(room.widthM / 1.2, room.depthM / 1.2);
      }
    }

    // 2. Vanity Feature Wall Texture
    let vanityWallTexture: THREE.CanvasTexture | null = null;
    if (aesthetic.vanityWallArchetype === "warm_terrazzo") {
      const c = generateTerrazzoCanvas(aesthetic.vanityWallBaseColor, "warm", 1024, 1024);
      if (c) {
        vanityWallTexture = new THREE.CanvasTexture(c);
        vanityWallTexture.wrapS = THREE.RepeatWrapping;
        vanityWallTexture.wrapT = THREE.RepeatWrapping;
        vanityWallTexture.repeat.set(room.widthM / 1.6, room.heightM / 1.6);
      }
    } else if (aesthetic.vanityWallArchetype === "calacatta_marble") {
      const c = generateCalacattaMarbleCanvas(aesthetic.vanityWallBaseColor, 1024, 1024);
      if (c) {
        vanityWallTexture = new THREE.CanvasTexture(c);
        vanityWallTexture.wrapS = THREE.RepeatWrapping;
        vanityWallTexture.wrapT = THREE.RepeatWrapping;
        vanityWallTexture.repeat.set(1.2, 1.2);
      }
    } else {
      // Fluted travertine or raked plaster
      const featCanvas = document.createElement("canvas");
      featCanvas.width = 512;
      featCanvas.height = 512;
      const featCtx = featCanvas.getContext("2d");
      if (featCtx) {
        featCtx.fillStyle = aesthetic.vanityWallBaseColor;
        featCtx.fillRect(0, 0, 512, 512);
        const slatWidth = 14;
        for (let x = 0; x < 512; x += slatWidth) {
          featCtx.fillStyle = "rgba(40, 32, 24, 0.15)";
          featCtx.fillRect(x + slatWidth - 2, 0, 2, 512);
          featCtx.fillStyle = "rgba(255, 252, 245, 0.12)";
          featCtx.fillRect(x, 0, 2, 512);
        }
      }
      vanityWallTexture = new THREE.CanvasTexture(featCanvas);
      vanityWallTexture.wrapS = THREE.RepeatWrapping;
      vanityWallTexture.wrapT = THREE.RepeatWrapping;
      vanityWallTexture.repeat.set(room.widthM / 0.8, 1);
    }

    // 3. Wet Zone Shower Wall Texture
    let wetWallTexture: THREE.CanvasTexture | null = null;
    if (aesthetic.wetWallArchetype === "grey_terrazzo") {
      const c = generateTerrazzoCanvas(aesthetic.wetWallBaseColor, "grey", 1024, 1024);
      if (c) {
        wetWallTexture = new THREE.CanvasTexture(c);
        wetWallTexture.wrapS = THREE.RepeatWrapping;
        wetWallTexture.wrapT = THREE.RepeatWrapping;
        wetWallTexture.repeat.set(room.widthM / 1.6, room.heightM / 1.6);
      }
    } else if (aesthetic.wetWallArchetype === "calacatta_marble") {
      const c = generateCalacattaMarbleCanvas(aesthetic.wetWallBaseColor, 1024, 1024);
      if (c) {
        wetWallTexture = new THREE.CanvasTexture(c);
        wetWallTexture.wrapS = THREE.RepeatWrapping;
        wetWallTexture.wrapT = THREE.RepeatWrapping;
        wetWallTexture.repeat.set(1.2, 1.2);
      }
    } else {
      const wetCanvas = document.createElement("canvas");
      wetCanvas.width = 512;
      wetCanvas.height = 512;
      const wetCtx = wetCanvas.getContext("2d");
      if (wetCtx) {
        wetCtx.fillStyle = aesthetic.wetWallBaseColor;
        wetCtx.fillRect(0, 0, 512, 512);
        // Horizontal stone slab joint lines
        wetCtx.strokeStyle = "rgba(30, 35, 40, 0.35)";
        wetCtx.lineWidth = 2.0;
        for (let y = 0; y <= 512; y += 128) {
          wetCtx.beginPath();
          wetCtx.moveTo(0, y);
          wetCtx.lineTo(512, y);
          wetCtx.stroke();
        }
      }
      wetWallTexture = new THREE.CanvasTexture(wetCanvas);
      wetWallTexture.wrapS = THREE.RepeatWrapping;
      wetWallTexture.wrapT = THREE.RepeatWrapping;
      wetWallTexture.repeat.set(1.5, room.heightM / 1.2);
    }

    // 4. Vanity Cabinet Fluted Front Texture
    let vanityFrontTexture: THREE.CanvasTexture | null = null;
    const flutedCanvas = generateFlutedSlatCanvas(
      aesthetic.vanityBodyColor,
      aesthetic.vanitySlatShadowColor,
      12,
      512,
      512,
    );
    if (flutedCanvas) {
      vanityFrontTexture = new THREE.CanvasTexture(flutedCanvas);
      vanityFrontTexture.wrapS = THREE.RepeatWrapping;
      vanityFrontTexture.wrapT = THREE.RepeatWrapping;
      vanityFrontTexture.repeat.set(3, 1);
    }

    // 5. Perimeter Wall Lime Plaster Texture
    const wallCanvas = document.createElement("canvas");
    wallCanvas.width = 512;
    wallCanvas.height = 512;
    const wCtx = wallCanvas.getContext("2d");
    if (wCtx) {
      wCtx.fillStyle = aesthetic.perimeterWallBaseColor;
      wCtx.fillRect(0, 0, 512, 512);
      let seed = 1337;
      for (let i = 0; i < 2500; i += 1) {
        const x = pseudoRandom(seed++) * 512;
        const y = pseudoRandom(seed++) * 512;
        const rad = 2 + pseudoRandom(seed++) * 8;
        wCtx.fillStyle = "rgba(30, 25, 20, 0.035)";
        wCtx.beginPath();
        wCtx.arc(x, y, rad, 0, Math.PI * 2);
        wCtx.fill();
      }
    }
    const wallTexture = new THREE.CanvasTexture(wallCanvas);
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(2, 2);

    return {
      floorTexture,
      vanityWallTexture,
      wetWallTexture,
      vanityFrontTexture,
      wallTexture,
    };
  }, [room.widthM, room.depthM, room.heightM, aesthetic]);
}

function CeilingDownlights({ widthM, depthM, heightM }: { widthM: number; depthM: number; heightM: number }) {
  const downlights = useMemo(
    () => [
      { id: "basin-zone", x: -widthM * 0.32, y: -depthM * 0.22 },
      { id: "toilet-zone", x: widthM * 0.32, y: -depthM * 0.22 },
      { id: "shower-zone", x: 0.05, y: 0.12 },
    ],
    [widthM, depthM],
  );

  return (
    <group position={[0, 0, heightM - 0.001]}>
      {downlights.map((dl) => (
        <group key={dl.id} position={[dl.x, dl.y, 0]}>
          <mesh rotation={[Math.PI, 0, 0]}>
            <ringGeometry args={[0.028, 0.044, 32]} />
            <meshStandardMaterial color="#e8e4dc" roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh rotation={[Math.PI, 0, 0]}>
            <circleGeometry args={[0.028, 32]} />
            <meshStandardMaterial
              color="#fffcf5"
              emissive="#fffaee"
              emissiveIntensity={0.65}
              roughness={0.15}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function BathroomRoom({
  room,
  aesthetic,
  materials,
}: {
  room: DesignState["room"];
  aesthetic: TemplateAesthetic;
  materials: ReturnType<typeof useArchitecturalMaterials>;
}) {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const dirTargetRef = useRef<THREE.Object3D>(null);

  useEffect(() => {
    if (dirLightRef.current && dirTargetRef.current) {
      dirLightRef.current.target = dirTargetRef.current;
      dirLightRef.current.target.updateMatrixWorld();
    }
  }, []);

  return (
    <>
      <color attach="background" args={["#ece7df"]} />
      <fog
        attach="fog"
        args={[
          "#ece7df",
          Math.max(room.widthM, room.depthM) * 3.5,
          Math.max(room.widthM, room.depthM) * 7.5,
        ]}
      />

      <object3D ref={dirTargetRef} position={[0, -room.depthM * 0.25, 0.5]} />

      {/* --- Continuous Architectural Finished Floor at Z = 0 --- */}
      <group>
        {/* Subfloor foundation slab strictly below finished floor */}
        <mesh receiveShadow position={[0, 0, -0.04]}>
          <boxGeometry args={[room.widthM + 0.08, room.depthM + 0.08, 0.04]} />
          <meshStandardMaterial color="#2d2925" roughness={0.8} />
        </mesh>

        {/* Finished architectural floor at Z = 0 */}
        <mesh receiveShadow position={[0, 0, 0]}>
          <planeGeometry args={[room.widthM, room.depthM]} />
          <meshStandardMaterial
            map={materials?.floorTexture ?? null}
            color={aesthetic.floorBaseColor}
            roughness={aesthetic.floorRoughness}
            metalness={aesthetic.floorMetalness}
          />
        </mesh>

        {/* Skirting shadowline trim */}
        <mesh position={[0, -room.depthM / 2 + 0.004, 0.01]}>
          <boxGeometry args={[room.widthM, 0.008, 0.02]} />
          <meshStandardMaterial color={aesthetic.skirtingColor} roughness={0.5} />
        </mesh>
        <mesh position={[0, room.depthM / 2 - 0.004, 0.01]}>
          <boxGeometry args={[room.widthM, 0.008, 0.02]} />
          <meshStandardMaterial color={aesthetic.skirtingColor} roughness={0.5} />
        </mesh>
        <mesh position={[-room.widthM / 2 + 0.004, 0, 0.01]}>
          <boxGeometry args={[0.008, room.depthM, 0.02]} />
          <meshStandardMaterial color={aesthetic.skirtingColor} roughness={0.5} />
        </mesh>
        <mesh position={[room.widthM / 2 - 0.004, 0, 0.01]}>
          <boxGeometry args={[0.008, room.depthM, 0.02]} />
          <meshStandardMaterial color={aesthetic.skirtingColor} roughness={0.5} />
        </mesh>
      </group>

      {/* --- Zoned South Feature Back Wall --- */}
      {/* Vanity Feature Zone Wall (negative X in world = right on screen): Warm Terrazzo */}
      <mesh
        receiveShadow
        position={[-room.widthM / 4, -room.depthM / 2 - 0.008, room.heightM / 2]}
      >
        <boxGeometry args={[room.widthM / 2, 0.016, room.heightM]} />
        <meshStandardMaterial
          map={materials?.vanityWallTexture ?? null}
          color={aesthetic.vanityWallBaseColor}
          roughness={aesthetic.vanityWallRoughness}
        />
      </mesh>

      {/* Shower Wet Zone Wall (positive X in world = left on screen): Grey Terrazzo / Stone */}
      <mesh
        receiveShadow
        position={[room.widthM / 4, -room.depthM / 2 - 0.008, room.heightM / 2]}
      >
        <boxGeometry args={[room.widthM / 2, 0.016, room.heightM]} />
        <meshStandardMaterial
          map={materials?.wetWallTexture ?? null}
          color={aesthetic.wetWallBaseColor}
          roughness={aesthetic.wetWallRoughness}
        />
      </mesh>

      {/* North Wall: Architectural Entrance */}
      <mesh
        receiveShadow
        castShadow
        position={[(-room.widthM / 2 - 0.44) / 2, room.depthM / 2 + 0.05, room.heightM / 2]}
      >
        <boxGeometry args={[room.widthM / 2 - 0.44, 0.1, room.heightM]} />
        <meshStandardMaterial
          map={materials?.wallTexture ?? null}
          color={aesthetic.perimeterWallBaseColor}
          roughness={aesthetic.perimeterWallRoughness}
        />
      </mesh>
      <mesh
        receiveShadow
        castShadow={false}
        position={[(0.44 + room.widthM / 2) / 2, room.depthM / 2 + 0.05, room.heightM / 2]}
      >
        <boxGeometry args={[room.widthM / 2 - 0.44, 0.1, room.heightM]} />
        <meshStandardMaterial
          map={materials?.wallTexture ?? null}
          color={aesthetic.perimeterWallBaseColor}
          roughness={aesthetic.perimeterWallRoughness}
        />
      </mesh>
      <mesh
        receiveShadow
        castShadow={false}
        position={[0, room.depthM / 2 + 0.05, 2.15 + (room.heightM - 2.15) / 2]}
      >
        <boxGeometry args={[0.88, 0.1, room.heightM - 2.15]} />
        <meshStandardMaterial
          map={materials?.wallTexture ?? null}
          color={aesthetic.perimeterWallBaseColor}
          roughness={aesthetic.perimeterWallRoughness}
        />
      </mesh>

      {/* West Wall */}
      <mesh
        receiveShadow
        position={[-room.widthM / 2, 0, room.heightM / 2]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[room.heightM, room.depthM]} />
        <meshStandardMaterial
          map={materials?.wallTexture ?? null}
          color={aesthetic.perimeterWallBaseColor}
          roughness={aesthetic.perimeterWallRoughness}
        />
      </mesh>

      {/* East Wall */}
      <mesh
        receiveShadow
        position={[room.widthM / 2, 0, room.heightM / 2]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[room.heightM, room.depthM]} />
        <meshStandardMaterial
          map={materials?.wallTexture ?? null}
          color={aesthetic.perimeterWallBaseColor}
          roughness={aesthetic.perimeterWallRoughness}
        />
      </mesh>

      {/* Ceiling at Z = room.heightM */}
      <mesh receiveShadow position={[0, 0, room.heightM]} rotation={[Math.PI, 0, 0]}>
        <planeGeometry args={[room.widthM, room.depthM]} />
        <meshStandardMaterial color="#f6f4f0" roughness={0.92} />
      </mesh>

      <CeilingDownlights widthM={room.widthM} depthM={room.depthM} heightM={room.heightM} />

      {/* --- Architectural Lighting (Simplified Key & Fill) --- */}
      <ambientLight intensity={aesthetic.ambientIntensity} color={aesthetic.ambientLightColor} />
      <hemisphereLight args={[aesthetic.hemiSkyColor, aesthetic.hemiGroundColor, 0.65]} />

      <directionalLight
        ref={dirLightRef}
        castShadow
        position={[0.2, 0.45, room.heightM * 0.9]}
        intensity={aesthetic.sunIntensity}
        color={aesthetic.sunLightColor}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={0.0003}
        shadow-camera-left={-room.widthM}
        shadow-camera-right={room.widthM}
        shadow-camera-top={room.depthM}
        shadow-camera-bottom={-room.depthM}
      />

      <ContactShadows
        position={[0, 0, 0.001]}
        opacity={0.32}
        scale={Math.max(room.widthM, room.depthM) * 1.8}
        blur={1.8}
        far={room.heightM * 0.8}
        resolution={1024}
        color="#201c18"
      />
    </>
  );
}

function CameraFrame({
  cameraPreset,
  focusedPlacement,
}: {
  room: DesignState["room"];
  cameraPreset?: CameraPreset;
  focusedPlacement?: DesignPlacement | null;
}) {
  const { camera, controls } = useThree();
  useEffect(() => {
    camera.up.set(0, 0, 1);
    let pos: [number, number, number];
    let target: [number, number, number];

    if (focusedPlacement) {
      const px = focusedPlacement.position.x;
      const py = focusedPlacement.position.y;
      const pz = focusedPlacement.position.z;
      const isBasin = focusedPlacement.role.includes("basin") || focusedPlacement.role.includes("vanity");
      const isToilet = focusedPlacement.role.includes("toilet");
      const isShower = focusedPlacement.role.includes("shower") || focusedPlacement.role.includes("rainhead");

      if (isBasin) {
        pos = [px > 0 ? 0.2 : -0.2, py + 1.0, pz + 0.35];
        target = [px, py, pz + 0.15];
      } else if (isToilet) {
        pos = [px > 0 ? 0.25 : -0.25, py + 1.0, pz + 0.6];
        target = [px, py, pz + 0.2];
      } else if (isShower) {
        pos = [px * 0.4, py + 1.0, pz - 0.4];
        target = [px, py, pz - 0.8];
      } else {
        pos = [px * 0.35, py + 0.9, pz + 0.5];
        target = [px, py, pz + 0.2];
      }
    } else {
      pos = cameraPreset?.position ?? [-0.25, 0.85, 1.38];
      target = cameraPreset?.target ?? [0.0, -0.45, 1.15];
    }

    camera.position.set(pos[0], pos[1], pos[2]);

    if (controls && "target" in controls && typeof (controls as unknown as { update: () => void }).update === "function") {
      const c = controls as unknown as { target: THREE.Vector3; update: () => void };
      c.target.set(target[0], target[1], target[2]);
      c.update();
    } else {
      camera.lookAt(target[0], target[1], target[2]);
    }
    camera.updateProjectionMatrix();
  }, [camera, cameraPreset, controls, focusedPlacement]);
  return null;
}

function GlassShowerScreen({ room }: { room: DesignState["room"] }) {
  // Lookbook pages 14, 16, 26, 28:
  // Minimalist 10mm safety glass partition separating shower zone
  const glassWidth = 0.96;
  const glassHeight = 2.20;
  const glassThickness = 0.01;
  const glassX = 0.28;
  const backWallY = -room.depthM / 2;
  const glassCenterY = backWallY + glassWidth / 2;

  return (
    <group position={[glassX, glassCenterY, glassHeight / 2]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[glassThickness, glassWidth, glassHeight]} />
        <meshPhysicalMaterial
          transparent
          opacity={0.24}
          roughness={0.04}
          metalness={0.05}
          transmission={0.94}
          ior={1.52}
          color="#edf6f9"
        />
      </mesh>
      {/* Floor Channel */}
      <mesh position={[0, 0, -glassHeight / 2 + 0.01]}>
        <boxGeometry args={[0.024, glassWidth, 0.02]} />
        <meshStandardMaterial color="#1a1816" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Wall Profile Channel */}
      <mesh position={[0, -glassWidth / 2 + 0.008, 0]}>
        <boxGeometry args={[0.024, 0.016, glassHeight]} />
        <meshStandardMaterial color="#1a1816" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Top Stabilizer Bracebar */}
      <mesh position={[0, -glassWidth / 4, glassHeight / 2 - 0.015]}>
        <boxGeometry args={[0.02, glassWidth / 2, 0.02]} />
        <meshStandardMaterial color="#1a1816" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}

/**
 * Concealed Cistern Architectural Joinery & Illuminated Niche
 * Inspired directly by Lookbook page 16:
 * Floor-to-ceiling cabinetry behind the toilet with warm illuminated niche,
 * dual-flush actuator plate, and side-mounted chrome health faucet.
 */
function ConcealedCisternJoinery({
  toiletItem,
  room,
  aesthetic,
}: {
  toiletItem: RenderablePlacement;
  room: DesignState["room"];
  aesthetic: TemplateAesthetic;
}) {
  const arch = useMemo(
    () => getArchitecturalPlacement(toiletItem.placement, toiletItem.asset, room),
    [toiletItem.placement, toiletItem.asset, room],
  );
  const [assetWidth, , assetDepth] = toiletItem.asset.normalizedBoundsM;
  const ductWidth = Math.max(0.82, (toiletItem.placement.footprint?.widthM ?? assetWidth) + 0.38);
  const ductDepth = 0.04; // 40mm slim flush wall duct
  const ductCenterY = assetDepth / 2 + ductDepth / 2;

  const flushFinishColor =
    aesthetic.flushPlateFinish === "brushed_brass"
      ? "#c9a463"
      : aesthetic.flushPlateFinish === "matte_black"
      ? "#1e1c1b"
      : aesthetic.flushPlateFinish === "brushed_nickel"
      ? "#b8b2a8"
      : "#e5eaee";

  return (
    <group position={arch.worldPosition} rotation={arch.worldRotation}>
      <group position={[0, ductCenterY, 0]}>
        {/* 1. Floor-to-Ceiling Joinery Panel */}
        <mesh position={[0, 0, room.heightM / 2]} castShadow receiveShadow>
          <boxGeometry args={[ductWidth, ductDepth, room.heightM]} />
          <meshStandardMaterial color={aesthetic.ductJoineryColor} roughness={0.62} metalness={0.02} />
        </mesh>

        {/* Architectural vertical shadowlines */}
        <mesh position={[-ductWidth / 2 + 0.002, -ductDepth / 2 - 0.001, room.heightM / 2]}>
          <boxGeometry args={[0.004, 0.002, room.heightM]} />
          <meshStandardMaterial color={aesthetic.ductShadowLineColor} roughness={0.9} />
        </mesh>
        <mesh position={[ductWidth / 2 - 0.002, -ductDepth / 2 - 0.001, room.heightM / 2]}>
          <boxGeometry args={[0.004, 0.002, room.heightM]} />
          <meshStandardMaterial color={aesthetic.ductShadowLineColor} roughness={0.9} />
        </mesh>
        {/* Cabinet horizontal division seam at Z = 1.05m */}
        <mesh position={[0, -ductDepth / 2 - 0.001, 1.05]}>
          <boxGeometry args={[ductWidth - 0.02, 0.002, 0.004]} />
          <meshStandardMaterial color={aesthetic.ductShadowLineColor} roughness={0.9} />
        </mesh>

        {/* 2. Recessed Illuminated Architectural Niche (Lookbook Page 16) */}
        <group position={[0, -ductDepth / 2 + 0.002, 1.30]}>
          {/* Niche Inset Backplate */}
          <mesh position={[0, 0.008, 0]}>
            <boxGeometry args={[ductWidth - 0.16, 0.012, 0.22]} />
            <meshStandardMaterial color={aesthetic.nicheBackColor} roughness={0.72} />
          </mesh>
          {/* Niche Slim Top & Bottom Framing Trim */}
          <mesh position={[0, -0.002, 0.11 - 0.004]}>
            <boxGeometry args={[ductWidth - 0.16, 0.008, 0.008]} />
            <meshStandardMaterial color={aesthetic.ductJoineryColor} roughness={0.62} />
          </mesh>
          <mesh position={[0, -0.002, -0.11 + 0.004]}>
            <boxGeometry args={[ductWidth - 0.16, 0.008, 0.008]} />
            <meshStandardMaterial color={aesthetic.ductJoineryColor} roughness={0.62} />
          </mesh>
          {/* Niche Top Warm LED Light Strip */}
          <mesh position={[0, -0.001, 0.11 - 0.012]}>
            <boxGeometry args={[ductWidth - 0.20, 0.006, 0.008]} />
            <meshStandardMaterial
              color="#fff8ef"
              emissive={aesthetic.nicheGlowColor}
              emissiveIntensity={aesthetic.nicheGlowIntensity}
              roughness={0.2}
            />
          </mesh>
          <pointLight
            position={[0, -0.02, 0.06]}
            color={aesthetic.nicheGlowColor}
            intensity={0.75}
            distance={0.55}
            decay={2}
          />

          {/* Miniature Luxury Amenities / Fragrance Bottles */}
          <mesh position={[-0.10, -0.006, -0.06]} castShadow>
            <cylinderGeometry args={[0.015, 0.017, 0.055, 20]} />
            <meshStandardMaterial color="#1a1918" roughness={0.25} metalness={0.4} />
          </mesh>
          <mesh position={[0.02, -0.006, -0.07]} castShadow>
            <cylinderGeometry args={[0.020, 0.020, 0.038, 20]} />
            <meshStandardMaterial color="#8a532d" roughness={0.18} metalness={0.1} />
          </mesh>
          <mesh position={[0.11, -0.006, -0.06]} castShadow>
            <cylinderGeometry args={[0.014, 0.014, 0.055, 20]} />
            <meshStandardMaterial color="#eef2f5" roughness={0.3} metalness={0.1} />
          </mesh>
        </group>

        {/* 3. Flush Pneumatic Dual-Flush Actuator Plate */}
        <group position={[0, -ductDepth / 2 - 0.004, 0.90]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.22, 0.006, 0.15]} />
            <meshStandardMaterial color={flushFinishColor} roughness={0.28} metalness={0.82} />
          </mesh>
          <mesh position={[-0.042, -0.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.026, 0.026, 0.004, 32]} />
            <meshStandardMaterial color={flushFinishColor} roughness={0.20} metalness={0.85} />
          </mesh>
          <mesh position={[0.042, -0.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.036, 0.036, 0.004, 32]} />
            <meshStandardMaterial color={flushFinishColor} roughness={0.20} metalness={0.85} />
          </mesh>
        </group>

        {/* 4. Chrome Health Faucet / Bidet Spray Wall Assembly */}
        <group position={[-ductWidth / 2 - 0.10, -ductDepth / 2, 0.65]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.015, 24]} />
            <meshStandardMaterial color="#e6edf2" roughness={0.22} metalness={0.88} />
          </mesh>
          <mesh position={[0, -0.04, 0.04]} rotation={[0.3, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.016, 0.14, 20]} />
            <meshStandardMaterial color="#e6edf2" roughness={0.22} metalness={0.88} />
          </mesh>
          <mesh position={[0, -0.02, -0.16]}>
            <torusGeometry args={[0.09, 0.008, 12, 32, Math.PI]} />
            <meshStandardMaterial color="#c0c7cc" roughness={0.35} metalness={0.75} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * Floating Architectural Vanity Console with Fluted Front & Top-Lit LED Mirror
 * Directly matches Lookbook Page 16:
 * Reeded/fluted cabinet front with half-moon pull, slim polished marble countertop,
 * warm under-cabinet cove glow, and top horizontal frosted LED light bar mirror.
 */
function FloatingVanityUnit({
  basinItem,
  room,
  aesthetic,
  materials,
}: {
  basinItem: RenderablePlacement;
  room: DesignState["room"];
  aesthetic: TemplateAesthetic;
  materials: ReturnType<typeof useArchitecturalMaterials>;
}) {
  const arch = useMemo(
    () => getArchitecturalPlacement(basinItem.placement, basinItem.asset, room),
    [basinItem.placement, basinItem.asset, room],
  );
  const [assetWidth] = basinItem.asset.normalizedBoundsM;
  const vanityWidth = Math.max(0.86, (basinItem.placement.footprint?.widthM ?? assetWidth) + 0.35);
  const vanityDepth = 0.52;
  const counterZ = 0.72;
  const slabThickness = 0.028; // Slim elegant 28mm polished marble slab
  const cabinetHeight = 0.32;
  const cabinetZ = counterZ - slabThickness - cabinetHeight / 2;

  return (
    <group position={[arch.worldPosition[0], arch.worldPosition[1], 0]} rotation={arch.worldRotation}>
      {/* 1. Polished Natural Stone Countertop Slab at Z = 0.72m */}
      <mesh position={[0, 0, counterZ - slabThickness / 2]} castShadow receiveShadow>
        <boxGeometry args={[vanityWidth, vanityDepth, slabThickness]} />
        <meshStandardMaterial
          color={aesthetic.countertopBaseColor}
          roughness={aesthetic.countertopRoughness}
          metalness={aesthetic.countertopMetalness}
        />
      </mesh>

      {/* 2. Floating Cabinet Body with Fluted/Reeded Slats */}
      <mesh position={[0, 0.01, cabinetZ]} castShadow receiveShadow>
        <boxGeometry args={[vanityWidth - 0.02, vanityDepth - 0.03, cabinetHeight]} />
        <meshStandardMaterial
          map={materials?.vanityFrontTexture ?? null}
          color={aesthetic.vanityBodyColor}
          roughness={0.65}
          metalness={0.02}
        />
      </mesh>

      {/* Fluted Front Face Panel with Dedicated Texture Map */}
      <mesh
        position={[0, -vanityDepth / 2 + 0.001, cabinetZ]}
        rotation={[0, Math.PI, 0]}
        castShadow
        receiveShadow
      >
        <planeGeometry args={[vanityWidth - 0.02, cabinetHeight]} />
        <meshStandardMaterial
          map={materials?.vanityFrontTexture ?? null}
          color={aesthetic.vanityBodyColor}
          roughness={0.65}
          metalness={0.02}
        />
      </mesh>

      {/* Architectural Half-Moon Handle Pull (Lookbook Page 16) */}
      <mesh position={[0, -vanityDepth / 2 - 0.005, cabinetZ + cabinetHeight / 2 - 0.04]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.008, 32, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#c29d66" roughness={0.28} metalness={0.82} />
      </mesh>

      {/* 3. Concealed Under-Cabinet Warm LED Cove Lighting (Washing the floor) */}
      <mesh position={[0, 0, cabinetZ - cabinetHeight / 2 + 0.005]}>
        <boxGeometry args={[vanityWidth - 0.06, vanityDepth - 0.08, 0.008]} />
        <meshStandardMaterial
          color="#fff6ed"
          emissive={aesthetic.underVanityGlowColor}
          emissiveIntensity={aesthetic.underVanityGlowIntensity}
          roughness={0.2}
        />
      </mesh>
      <pointLight
        position={[0, 0, cabinetZ - cabinetHeight / 2 - 0.08]}
        color={aesthetic.underVanityGlowColor}
        intensity={aesthetic.underVanityGlowIntensity}
        distance={0.9}
        decay={2}
      />

      {/* 4. Minimalist Tall Deck Faucet */}
      <group position={[0, vanityDepth / 2 - 0.08, counterZ]}>
        <mesh position={[0, 0, 0.13]} castShadow>
          <cylinderGeometry args={[0.016, 0.02, 0.26, 24]} />
          <meshStandardMaterial color="#f0ece4" roughness={0.28} metalness={0.75} />
        </mesh>
        <mesh position={[0, -0.06, 0.25]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.014, 0.13, 24]} />
          <meshStandardMaterial color="#f0ece4" roughness={0.28} metalness={0.75} />
        </mesh>
        <mesh position={[0, 0.015, 0.26]} rotation={[0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.014, 0.065, 0.01]} />
          <meshStandardMaterial color="#f0ece4" roughness={0.28} metalness={0.75} />
        </mesh>
      </group>

      {/* 5. Architectural Mirror with Top LED Light Bar (Lookbook Page 16) */}
      <group position={[0, vanityDepth / 2 - 0.01, 1.62]}>
        {/* Soft Warm Halo Glow Plane on Feature Wall */}
        <mesh position={[0, 0.012, 0]}>
          <planeGeometry args={[0.64, 1.0]} />
          <meshBasicMaterial color="#fff8e8" transparent opacity={0.35} />
        </mesh>

        {/* Slim Black Frame Bezel */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.56, 0.018, 0.94]} />
          <meshStandardMaterial color="#22201d" roughness={0.4} metalness={0.3} />
        </mesh>

        {/* Luminous Mirror Glass Surface */}
        <mesh position={[0, -0.010, 0]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.54, 0.92]} />
          <meshStandardMaterial
            color="#eef3f7"
            roughness={0.12}
            metalness={0.75}
            emissive="#ffffff"
            emissiveIntensity={0.10}
          />
        </mesh>

        {/* Integrated Frosted LED Top Light Bar Diffuser (Lookbook Page 16) */}
        <mesh position={[0, -0.018, 0.47 - 0.038 / 2]}>
          <boxGeometry args={[0.44, 0.016, 0.038]} />
          <meshStandardMaterial
            color="#fffcf7"
            emissive={aesthetic.mirrorLightColor}
            emissiveIntensity={aesthetic.mirrorLightIntensity}
            roughness={0.15}
          />
        </mesh>
        <pointLight
          position={[0, -0.06, 0.47]}
          color={aesthetic.mirrorLightColor}
          intensity={0.9}
          distance={1.1}
          decay={2}
        />
      </group>
    </group>
  );
}

function ProductAsset({
  item,
  room,
  isEditing = false,
  isSelected = false,
  isValid = true,
  onSelect,
  onLoaded,
}: {
  item: RenderablePlacement;
  room: DesignState["room"];
  isEditing?: boolean;
  isSelected?: boolean;
  isValid?: boolean;
  onSelect?: (productCode: string) => void;
  onLoaded: (productCode: string) => void;
}) {
  const gltf = useGLTF(item.asset.url);
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    applyFixtureDisplayMaterials(cloned, item.placement);
    return cloned;
  }, [gltf.scene, item.placement]);

  useEffect(() => onLoaded(item.placement.productCode), [item.placement.productCode, onLoaded]);

  const arch = useMemo(
    () => getArchitecturalPlacement(item.placement, item.asset, room),
    [item.placement, item.asset, room],
  );
  const localTransform = getAssetLocalTransform(item.asset, item.placement);
  const [assetWidth, , assetDepth] = item.asset.normalizedBoundsM;

  return (
    <group position={arch.worldPosition} rotation={arch.worldRotation}>
      {/* 3D Product Geometry */}
      <group
        rotation={localTransform.rotation}
        onClick={(e) => {
          if (isEditing) {
            e.stopPropagation();
            onSelect?.(item.placement.productCode);
          }
        }}
        onPointerOver={(e) => {
          if (isEditing) {
            e.stopPropagation();
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={() => {
          if (isEditing) {
            document.body.style.cursor = "auto";
          }
        }}
      >
        <group position={localTransform.position}>
          <primitive object={scene as Group} />
        </group>
      </group>

      {/* Visual Selection Ring in Edit Mode */}
      {isEditing && isSelected && (
        <group position={[0, 0, 0.008]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry
              args={[
                Math.max(assetWidth, assetDepth) * 0.45,
                Math.max(assetWidth, assetDepth) * 0.49,
                32,
              ]}
            />
            <meshBasicMaterial
              color={isValid ? "#c49a45" : "#f43f5e"}
              transparent
              opacity={0.85}
            />
          </mesh>
          <mesh>
            <circleGeometry args={[Math.max(assetWidth, assetDepth) * 0.45, 32]} />
            <meshBasicMaterial
              color={isValid ? "#c49a45" : "#f43f5e"}
              transparent
              opacity={0.14}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

function EditFloorDragPlane({
  room,
  onDragMove,
  setIsDragging,
  onClickFloor,
}: {
  room: DesignState["room"];
  onDragMove: (newPos: { x: number; y: number; z: number }) => void;
  setIsDragging: (dragging: boolean) => void;
  onClickFloor?: (pos: { x: number; y: number; z: number }) => void;
}) {
  return (
    <mesh
      visible={false}
      position={[0, 0, 0.002]}
      onPointerDown={(e) => {
        e.stopPropagation();
        setIsDragging(true);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        setIsDragging(false);
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        onDragMove({ x: e.point.x, y: e.point.y, z: 0 });
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClickFloor?.({ x: e.point.x, y: e.point.y, z: 0 });
      }}
    >
      <planeGeometry args={[room.widthM * 2, room.depthM * 2]} />
    </mesh>
  );
}

function DesignProducts({
  plan,
  room,
  aesthetic,
  materials,
  isEditing = false,
  selectedProductCode,
  isValidPlacement = true,
  onSelectProduct,
  onDragMove,
  onClickFloor,
  setIsDragging,
  onLoaded,
}: {
  plan: ReturnType<typeof createDesignRenderPlan>;
  room: DesignState["room"];
  aesthetic: TemplateAesthetic;
  materials: ReturnType<typeof useArchitecturalMaterials>;
  isEditing?: boolean;
  selectedProductCode?: string | null;
  isValidPlacement?: boolean;
  onSelectProduct?: (productCode: string) => void;
  onDragMove?: (newPos: { x: number; y: number; z: number }) => void;
  onClickFloor?: (pos: { x: number; y: number; z: number }) => void;
  setIsDragging?: (dragging: boolean) => void;
  onLoaded: (productCode: string) => void;
}) {
  const unhostedBasins = useMemo(
    () =>
      plan.renderablePlacements.filter(
        (item) => item.placement.role === "basin" && item.placement.position.z === 0,
      ),
    [plan.renderablePlacements],
  );

  const toiletItem = useMemo(
    () => plan.renderablePlacements.find((item) => item.placement.role.includes("toilet")),
    [plan.renderablePlacements],
  );

  return (
    <>
      {/* Invisible Floor Drag Surface when in Edit Mode with a Selected Fixture */}
      {isEditing && selectedProductCode && onDragMove && setIsDragging && (
        <EditFloorDragPlane
          room={room}
          onDragMove={onDragMove}
          setIsDragging={setIsDragging}
          onClickFloor={onClickFloor}
        />
      )}

      {/* 1. Architectural Concealed Cistern Joinery & Niche behind toilet */}
      {toiletItem && (
        <ConcealedCisternJoinery
          toiletItem={toiletItem}
          room={room}
          aesthetic={aesthetic}
        />
      )}

      {/* 2. Floating Reeded Vanity & Backlit Mirror */}
      {unhostedBasins.map((item) => (
        <FloatingVanityUnit
          key={`vanity-${item.placement.productCode}`}
          basinItem={item}
          room={room}
          aesthetic={aesthetic}
          materials={materials}
        />
      ))}

      {/* 3. Glass Shower Screen */}
      <GlassShowerScreen room={room} />

      {/* 4. Real Normalized KOHLER 3D Fixtures */}
      {plan.renderablePlacements.map((item) => {
        const isSelected = selectedProductCode === item.placement.productCode;
        return (
          <ProductAsset
            key={item.placement.productCode}
            item={item}
            room={room}
            isEditing={isEditing}
            isSelected={isSelected}
            isValid={isValidPlacement}
            onSelect={onSelectProduct}
            onLoaded={onLoaded}
          />
        );
      })}
    </>
  );
}

function RendererIndicator({
  state,
  loadedCount,
  missingCount,
  visible = true,
}: {
  state: DesignState;
  loadedCount: number;
  missingCount: number;
  visible?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(true);

  if (!visible) return null;

  return (
    <div className="absolute left-4 top-4 z-20 max-w-xs rounded-xl border border-white/15 bg-black/60 px-3.5 py-2.5 text-xs text-white shadow-xl backdrop-blur-md transition-all">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold uppercase tracking-[0.16em] text-white/70">Diagnostics</p>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="cursor-pointer rounded px-1.5 py-0.5 text-[10px] text-white/50 hover:bg-white/10 hover:text-white"
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>
      {!collapsed && (
        <div className="mt-2 space-y-1 border-t border-white/10 pt-2 text-[11px] text-white/80">
          <p>Products: {state.selectedProducts.map((product) => product.productCode).join(", ") || "None"}</p>
          <p>Assets loaded: {loadedCount}</p>
          <p>Assets missing: {missingCount}</p>
          <p>Constraints: {state.validation.valid ? "valid" : "invalid"}</p>
        </div>
      )}
    </div>
  );
}

export interface BathroomCanvasProps {
  designState?: DesignState | null;
  templateId?: string;
  activeCameraPreset?: CameraPreset;
  focusedProductCode?: string | null;
  showDevIndicator?: boolean;
  onLoadedProduct?: (code: string) => void;
  className?: string;

  // Edit Mode Props
  isEditing?: boolean;
  selectedProductCode?: string | null;
  isValidPlacement?: boolean;
  onSelectProduct?: (productCode: string | null) => void;
  onDragMove?: (newPos: { x: number; y: number; z: number }) => void;
  onClickFloor?: (pos: { x: number; y: number; z: number }) => void;
}

export default function BathroomCanvas({
  designState: externalState,
  templateId,
  activeCameraPreset,
  focusedProductCode,
  showDevIndicator = true,
  onLoadedProduct,
  className,
  isEditing = false,
  selectedProductCode,
  isValidPlacement = true,
  onSelectProduct,
  onDragMove,
  onClickFloor,
}: BathroomCanvasProps = {}) {
  const [internalState, setInternalState] = useState<DesignState | null>(null);
  const [manifest, setManifest] = useState<NormalizedAssetManifestEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedProducts, setLoadedProducts] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const state = externalState ?? internalState;

  // Resolve template aesthetic tokens
  const aesthetic = useMemo(
    () => resolveTemplateAesthetic(templateId, state?.style),
    [templateId, state?.style],
  );

  // Generate template-calibrated PBR textures
  const materials = useArchitecturalMaterials(
    state?.room ?? { widthM: 2.44, depthM: 1.83, heightM: 2.74, doors: [], windows: [] },
    aesthetic,
  );

  useEffect(() => {
    let active = true;
    const fetchPromises: Promise<unknown>[] = [
      fetch("/api/asset-manifest").then((res) => {
        if (!res.ok) throw new Error(`Asset manifest request failed (${res.status}).`);
        return res.json() as Promise<NormalizedAssetManifestEntry[]>;
      }),
    ];

    if (!externalState) {
      fetchPromises.push(
        fetch("/api/design-state").then((res) => {
          if (!res.ok) throw new Error(`DesignState request failed (${res.status}).`);
          return res.json() as Promise<DesignState>;
        }),
      );
    }

    Promise.all(fetchPromises)
      .then(([assetManifest, fetchedDesignState]) => {
        if (!active) return;
        setManifest(assetManifest as NormalizedAssetManifestEntry[]);
        if (fetchedDesignState) {
          const actualState =
            typeof fetchedDesignState === "object" &&
            fetchedDesignState !== null &&
            "state" in fetchedDesignState
              ? (fetchedDesignState as { state: DesignState }).state
              : (fetchedDesignState as DesignState);
          setInternalState(actualState);
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load design.");
      });

    return () => {
      active = false;
    };
  }, [externalState]);

  const plan = useMemo(
    () => (state ? createDesignRenderPlan(state, manifest) : null),
    [manifest, state],
  );

  const onLoaded = useCallback(
    (productCode: string) => {
      setLoadedProducts((current) => (current.includes(productCode) ? current : [...current, productCode]));
      onLoadedProduct?.(productCode);
    },
    [onLoadedProduct],
  );

  const focusedPlacement = useMemo(() => {
    if (!state || !focusedProductCode) return null;
    return state.placements.find((p) => p.productCode === focusedProductCode) ?? null;
  }, [state, focusedProductCode]);

  if (!state || !plan) {
    return (
      <div className={`flex h-full items-center justify-center bg-neutral-950 text-sm text-white/70 ${className ?? ""}`}>
        {loadError ?? "Loading generated bathroom design..."}
      </div>
    );
  }

  const cameraPosition = activeCameraPreset?.position ?? ([-0.25, 0.85, 1.38] as [number, number, number]);
  const cameraTarget = activeCameraPreset?.target ?? ([0.0, -0.45, 1.15] as [number, number, number]);
  const cameraFov = activeCameraPreset?.fov ?? 70;

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        style={{ background: "#ece7df" }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{
          position: cameraPosition,
          up: [0, 0, 1],
          fov: cameraFov,
          near: 0.05,
          far: 25,
        }}
      >
        <Environment preset="city" environmentIntensity={0.45} />
        <CameraFrame
          room={state.room}
          cameraPreset={activeCameraPreset}
          focusedPlacement={focusedPlacement}
        />
        <BathroomRoom room={state.room} aesthetic={aesthetic} materials={materials} />
        <DesignProducts
          plan={plan}
          room={state.room}
          aesthetic={aesthetic}
          materials={materials}
          isEditing={isEditing}
          selectedProductCode={selectedProductCode}
          isValidPlacement={isValidPlacement}
          onSelectProduct={onSelectProduct}
          onDragMove={onDragMove}
          onClickFloor={onClickFloor}
          setIsDragging={setIsDragging}
          onLoaded={onLoaded}
        />
        <OrbitControls
          makeDefault
          enabled={!isDragging}
          enableDamping
          dampingFactor={0.06}
          minDistance={0.5}
          maxDistance={3.5}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={cameraTarget}
        />
      </Canvas>
      <RendererIndicator
        state={state}
        loadedCount={loadedProducts.length}
        missingCount={plan.missingProductCodes.length}
        visible={showDevIndicator}
      />
      {plan.missingProductCodes.length > 0 && (
        <div className="pointer-events-none absolute bottom-4 left-4 max-w-sm rounded-xl border border-amber-200/25 bg-amber-950/65 px-4 py-3 text-xs text-amber-50 shadow-xl backdrop-blur-md">
          <p className="font-semibold">Normalized 3D assets unavailable</p>
          <p className="mt-1 text-amber-100/80">
            {plan.missingProductCodes.join(", ")} remain in the DesignState and were not replaced.
          </p>
        </div>
      )}
    </div>
  );
}

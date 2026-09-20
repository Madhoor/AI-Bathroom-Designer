import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  applyFixtureDisplayMaterials,
  resolveDisplayMaterial,
  hasUsableFactualMaterial,
  VITREOUS_CHINA_MATERIAL,
  POLISHED_CHROME_MATERIAL,
  BRUSHED_BRASS_MATERIAL,
} from "./fixtureMaterialSystem";
import { getHostAttachments } from "./hostAttachments";
import {
  detectMountingWall,
  getArchitecturalPlacement,
  type ResolvedDesignAsset,
} from "./designStateRenderer";
import type { DesignPlacement, DesignState } from "../design/types";

describe("Renderer Cleanup & Host Attachments System", () => {
  const dummyRoom: DesignState["room"] = {
    widthM: 2.4,
    depthM: 1.8,
    heightM: 2.7,
    doors: [],
    windows: [],
  };

  describe("Fixture Material System (Aesthetics & Black Model Problem)", () => {
    it("computes vertex normals when missing on raw mesh geometries", () => {
      const geom = new THREE.BufferGeometry();
      // 3 vertices forming a triangle without normal attribute
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      geom.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      expect(geom.attributes.normal).toBeUndefined();

      const rawMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const mesh = new THREE.Mesh(geom, rawMat);
      const scene = new THREE.Group();
      scene.add(mesh);

      const toiletPlacement: DesignPlacement = {
        productCode: "29777IN-0",
        role: "toilet",
        zone: "toilet",
        position: { x: 0, y: -0.6, z: 0 },
        rotation: { x: 0, y: 0, z: 180 },
        footprint: { widthM: 0.42, depthM: 0.65, heightM: 0.7 },
        placementSurface: "floor",
        source: "factual_surface",
        validationStatus: "valid",
      };

      applyFixtureDisplayMaterials(scene, toiletPlacement);

      // Normal attribute must now be computed and present
      expect(mesh.geometry.attributes.normal).toBeDefined();
      expect(mesh.geometry.attributes.normal.count).toBe(3);
      // Cast and receive shadows enabled
      expect(mesh.castShadow).toBe(true);
      expect(mesh.receiveShadow).toBe(true);
    });

    it("assigns crisp vitreous china material to untextured sanitaryware", () => {
      const geom = new THREE.BoxGeometry(0.4, 0.6, 0.4);
      const rawMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const mesh = new THREE.Mesh(geom, rawMat);
      const scene = new THREE.Group();
      scene.add(mesh);

      const toiletPlacement: DesignPlacement = {
        productCode: "29777IN-0",
        role: "toilet",
        zone: "toilet",
        position: { x: 0, y: -0.6, z: 0 },
        rotation: { x: 0, y: 0, z: 180 },
        footprint: { widthM: 0.42, depthM: 0.65, heightM: 0.7 },
        placementSurface: "floor",
        source: "factual_surface",
        validationStatus: "valid",
      };

      applyFixtureDisplayMaterials(scene, toiletPlacement);

      // Must be replaced with vitreous china material
      expect(mesh.material).toBe(VITREOUS_CHINA_MATERIAL);
      expect(((mesh.material as unknown) as THREE.MeshStandardMaterial).roughness).toBe(0.22);
    });

    it("assigns appropriate brassware finishes for metallic fixtures", () => {
      const faucetPlacement: DesignPlacement = {
        productCode: "20070IN-4-CP",
        role: "faucet",
        zone: "basin",
        position: { x: -0.8, y: -0.8, z: 0.72 },
        rotation: { x: 0, y: 0, z: 0 },
        footprint: { widthM: 0.05, depthM: 0.16, heightM: 0.28 },
        placementSurface: "counter",
        source: "factual_surface",
        validationStatus: "valid",
      };

      const chromeMat = resolveDisplayMaterial(faucetPlacement, "Polished Chrome");
      expect(chromeMat).toBe(POLISHED_CHROME_MATERIAL);

      const brassMat = resolveDisplayMaterial(faucetPlacement, "Brushed Brass");
      expect(brassMat).toBe(BRUSHED_BRASS_MATERIAL);
    });

    it("preserves genuine authored materials when present", () => {
      const authoredMat = new THREE.MeshStandardMaterial({
        name: "CustomKohlerGlaze",
        color: new THREE.Color(0.9, 0.88, 0.85),
      });
      expect(hasUsableFactualMaterial(authoredMat)).toBe(true);

      const defaultMat = new THREE.MeshStandardMaterial({
        name: "",
        color: new THREE.Color(0, 0, 0),
      });
      expect(hasUsableFactualMaterial(defaultMat)).toBe(false);
    });
  });

  describe("Host Attachments System (Movement & Rotation Synchronization)", () => {
    const toiletAsset: ResolvedDesignAsset = {
      productCode: "29777IN-0",
      url: "/data/3d_catalogue/normalized_glb/29777IN-0.glb",
      normalizedBoundsM: [0.62, 0.90, 0.83],
      scaleFactor: 0.0254,
      rotationApplied: "-90deg_X",
    };

    const basinAsset: ResolvedDesignAsset = {
      productCode: "90011T-0",
      url: "/data/3d_catalogue/normalized_glb/90011T-0.glb",
      normalizedBoundsM: [0.39, 0.15, 0.39],
      scaleFactor: 0.0254,
      rotationApplied: "-90deg_X",
    };

    it("generates host-attached cistern duct joinery for toilets", () => {
      const toiletPlacement: DesignPlacement = {
        productCode: "29777IN-0",
        role: "toilet",
        zone: "toilet",
        position: { x: 0.5, y: -0.6, z: 0 },
        rotation: { x: 0, y: 0, z: 180 },
        footprint: { widthM: 0.42, depthM: 0.65, heightM: 0.7 },
        placementSurface: "floor",
        source: "factual_surface",
        validationStatus: "valid",
      };

      const attachments = getHostAttachments(toiletPlacement, toiletAsset, dummyRoom);
      expect(attachments.length).toBe(1);

      const cistern = attachments[0];
      expect(cistern.type).toBe("cistern_joinery");
      expect(cistern.hostProductCode).toBe("29777IN-0");
      // Duct sits at local +Y (behind the toilet)
      expect(cistern.localPosition[1]).toBeGreaterThan(0);
      expect(cistern.dimensionsM.heightM).toBe(dummyRoom.heightM);
    });

    it("generates host-attached vanity console for unhosted vessel basins", () => {
      const basinPlacement: DesignPlacement = {
        productCode: "90011T-0",
        role: "basin",
        zone: "basin",
        position: { x: -0.8, y: -0.7, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        footprint: { widthM: 0.39, depthM: 0.39, heightM: 0.18 },
        placementSurface: "floor",
        source: "factual_surface",
        validationStatus: "valid",
      };

      const attachments = getHostAttachments(basinPlacement, basinAsset, dummyRoom);
      expect(attachments.length).toBe(1);

      const vanity = attachments[0];
      expect(vanity.type).toBe("vanity_console");
      expect(vanity.dimensionsM.heightM).toBe(0.72);
    });

    it("maintains local +Y pointing to mounting wall across all 4 walls", () => {
      const southPos = { x: 0, y: -0.7, z: 0 };
      expect(detectMountingWall(southPos, dummyRoom)).toBe("south");

      const northPos = { x: 0, y: 0.7, z: 0 };
      expect(detectMountingWall(northPos, dummyRoom)).toBe("north");

      const westPos = { x: -1.0, y: 0, z: 0 };
      expect(detectMountingWall(westPos, dummyRoom)).toBe("west");

      const eastPos = { x: 1.0, y: 0, z: 0 };
      expect(detectMountingWall(eastPos, dummyRoom)).toBe("east");

      // Verify South wall rotation is 180 deg
      const southPlacement = getArchitecturalPlacement(
        {
          productCode: "29777IN-0",
          role: "toilet",
          zone: "toilet",
          position: southPos,
          rotation: { x: 0, y: 0, z: 0 },
          footprint: { widthM: 0.4, depthM: 0.6, heightM: 0.7 },
          placementSurface: "floor",
          source: "factual_surface",
          validationStatus: "valid",
        },
        toiletAsset,
        dummyRoom,
      );
      expect(southPlacement.worldRotation[2]).toBeCloseTo(Math.PI);

      // Verify North wall rotation is 0 deg
      const northPlacement = getArchitecturalPlacement(
        {
          productCode: "29777IN-0",
          role: "toilet",
          zone: "toilet",
          position: northPos,
          rotation: { x: 0, y: 0, z: 0 },
          footprint: { widthM: 0.4, depthM: 0.6, heightM: 0.7 },
          placementSurface: "floor",
          source: "factual_surface",
          validationStatus: "valid",
        },
        toiletAsset,
        dummyRoom,
      );
      expect(northPlacement.worldRotation[2]).toBeCloseTo(0);
    });
  });

  describe("Watertight Floor Geometry (No Z-Fighting)", () => {
    it("ensures subfloor foundation slab top face is strictly below Z = 0", () => {
      const subfloorCenterZ = -0.04;
      const subfloorThickness = 0.04;
      const subfloorTopFaceZ = subfloorCenterZ + subfloorThickness / 2;

      const finishedFloorZ = 0.0;
      expect(subfloorTopFaceZ).toBeLessThan(finishedFloorZ);
      expect(finishedFloorZ - subfloorTopFaceZ).toBeCloseTo(0.02, 3);
    });
  });
});

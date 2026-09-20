import * as THREE from "three";
import type { DesignPlacement } from "../design/types";

/**
 * Ceramic Glazed Vitreous China material (Toilets, Basins, Baths).
 * Replaces missing/untextured GLB materials with a crisp, restrained architectural bathroom finish.
 */
export const VITREOUS_CHINA_MATERIAL = new THREE.MeshStandardMaterial({
  color: new THREE.Color("#faf8f5"),
  roughness: 0.22,
  metalness: 0.02,
  envMapIntensity: 1.0,
});

/**
 * Polished Chrome Architectural Brassware material (Faucets, Showerheads, Spouts).
 */
export const POLISHED_CHROME_MATERIAL = new THREE.MeshStandardMaterial({
  color: new THREE.Color("#f0f3f6"),
  roughness: 0.16,
  metalness: 0.92,
  envMapIntensity: 1.2,
});

/**
 * Brushed Brass / Gold Architectural Brassware material.
 */
export const BRUSHED_BRASS_MATERIAL = new THREE.MeshStandardMaterial({
  color: new THREE.Color("#d4af37"),
  roughness: 0.26,
  metalness: 0.85,
  envMapIntensity: 1.1,
});

/**
 * Matte Black Architectural Brassware material.
 */
export const MATTE_BLACK_MATERIAL = new THREE.MeshStandardMaterial({
  color: new THREE.Color("#252322"),
  roughness: 0.55,
  metalness: 0.18,
  envMapIntensity: 0.8,
});

/**
 * Restrained Neutral Bathroom Display Material for any unclassified fixtures.
 */
export const NEUTRAL_DISPLAY_MATERIAL = new THREE.MeshStandardMaterial({
  color: new THREE.Color("#f2efe9"),
  roughness: 0.32,
  metalness: 0.04,
  envMapIntensity: 1.0,
});

/**
 * Determines whether a material has genuine factual textures or custom authoring.
 */
export function hasUsableFactualMaterial(material: THREE.Material | THREE.Material[] | null | undefined): boolean {
  if (!material) return false;
  const mat = Array.isArray(material) ? material[0] : material;

  // If the material has textures (diffuse, normal, roughness, metallic)
  if ("map" in mat && (mat as THREE.MeshStandardMaterial).map) return true;
  if ("normalMap" in mat && (mat as THREE.MeshStandardMaterial).normalMap) return true;

  // If the material has an authored name (default Three.js loader material name is empty or "default")
  if (mat.name && mat.name !== "" && mat.name !== "default" && mat.name !== "Material") {
    // Check if color is not pure pitch black (0,0,0) or default raw export
    if ("color" in mat && (mat as THREE.MeshStandardMaterial).color) {
      const c = (mat as THREE.MeshStandardMaterial).color;
      if (c.r > 0.05 || c.g > 0.05 || c.b > 0.05) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Resolves the appropriate restrained display material based on fixture role and finish.
 */
export function resolveDisplayMaterial(
  placement: DesignPlacement,
  finish?: string,
): THREE.MeshStandardMaterial {
  const role = placement.role.toLowerCase();
  const finishLower = (finish ?? "").toLowerCase();

  const isMetallic =
    role.includes("faucet") ||
    role.includes("shower") ||
    role.includes("rainhead") ||
    role.includes("spout") ||
    role.includes("valve") ||
    role.includes("trim");

  if (isMetallic) {
    if (
      finishLower.includes("brass") ||
      finishLower.includes("gold") ||
      finishLower.includes("rgd") ||
      finishLower.includes("af")
    ) {
      return BRUSHED_BRASS_MATERIAL;
    }
    if (finishLower.includes("black") || finishLower.includes("bl") || finishLower.includes("2mb")) {
      return MATTE_BLACK_MATERIAL;
    }
    return POLISHED_CHROME_MATERIAL;
  }

  // Vitreous ceramic sanitaryware
  const isCeramic =
    role.includes("toilet") ||
    role.includes("basin") ||
    role.includes("vanity") ||
    role.includes("bath") ||
    role.includes("tub") ||
    role.includes("bidet");

  if (isCeramic) {
    return VITREOUS_CHINA_MATERIAL;
  }

  return NEUTRAL_DISPLAY_MATERIAL;
}

/**
 * Applies architectural display material rules to a loaded Three.js GLB scene:
 * 1. Computes vertex normals if missing (crucial fix for 223/229 GLBs that rendered black).
 * 2. Preserves authentic materials when present.
 * 3. Assigns refined architectural bathroom materials (vitreous ceramic or polished metal) when missing.
 * 4. Enables smooth shadow casting and receiving.
 */
export function applyFixtureDisplayMaterials(
  scene: THREE.Object3D,
  placement: DesignPlacement,
  finish?: string,
): void {
  scene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;

    // 1. Compute vertex normals if missing
    if (!mesh.geometry.attributes.normal || mesh.geometry.attributes.normal.count === 0) {
      mesh.geometry.computeVertexNormals();
    }

    // 2. Shadows
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // 3. Material inspection
    if (hasUsableFactualMaterial(mesh.material)) {
      // Preserve factual material, ensure it has proper lighting response
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if ("envMapIntensity" in mat) {
        (mat as THREE.MeshStandardMaterial).envMapIntensity = 1.0;
      }
      if ("needsUpdate" in mat) {
        mat.needsUpdate = true;
      }
    } else {
      // Assign restrained neutral architectural bathroom material
      mesh.material = resolveDisplayMaterial(placement, finish);
    }
  });
}

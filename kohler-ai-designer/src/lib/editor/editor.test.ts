import { describe, expect, it } from "vitest";
import {
  createEditorSession,
  pushSessionState,
  undoSession,
  redoSession,
  canUndo,
  canRedo,
} from "./editorSession";
import { getEligibleReplacementCandidates, replaceProductInDesignState } from "./replacementEngine";
import { findDependentProducts, removeProductFromDesignState } from "./removalEngine";
import type { DesignPlacement, DesignState } from "../design/types";
import type { CatalogueProduct } from "../catalogue/types";
import type { RecommendationProduct } from "../recommendation/types";

const mockRoom: DesignState["room"] = {
  widthM: 2.5,
  depthM: 2.0,
  heightM: 2.7,
  doors: [{ wall: "south", offsetM: 0.5, widthM: 0.8, swing: "inward" }],
  windows: [],
};

const mockToiletProduct: RecommendationProduct = {
  productCode: "K-77700IN-0",
  productName: "Kohler Veil Smart Toilet",
  currentPrice: 85000,
  category: "Toilets",
  widthMm: 400,
  depthMm: 650,
  heightMm: 500,
  metadata: {
    role: ["toilet"],
    bathroomZones: ["toilet"],
    mountSurface: ["floor"],
    requiresHostProduct: false,
  },
};

const mockToiletPlacement: DesignPlacement = {
  productCode: "K-77700IN-0",
  position: { x: -0.7, y: -0.6, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  footprint: { widthM: 0.4, depthM: 0.65, heightM: 0.5 },
  placementSurface: "floor",
  source: "factual_surface",
  validationStatus: "valid",
  role: "toilet",
  zone: "toilet",
};

const mockVanityProduct: RecommendationProduct = {
  productCode: "K-99500IN-0",
  productName: "Kohler Modern Vanity 900mm",
  currentPrice: 65000,
  category: "Vanities",
  widthMm: 900,
  depthMm: 500,
  heightMm: 850,
  metadata: {
    role: ["vanity"],
    bathroomZones: ["basin"],
    mountSurface: ["floor"],
    requiresHostProduct: false,
  },
};

const mockVanityPlacement: DesignPlacement = {
  productCode: "K-99500IN-0",
  position: { x: 0.6, y: -0.6, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  footprint: { widthM: 0.9, depthM: 0.5, heightM: 0.85 },
  placementSurface: "floor",
  source: "factual_surface",
  validationStatus: "valid",
  role: "vanity",
  zone: "basin",
};

const mockFaucetProduct: RecommendationProduct = {
  productCode: "K-11100IN-CP",
  productName: "Kohler Purist Basin Faucet",
  currentPrice: 18000,
  category: "Faucets",
  widthMm: 150,
  depthMm: 150,
  heightMm: 200,
  metadata: {
    role: ["faucet"],
    bathroomZones: ["basin"],
    mountSurface: ["deck"],
    requiresHostProduct: true,
    hostRoles: ["vanity", "basin"],
  },
};

const mockFaucetPlacement: DesignPlacement = {
  productCode: "K-11100IN-CP",
  position: { x: 0.6, y: -0.6, z: 0.85 },
  rotation: { x: 0, y: 0, z: 0 },
  footprint: { widthM: 0.15, depthM: 0.15, heightM: 0.2 },
  placementSurface: "counter",
  source: "factual_surface",
  validationStatus: "valid",
  role: "faucet",
  zone: "basin",
  hostProductCode: "K-99500IN-0",
};

const sampleDesignState: DesignState = {
  version: 1,
  generatedAt: "2026-09-20T00:00:00.000Z",
  room: mockRoom,
  budget: 500000,
  totalProductCost: 168000,
  validation: {
    valid: true,
    errors: [],
    warnings: [],
  },
  selectedProducts: [mockToiletProduct, mockVanityProduct, mockFaucetProduct],
  selectedAssemblies: [],
  placements: [mockToiletPlacement, mockVanityPlacement, mockFaucetPlacement],
  warnings: [],
};

describe("Manual Bathroom Editor Engine", () => {
  describe("EditorSession Undo/Redo Manager", () => {
    it("initializes with empty past and future and allows no undo/redo initially", () => {
      const session = createEditorSession(sampleDesignState);
      expect(session.past).toHaveLength(0);
      expect(session.future).toHaveLength(0);
      expect(session.present).toBe(sampleDesignState);
      expect(canUndo(session)).toBe(false);
      expect(canRedo(session)).toBe(false);
    });

    it("pushes a new state and manages undo/redo stack properly", () => {
      const session0 = createEditorSession(sampleDesignState);
      const modifiedState: DesignState = {
        ...sampleDesignState,
        totalProductCost: 200000,
      };

      const session1 = pushSessionState(session0, modifiedState);
      expect(canUndo(session1)).toBe(true);
      expect(canRedo(session1)).toBe(false);
      expect(session1.present.totalProductCost).toBe(200000);
      expect(session1.past).toHaveLength(1);

      // Undo
      const sessionUndone = undoSession(session1);
      expect(canUndo(sessionUndone)).toBe(false);
      expect(canRedo(sessionUndone)).toBe(true);
      expect(sessionUndone.present.totalProductCost).toBe(168000);

      // Redo
      const sessionRedone = redoSession(sessionUndone);
      expect(canUndo(sessionRedone)).toBe(true);
      expect(canRedo(sessionRedone)).toBe(false);
      expect(sessionRedone.present.totalProductCost).toBe(200000);
    });
  });

  describe("Replacement Engine", () => {
    const candidateToilet: CatalogueProduct = {
      productCode: "K-77701IN-0",
      productName: "Kohler Veil Wall-Hung Toilet",
      currentPrice: 95000,
      currency: "INR",
      category: "Toilets",
      widthMm: 420,
      depthMm: 600,
      heightMm: 450,
      productUrl: "https://kohler.com/veil",
      imageUrls: [],
      has3d: true,
    };

    const oversizedCandidate: CatalogueProduct = {
      productCode: "K-99999IN-0",
      productName: "Massive Custom Bath",
      currentPrice: 150000,
      currency: "INR",
      category: "Toilets",
      widthMm: 4000, // Exceeds room width 2.5m
      depthMm: 3000,
      heightMm: 1000,
      productUrl: "https://kohler.com/massive",
      imageUrls: [],
      has3d: false,
    };

    it("filters eligible replacement candidates matching category and fitting inside room envelope", () => {
      const candidates = getEligibleReplacementCandidates(
        mockToiletProduct,
        [candidateToilet, oversizedCandidate],
        mockRoom,
      );

      expect(candidates).toHaveLength(1);
      expect(candidates[0].productCode).toBe("K-77701IN-0");
    });

    it("replaces product in DesignState and recalculates cost and footprint", () => {
      const updatedState = replaceProductInDesignState(
        sampleDesignState,
        "K-77700IN-0",
        candidateToilet,
      );

      // Product code should be updated in selectedProducts
      const updatedToilet = updatedState.selectedProducts.find((p) => p.productCode === "K-77701IN-0");
      expect(updatedToilet).toBeDefined();
      expect(updatedToilet?.productName).toBe("Kohler Veil Wall-Hung Toilet");

      // Placement footprint should reflect new dimensions in metres
      const updatedPlacement = updatedState.placements.find((p) => p.productCode === "K-77701IN-0");
      expect(updatedPlacement).toBeDefined();
      expect(updatedPlacement?.footprint.widthM).toBeCloseTo(0.42, 2);
      expect(updatedPlacement?.footprint.depthM).toBeCloseTo(0.60, 2);

      // Total cost should update from 168000 (-85000 + 95000) = 178000
      expect(updatedState.totalProductCost).toBe(178000);
    });
  });

  describe("Removal Engine", () => {
    it("identifies dependent accessories hosted by a target fixture", () => {
      const dependents = findDependentProducts("K-99500IN-0", sampleDesignState);
      expect(dependents).toHaveLength(1);
      expect(dependents[0].productCode).toBe("K-11100IN-CP");
    });

    it("safely removes an independent fixture without touching others", () => {
      const { state, removedProductCodes } = removeProductFromDesignState(
        sampleDesignState,
        "K-77700IN-0",
        false,
      );

      expect(removedProductCodes).toEqual(["K-77700IN-0"]);
      expect(state.selectedProducts.find((p) => p.productCode === "K-77700IN-0")).toBeUndefined();
      expect(state.placements.find((p) => p.productCode === "K-77700IN-0")).toBeUndefined();
      // Total cost updated (-85000)
      expect(state.totalProductCost).toBe(168000 - 85000);
      // Vanity and Faucet still present
      expect(state.selectedProducts).toHaveLength(2);
    });

    it("removes host fixture AND dependent fixtures when removeDependents is true", () => {
      const { state, removedProductCodes } = removeProductFromDesignState(
        sampleDesignState,
        "K-99500IN-0",
        true,
      );

      expect(removedProductCodes).toContain("K-99500IN-0");
      expect(removedProductCodes).toContain("K-11100IN-CP");
      expect(state.selectedProducts.find((p) => p.productCode === "K-99500IN-0")).toBeUndefined();
      expect(state.selectedProducts.find((p) => p.productCode === "K-11100IN-CP")).toBeUndefined();
      // Total cost updated (-65000 - 18000 = -83000) -> 85000 remaining (toilet)
      expect(state.totalProductCost).toBe(85000);
      expect(state.selectedProducts).toHaveLength(1);
    });
  });
});

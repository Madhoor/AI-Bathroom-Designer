import type { DesignPlacement, DesignState } from "../design/types";
import type { ResolvedDesignAsset, ArchitecturalPlacement } from "./designStateRenderer";

export type HostAttachmentType =
  | "cistern_joinery"
  | "vanity_console"
  | "shower_partition"
  | "wall_mirror"
  | "faucet_mount";

export interface HostAttachmentDefinition {
  id: string;
  type: HostAttachmentType;
  hostProductCode: string;
  hostRole: string;
  /** Local position relative to the host fixture's architectural origin (X, Y, Z in metres) */
  localPosition: [number, number, number];
  /** Local rotation in radians relative to the host fixture's orientation */
  localRotation: [number, number, number];
  dimensionsM: { widthM: number; depthM: number; heightM: number };
}

/**
 * Generates generic architectural attachments for a host fixture.
 * Attachments are defined in local fixture space where:
 * - Local +Y points towards the mounting wall behind the fixture.
 * - Local -Y points into the room (front direction of fixture).
 * - Local X is lateral (left/right).
 * - Local Z is height above floor.
 */
export function getHostAttachments(
  placement: DesignPlacement,
  asset: ResolvedDesignAsset,
  room: DesignState["room"],
): HostAttachmentDefinition[] {
  const role = placement.role.toLowerCase();
  const [assetWidth, , assetDepth] = asset.normalizedBoundsM;
  const attachments: HostAttachmentDefinition[] = [];

  // 1. Toilet Host Attachments (Concealed cistern wall duct, flush actuator, and health faucet)
  if (role.includes("toilet")) {
    const ductWidth = Math.max(0.82, (placement.footprint?.widthM ?? assetWidth) + 0.38);
    const ductDepth = 0.04; // 40mm slim flush wall duct
    const ductHeight = room.heightM;

    // The duct center sits flush against the back of the toilet
    // Toilet back is at local +Y = assetDepth / 2
    const ductCenterY = assetDepth / 2 + ductDepth / 2;

    attachments.push({
      id: `attachment-cistern-${placement.productCode}`,
      type: "cistern_joinery",
      hostProductCode: placement.productCode,
      hostRole: "toilet",
      localPosition: [0, ductCenterY, 0],
      localRotation: [0, 0, 0],
      dimensionsM: {
        widthM: ductWidth,
        depthM: ductDepth,
        heightM: ductHeight,
      },
    });
  }

  // 2. Basin Host Attachments (Floating architectural vanity unit, wall mirror, and faucet deck)
  if (role.includes("basin") && placement.position.z === 0) {
    const vanityWidth = Math.max(0.86, (placement.footprint?.widthM ?? assetWidth) + 0.35);
    const vanityDepth = 0.52;
    const vanityCenterY = assetDepth / 2 - vanityDepth / 2 + 0.04;

    // 2A. Vanity Console
    attachments.push({
      id: `attachment-vanity-${placement.productCode}`,
      type: "vanity_console",
      hostProductCode: placement.productCode,
      hostRole: "basin",
      localPosition: [0, vanityCenterY, 0],
      localRotation: [0, 0, 0],
      dimensionsM: {
        widthM: vanityWidth,
        depthM: vanityDepth,
        heightM: 0.72,
      },
    });

    // 2B. Wall-Mounted Architectural Mirror
    attachments.push({
      id: `attachment-mirror-${placement.productCode}`,
      type: "wall_mirror",
      hostProductCode: placement.productCode,
      hostRole: "basin",
      localPosition: [0, assetDepth / 2 + 0.012, 1.60],
      localRotation: [0, 0, 0],
      dimensionsM: {
        widthM: 0.58,
        depthM: 0.016,
        heightM: 0.94,
      },
    });

    // 2C. Generic Faucet Host Anchor
    attachments.push({
      id: `attachment-faucet-${placement.productCode}`,
      type: "faucet_mount",
      hostProductCode: placement.productCode,
      hostRole: "basin",
      localPosition: [0, assetDepth * 0.35, 0.72],
      localRotation: [0, 0, 0],
      dimensionsM: {
        widthM: 0.05,
        depthM: 0.16,
        heightM: 0.28,
      },
    });
  }

  return attachments;
}

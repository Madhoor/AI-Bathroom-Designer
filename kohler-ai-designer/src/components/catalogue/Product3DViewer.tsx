"use client";

import React, { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import type { Group } from "three";
import { resolveProductOrientation } from "@/lib/renderer/productOrientationAdapter";
import { applyFixtureDisplayMaterials } from "@/lib/renderer/fixtureMaterialSystem";
import type { CatalogueProduct } from "@/lib/catalogue/types";

interface SingleModelProps {
  productCode: string;
  product?: Partial<CatalogueProduct>;
  normalizedBoundsM?: [number, number, number];
  autoRotate?: boolean;
}

function SingleModel({ productCode, product, normalizedBoundsM }: SingleModelProps) {
  const assetUrl = `/api/3d-assets/${encodeURIComponent(productCode)}`;
  const gltf = useGLTF(assetUrl);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  const productInfo = useMemo(() => {
    return (
      product ?? {
        productCode,
        productName: (product as any)?.productName,
        category: (product as any)?.category,
        subcategory: (product as any)?.subcategory,
      }
    );
  }, [product, productCode]);

  const assetInfo = useMemo(() => {
    return {
      productCode,
      url: assetUrl,
      scaleFactor: 1.0,
      rotationApplied: "-90deg_X",
      normalizedBoundsM: normalizedBoundsM ?? [0.5, 0.4, 0.5],
    };
  }, [productCode, assetUrl, normalizedBoundsM]);

  const resolved = useMemo(() => {
    return resolveProductOrientation(productInfo, assetInfo, { isPreview: true });
  }, [productInfo, assetInfo]);

  useEffect(() => {
    // 1. Recompute vertex normals if missing (fixes black GLBs)
    // 2. Assign vitreous ceramic or polished metal architectural materials
    applyFixtureDisplayMaterials(
      scene,
      {
        id: productCode,
        productCode,
        role: resolved.role,
        category: resolved.role,
        position: { x: 0, y: 0, z: 0 },
        rotation: { yawDeg: 0, pitchDeg: 0, rollDeg: 0 },
      } as any,
      product?.finish,
    );
  }, [scene, productCode, resolved.role, product?.finish]);

  return (
    <group rotation={resolved.previewRotation}>
      <group position={resolved.localPosition}>
        <primitive object={scene as Group} />
      </group>
    </group>
  );
}

function CameraSetup({
  normalizedBoundsM,
}: {
  normalizedBoundsM?: [number, number, number];
}) {
  const { camera } = useThree();

  useEffect(() => {
    const [w = 0.5, h = 0.4, d = 0.5] = normalizedBoundsM ?? [0.5, 0.4, 0.5];
    const maxDim = Math.max(w, h, d, 0.25);
    // Physically meaningful bounding-box fitting:
    // 1 Three.js unit = 1 metre.
    // Minimum distance of 1.25m ensures small fixtures (faucets, rainheads)
    // are not unnaturally enlarged to fill the screen at bathtub scale.
    const dist = Math.max(maxDim * 1.6 + 0.5, 1.25);
    camera.position.set(dist * 0.75, dist * 0.65, dist * 0.85);
    camera.lookAt(0, h * 0.35, 0);
    camera.updateProjectionMatrix();
  }, [camera, normalizedBoundsM]);

  return null;
}

/** Subtle metric ground scale reference (1m circular pad with 0.25m and 0.5m increments) */
function MetricGroundReference({ maxDim }: { maxDim: number }) {
  // Pad radius has a minimum of 0.75m (1.5m diameter) to give consistent 1m scale reference
  const radius = Math.max(maxDim * 1.1, 0.75);
  return (
    <group position={[0, -0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* 0.25m inner reference circle */}
      <mesh>
        <ringGeometry args={[0.245, 0.255, 48]} />
        <meshBasicMaterial color="#4a4238" transparent opacity={0.25} />
      </mesh>
      {/* 0.50m (1m diameter) primary metric reference circle */}
      <mesh>
        <ringGeometry args={[0.495, 0.505, 64]} />
        <meshBasicMaterial color="#d4af37" transparent opacity={0.35} />
      </mesh>
      {/* Outer boundary ring */}
      {radius > 0.6 && (
        <mesh>
          <ringGeometry args={[radius * 0.98, radius, 64]} />
          <meshBasicMaterial color="#332d27" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

export interface Product3DViewerProps {
  productCode: string;
  product?: Partial<CatalogueProduct>;
  normalizedBoundsM?: [number, number, number];
  autoRotate?: boolean;
  className?: string;
  onClose?: () => void;
}

export default function Product3DViewer({
  productCode,
  product,
  normalizedBoundsM,
  autoRotate = true,
  className = "h-72 w-full",
}: Product3DViewerProps) {
  const bounds = normalizedBoundsM ?? product?.normalizedBoundsM;

  const maxDim = useMemo(() => {
    if (!bounds) return 0.5;
    return Math.max(...bounds, 0.35);
  }, [bounds]);

  // Dimension string for visual scale callout badge
  const dimensionString = useMemo(() => {
    if (product?.widthMm && product?.heightMm) {
      const d = product.depthMm ? ` × ${product.depthMm}` : "";
      return `${product.widthMm} × ${product.heightMm}${d} mm`;
    }
    if (bounds) {
      return `${(bounds[0] * 1000).toFixed(0)} × ${(bounds[1] * 1000).toFixed(0)} × ${(bounds[2] * 1000).toFixed(0)} mm (3D)`;
    }
    return null;
  }, [product, bounds]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-neutral-900 ${className}`}>
      {/* Scale Callout & Category Badge */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1">
        {product?.category && (
          <span className="inline-flex w-fit items-center rounded-md border border-[#c49a45]/30 bg-[#161412]/80 px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#d4af37] backdrop-blur-sm">
            {product.category}
          </span>
        )}
        {dimensionString && (
          <span className="inline-flex w-fit items-center gap-1 rounded-md border border-white/10 bg-black/60 px-2 py-0.5 font-mono text-[10px] text-neutral-300 backdrop-blur-sm">
            <svg className="h-2.5 w-2.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            {dimensionString}
          </span>
        )}
      </div>

      <Suspense
        fallback={
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-neutral-900/90 text-xs text-neutral-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-[#c49a45]" />
            <span>Loading KOHLER 3D Model...</span>
          </div>
        }
      >
        <Canvas
          shadows
          dpr={[1, 1.5]}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          style={{ background: "#171513" }}
        >
          <CameraSetup normalizedBoundsM={bounds} />

          {/* Realistic PBR Studio Lighting */}
          <ambientLight intensity={0.8} color="#fffcf7" />
          <directionalLight
            position={[maxDim * 2, maxDim * 3, maxDim * 2]}
            intensity={1.8}
            color="#fff8ed"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={0.0001}
          />
          <directionalLight
            position={[-maxDim * 2, -maxDim * 1.5, maxDim]}
            intensity={0.6}
            color="#e8f0fe"
          />
          <directionalLight
            position={[0, maxDim * 2.5, -maxDim * 2]}
            intensity={0.4}
            color="#fef3c7"
          />
          <hemisphereLight args={["#fff8f0", "#26221d", 0.7]} />

          {/* Ground Reference */}
          <MetricGroundReference maxDim={maxDim} />

          {/* The Isolated Product */}
          <SingleModel
            productCode={productCode}
            product={product}
            normalizedBoundsM={bounds}
            autoRotate={autoRotate}
          />

          {/* Contact Ground Shadow */}
          <ContactShadows
            position={[0, -0.001, 0]}
            opacity={0.5}
            scale={maxDim * 3.5}
            blur={2.0}
            far={maxDim * 2}
            color="#0d0b09"
          />

          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.06}
            autoRotate={autoRotate}
            autoRotateSpeed={0.8}
            minDistance={maxDim * 0.6}
            maxDistance={maxDim * 4.5}
            target={[0, (bounds?.[1] ?? 0.4) * 0.35, 0]}
          />
        </Canvas>
      </Suspense>

      {/* Orbit & Zoom Hint */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] text-neutral-400 backdrop-blur-sm">
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        <span>Drag to orbit • Scroll to zoom</span>
      </div>
    </div>
  );
}

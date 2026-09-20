"use client";

import * as React from "react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Grid, OrbitControls, useGLTF } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  KOHLER_INCH_METERS,
  compareCatalogueDimensions,
  formatMeters,
  formatNativeExtents,
  getCameraFit,
  KOHLER_DEFAULT_ROTATION_DEG,
  measureObject,
} from "@/lib/three/assetInspector";
import type { AssetCalibration } from "@/lib/three/assetInspector";
import { threeSampleAssets, type ThreeSampleAsset } from "@/data/threeSampleAssets";

type SourceType = "obj" | "glb";
type ScaleMode = "catalogue" | "inch" | "custom" | "raw";
type OrientationMode = "default" | "custom";
type Rotation = [number, number, number];
type Offset = [number, number, number];

interface ModelBounds {
  base: THREE.Box3;
  world: THREE.Box3;
  offset: Offset;
}

interface ModelProps {
  asset: ThreeSampleAsset;
  source: SourceType;
  metersPerNativeUnit: number;
  rotation: Rotation;
  groundModel: boolean;
  centerModel: boolean;
  onMeasured: (measurements: ReturnType<typeof measureObject>) => void;
  onBounds: (bounds: ModelBounds) => void;
}

function LoadedModel({
  asset,
  source,
  metersPerNativeUnit,
  rotation,
  groundModel,
  centerModel,
  onMeasured,
  onBounds,
}: ModelProps) {
  const obj = useLoader(OBJLoader, asset.objPath);
  const gltf = useGLTF(asset.glbPath);
  const sourceScene = source === "obj" ? obj : gltf.scene;
  const model = useMemo(() => sourceScene.clone(true), [sourceScene]);
  const root = useRef<THREE.Group>(null);
  const calibrationGroup = useRef<THREE.Group>(null);
  const modelGroup = useRef<THREE.Group>(null);
  const measurements = useMemo(() => measureObject(model), [model]);

  useEffect(() => {
    const assetRoot = root.current;
    const calibration = calibrationGroup.current;
    const calibratedModel = modelGroup.current;
    if (!assetRoot || !calibration || !calibratedModel) return;

    assetRoot.position.set(0, 0, 0);
    calibration.rotation.set(...rotation);
    calibration.scale.setScalar(metersPerNativeUnit);
    calibratedModel.position.set(0, 0, 0);
    model.position.set(0, 0, 0);
    assetRoot.updateWorldMatrix(true, true);
    const baseBounds = new THREE.Box3().setFromObject(assetRoot);
    const center = baseBounds.getCenter(new THREE.Vector3());
    const offset = new THREE.Vector3(
      centerModel ? -center.x : 0,
      groundModel ? -baseBounds.min.y : 0,
      centerModel ? -center.z : 0,
    );
    calibratedModel.position.copy(offset);
    assetRoot.updateWorldMatrix(true, true);
    const worldBounds = new THREE.Box3().setFromObject(assetRoot);
    onMeasured(measurements);
    onBounds({
      base: baseBounds,
      world: worldBounds,
      offset: [offset.x, offset.y, offset.z],
    });
  }, [
    measurements,
    model,
    metersPerNativeUnit,
    rotation,
    groundModel,
    centerModel,
    onMeasured,
    onBounds,
  ]);

  return (
    <group>
      <group ref={root} name="AssetRoot">
        <group ref={calibrationGroup} name="CalibrationGroup">
          <group ref={modelGroup} name="ModelGroup">
            <primitive object={model} />
          </group>
        </group>
      </group>
    </group>
  );
}

function CameraRig({
  bounds,
  resetSignal,
}: {
  bounds: THREE.Box3 | null;
  resetSignal: number;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const get = useThree((state) => state.get);

  useEffect(() => {
    if (!bounds) return;
    const camera = get().camera;
    const fit = getCameraFit(bounds, 42, 1.7);
    camera.position.copy(fit.position);
    camera.near = fit.near;
    camera.far = fit.far;
    camera.updateProjectionMatrix();
    controls.current?.target.copy(fit.center);
    controls.current?.update();
  }, [bounds, get, resetSignal]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={0.05}
      maxDistance={100}
    />
  );
}

class AssetErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    return this.state.error ? null : this.props.children;
  }
}

function InspectorViewport({
  asset,
  source,
  metersPerNativeUnit,
  rotation,
  showGrid,
  showAxes,
  showBounds,
  groundModel,
  centerModel,
  resetSignal,
  onMeasured,
  onBounds,
  onError,
}: ModelProps & {
  showGrid: boolean;
  showAxes: boolean;
  showBounds: boolean;
  resetSignal: number;
  onError: (error: Error) => void;
}) {
  const [bounds, setBounds] = useState<THREE.Box3 | null>(null);
  const handleBounds = useCallback((next: ModelBounds) => {
    setBounds(next.world.clone());
    onBounds(next);
  }, [onBounds]);
  const gridSize = bounds
    ? Math.max(6, Math.ceil(Math.max(bounds.getSize(new THREE.Vector3()).x, bounds.getSize(new THREE.Vector3()).z) + 4))
    : 6;

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [3, 2.5, 3], fov: 42, near: 0.001, far: 100 }}
      onCreated={({ gl }) => gl.setClearColor("#d9d6cf")}
    >
      <AssetErrorBoundary onError={onError}>
        <Suspense fallback={null}>
        <LoadedModel
          key={`${asset.code}-${source}`}
          asset={asset}
          source={source}
          metersPerNativeUnit={metersPerNativeUnit}
          rotation={rotation}
          groundModel={groundModel}
          centerModel={centerModel}
          onMeasured={onMeasured}
          onBounds={handleBounds}
        />
        </Suspense>
      </AssetErrorBoundary>
      {showBounds && bounds && <box3Helper args={[bounds, "#d4a86a"]} />}
      {showGrid && (
        <Grid
          args={[gridSize, gridSize]}
          cellSize={0.25}
          cellThickness={0.45}
          sectionSize={1}
          sectionThickness={1}
          fadeDistance={gridSize * 1.5}
          fadeStrength={1}
        />
      )}
      {showAxes && <axesHelper args={[1.5]} />}
      <hemisphereLight args={["#fffaf0", "#6e6a64", 1.4]} />
      <directionalLight
        castShadow
        position={[4, 7, 5]}
        intensity={3}
        color="#fff4df"
        shadow-mapSize={[1024, 1024]}
      />
      <CameraRig bounds={bounds} resetSignal={resetSignal} />
    </Canvas>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#ded9cf] py-2 text-xs">
      <dt className="text-[#847f76]">{label}</dt>
      <dd className="text-right text-[#282622]">{value}</dd>
    </div>
  );
}

function formatCatalogue(asset: ThreeSampleAsset): string {
  if (!asset.catalogueDimensions) return "Unavailable";
  const { widthMm, depthMm, heightMm } = asset.catalogueDimensions;
  return `${widthMm} × ${depthMm} × ${heightMm ?? "—"} mm`;
}

export default function ThreeDInspectorPage() {
  const [selectedCode, setSelectedCode] = useState("1360IN-H2-0");
  const [source, setSource] = useState<SourceType>("glb");
  const [scaleMode, setScaleMode] = useState<ScaleMode>("catalogue");
  const [customScale, setCustomScale] = useState("0.0254");
  const [orientationMode, setOrientationMode] = useState<OrientationMode>("default");
  const [rotation, setRotation] = useState<Rotation>(KOHLER_DEFAULT_ROTATION_DEG);
  const [positionOffset, setPositionOffset] = useState<Offset>([0, 0, 0]);
  const [groundModel, setGroundModel] = useState(true);
  const [centerModel, setCenterModel] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showBounds, setShowBounds] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [measurements, setMeasurements] = useState<ReturnType<typeof measureObject> | null>(null);
  const [modelBounds, setModelBounds] = useState<ModelBounds | null>(null);
  const [loadError, setLoadError] = useState("");
  const [calibrations, setCalibrations] = useState<Record<string, AssetCalibration>>({});
  const asset = threeSampleAssets.find((item) => item.code === selectedCode) ?? threeSampleAssets[0];
  const calibration = calibrations[asset.code];
  const catalogueScale = asset.scaleMmPerNative ? asset.scaleMmPerNative / 1000 : KOHLER_INCH_METERS;
  const metersPerNativeUnit = scaleMode === "catalogue"
    ? catalogueScale
    : scaleMode === "inch"
      ? KOHLER_INCH_METERS
      : scaleMode === "custom"
        ? Number(customScale) || KOHLER_INCH_METERS
        : 1;
  const worldExtents = modelBounds?.world.getSize(new THREE.Vector3());
  const nativeExtents = measurements?.rawExtents;
  const catalogue = asset.catalogueDimensions
    ? [
        asset.catalogueDimensions.widthMm / 1000,
        asset.catalogueDimensions.depthMm / 1000,
        asset.catalogueDimensions.heightMm === undefined ? undefined : asset.catalogueDimensions.heightMm / 1000,
      ] as [number, number, number | undefined]
    : null;
  const comparison = worldExtents && catalogue
    ? compareCatalogueDimensions(worldExtents, catalogue)
    : null;

  const selectAsset = (code: string) => {
    const nextCalibration = calibrations[code];
    setSelectedCode(code);
    setMeasurements(null);
    setModelBounds(null);
    setLoadError("");
    setOrientationMode(nextCalibration?.orientationStatus === "manual" ? "custom" : "default");
    setRotation(nextCalibration?.rotationEulerDeg ?? KOHLER_DEFAULT_ROTATION_DEG);
    setPositionOffset([0, 0, 0]);
  };

  const selectSource = (nextSource: SourceType) => {
    setSource(nextSource);
    setMeasurements(null);
    setModelBounds(null);
    setLoadError("");
    setPositionOffset([0, 0, 0]);
  };

  const handleBounds = useCallback((next: ModelBounds) => {
    setModelBounds(next);
    setPositionOffset(next.offset);
  }, []);

  const changeRotation = (axis: number, value: string) => {
    const next = [...rotation] as Rotation;
    next[axis] = Number(value);
    setRotation(next);
  };

  const resetModel = () => {
    setScaleMode("catalogue");
    setOrientationMode("default");
    setRotation(KOHLER_DEFAULT_ROTATION_DEG);
    setPositionOffset([0, 0, 0]);
    setGroundModel(true);
    setCenterModel(true);
  };

  const applyOrientation = () => {
    setCalibrations((current) => ({
      ...current,
      [asset.code]: {
        productCode: asset.code,
        metersPerNativeUnit,
        rotationEulerDeg: rotation,
        positionOffset,
        orientationStatus: orientationMode === "default" ? "default-ko-hler" : "verified",
      },
    }));
  };

  return (
    <main className="min-h-screen bg-[#efede8] text-[#282622]">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col p-4 lg:p-6">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a6e3e]">KOHLER / development tool</p>
            <h1 className="text-2xl font-medium tracking-tight">3D Asset Inspector</h1>
            <p className="mt-1 text-sm text-[#77736c]">Physical calibration environment · 1 Three.js unit = 1 metre</p>
          </div>
          <div className="rounded-full border border-[#d6d0c6] bg-[#f7f5f1] px-3 py-1 text-[11px] text-[#77736c]">10 verified sample assets</div>
        </header>

        <section className="grid min-h-[calc(100vh-125px)] flex-1 gap-4 lg:grid-cols-[280px_minmax(420px,1fr)_330px]">
          <aside className="space-y-4 rounded-2xl border border-[#d8d3ca] bg-[#f7f5f1] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a6e3e]">Model</p>
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#857f75]">Product
              <select value={selectedCode} onChange={(event) => selectAsset(event.target.value)} className="mt-2 w-full rounded-lg border border-[#d8d3ca] bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal">
                {threeSampleAssets.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#857f75]">Source
              <select value={source} onChange={(event) => selectSource(event.target.value as SourceType)} className="mt-2 w-full rounded-lg border border-[#d8d3ca] bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal">
                <option value="glb">GLB</option><option value="obj">OBJ</option>
              </select>
            </label>

            <div className="border-t border-[#ded9cf] pt-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a6e3e]">Calibration</p>
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#857f75]">Scale mode
                <select value={scaleMode} onChange={(event) => setScaleMode(event.target.value as ScaleMode)} className="mt-2 w-full rounded-lg border border-[#d8d3ca] bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal">
                  <option value="catalogue">Catalogue-derived</option><option value="inch">KOHLER inch</option><option value="custom">Custom</option><option value="raw">Raw</option>
                </select>
              </label>
              <label className="mt-3 block text-xs text-[#857f75]">Meters / native unit
                <input type="number" value={scaleMode === "custom" ? customScale : metersPerNativeUnit.toFixed(6)} onChange={(event) => { setCustomScale(event.target.value); setScaleMode("custom"); }} className="mt-2 w-full rounded-lg border border-[#d8d3ca] bg-white px-3 py-2" step="0.0001" />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <button onClick={() => setGroundModel((value) => !value)} className="rounded-lg border border-[#d3c9bc] bg-white px-3 py-2">{groundModel ? "Unground" : "Ground"} model</button>
                <button onClick={() => setCenterModel((value) => !value)} className="rounded-lg border border-[#d3c9bc] bg-white px-3 py-2">{centerModel ? "Uncenter" : "Center"} model</button>
                <button onClick={resetModel} className="col-span-2 rounded-lg border border-[#d3c9bc] bg-white px-3 py-2 hover:bg-[#eee9e0]">Reset model</button>
              </div>
            </div>

            <div className="border-t border-[#ded9cf] pt-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a6e3e]">Orientation</p>
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#857f75]">Preset
                <select value={orientationMode} onChange={(event) => { const mode = event.target.value as OrientationMode; setOrientationMode(mode); if (mode === "default") setRotation(KOHLER_DEFAULT_ROTATION_DEG); }} className="mt-2 w-full rounded-lg border border-[#d8d3ca] bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal">
                  <option value="default">KOHLER default (-90°, 0°, 0°)</option><option value="custom">Custom</option>
                </select>
              </label>
              {["X", "Y", "Z"].map((axis, index) => <label key={axis} className="mb-2 flex items-center gap-3 text-xs"><span className="w-4">{axis}</span><input type="range" min="-180" max="180" disabled={orientationMode === "default"} value={rotation[index]} onChange={(event) => changeRotation(index, event.target.value)} className="w-full" /><span className="w-10 text-right">{rotation[index]}°</span></label>)}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button onClick={() => { setOrientationMode("default"); setRotation(KOHLER_DEFAULT_ROTATION_DEG); }} className="rounded-lg border border-[#d3c9bc] bg-white px-3 py-2">Reset orientation</button>
                <button onClick={applyOrientation} className="rounded-lg border border-[#b58a5b] bg-[#f2e8da] px-3 py-2">Apply orientation</button>
              </div>
            </div>

            <div className="border-t border-[#ded9cf] pt-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a6e3e]">View</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button onClick={() => setResetSignal((value) => value + 1)} className="rounded-lg border border-[#d3c9bc] bg-white px-3 py-2">Reset camera</button>
                <button onClick={() => setShowGrid((value) => !value)} className="rounded-lg border border-[#d3c9bc] bg-white px-3 py-2">{showGrid ? "Hide" : "Show"} grid</button>
                <button onClick={() => setShowBounds((value) => !value)} className="rounded-lg border border-[#d3c9bc] bg-white px-3 py-2">{showBounds ? "Hide" : "Show"} bounds</button>
                <button onClick={() => setShowAxes((value) => !value)} className="rounded-lg border border-[#d3c9bc] bg-white px-3 py-2">{showAxes ? "Hide" : "Show"} axes</button>
              </div>
            </div>
          </aside>

          <div className="relative min-h-[520px] overflow-hidden rounded-2xl border border-[#d8d3ca] bg-[#d9d6cf]">
            {loadError && <div className="absolute inset-4 z-10 flex items-center justify-center rounded-xl bg-[#f7f5f1]/95 p-6 text-center text-sm text-[#9b443a]">Unable to load this {source.toUpperCase()} asset.<br />{loadError}</div>}
            <InspectorViewport key={`${asset.code}-${source}`} asset={asset} source={source} metersPerNativeUnit={metersPerNativeUnit} rotation={rotation.map((value) => THREE.MathUtils.degToRad(value)) as Rotation} showGrid={showGrid} showAxes={showAxes} showBounds={showBounds} groundModel={groundModel} centerModel={centerModel} resetSignal={resetSignal} onMeasured={setMeasurements} onBounds={handleBounds} onError={(error) => { if (error.message) setLoadError(error.message); }} />
            <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-[#f7f5f1]/85 px-3 py-2 text-[11px] text-[#6f6b63]">1 grid unit = 1 metre · orbit to inspect</div>
          </div>

          <aside className="overflow-auto rounded-2xl border border-[#d8d3ca] bg-[#f7f5f1] p-4">
            <h2 className="mb-1 text-lg font-medium">{asset.code}</h2>
            <p className="mb-4 text-sm text-[#77736c]">{asset.name}</p>
            <dl>
              <Field label="Category" value={`${asset.category} / ${asset.subcategory}`} />
              <Field label="Catalogue dimensions" value={formatCatalogue(asset)} />
              <Field label="Native X / Y / Z" value={nativeExtents ? formatNativeExtents(nativeExtents, asset.inferredUnit === "inch" ? "in-units" : `${asset.inferredUnit}-units`) : "Loading…"} />
              <Field label="Detected source unit" value={asset.inferredUnit} />
              <Field label="Meters / native unit" value={`${metersPerNativeUnit.toFixed(6)} m / native unit`} />
              <Field label="World X / Y / Z" value={worldExtents ? formatMeters(worldExtents) : "Loading…"} />
              <Field label="Scale source" value={scaleMode === "catalogue" && asset.scaleMmPerNative ? "Verified catalogue analysis" : scaleMode === "inch" || !asset.scaleMmPerNative ? "KOHLER OBJ inch convention" : "Custom runtime value"} />
              <Field label="Scale confidence" value={asset.scaleConfidence ? `${(asset.scaleConfidence * 100).toFixed(2)}%` : "Not validated"} />
              <Field label="Orientation" value={orientationMode === "default" ? "KOHLER default" : calibration?.orientationStatus === "verified" ? "Verified calibration" : "Custom preview"} />
              <Field label="Rotation" value={`X ${rotation[0]}° / Y ${rotation[1]}° / Z ${rotation[2]}°`} />
              <Field label="Orientation confidence" value={orientationMode === "default" ? "Verified on current sample; current KOHLER convention" : "Manual / per-asset"} />
              <Field label="Vertices" value={measurements?.vertexCount.toLocaleString() ?? asset.vertexCount.toLocaleString()} />
              <Field label="Faces / triangles" value={`${measurements?.faceCount.toLocaleString() ?? asset.faceCount.toLocaleString()} / ${measurements?.triangleCount.toLocaleString() ?? asset.triangleCount.toLocaleString()}`} />
              <Field label="Geometry count" value={measurements?.geometryCount.toString() ?? asset.geometryCount.toString()} />
              <Field label="Materials" value={measurements ? (measurements.materialsDetected ? "Detected" : "None detected") : "Loading…"} />
            </dl>
            {comparison?.best && Number.isFinite(comparison.best.error) ? <div className="mt-5 rounded-xl border border-[#d7c3aa] bg-[#f2e8da] p-3 text-xs"><h3 className="mb-2 font-semibold uppercase tracking-[0.14em] text-[#93683d]">Catalogue comparison</h3><p className="text-[#5e554b]">Best correspondence: model axes [{comparison.best.axes.join(", ")}] → catalogue [W, D, H].</p><p className="mt-1 text-[#5e554b]">Errors: {comparison.best.errors.map((error, index) => catalogue?.[index] === undefined ? "—" : `${(error * 100).toFixed(2)}%`).join(" / ")}</p><p className="mt-2 text-[#84796c]">{catalogue?.some((value) => value === undefined) ? "Height is unavailable in the catalogue; comparison uses the available dimensions only." : "All catalogue dimensions are available."} No automatic rotation is applied.</p></div> : <div className="mt-5 rounded-xl border border-[#ded9cf] bg-white/60 p-3 text-xs text-[#77736c]">Catalogue validation unavailable for this asset. The KOHLER inch convention remains selectable.</div>}
            <div className="mt-5 space-y-2 text-[11px] text-[#77736c]"><p><strong className="text-[#4b4842]">OBJ:</strong> {asset.objPath}</p><p><strong className="text-[#4b4842]">GLB:</strong> {asset.glbPath}</p></div>
          </aside>
        </section>
      </div>
    </main>
  );
}

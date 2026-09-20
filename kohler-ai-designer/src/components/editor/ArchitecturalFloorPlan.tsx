"use client";

import React, { useMemo, useRef } from "react";
import type { DesignPlacement, DesignState } from "@/lib/design";
import type { EditorActionState } from "@/lib/editor/types";
import { constrainPositionToSurface } from "@/lib/design/manualEditing";
import { getShowerZoneDefinition } from "@/lib/design/showerZone";

export interface ArchitecturalFloorPlanProps {
  designState: DesignState;
  actionState: EditorActionState;
  onSelectProduct: (productCode: string) => void;
  onMovePreview: (pos: { x: number; y: number; z: number }) => void;
  onCommitMoveClick: () => void;
  className?: string;
}

export default function ArchitecturalFloorPlan({
  designState,
  actionState,
  onSelectProduct,
  onMovePreview,
  onCommitMoveClick,
  className,
}: ArchitecturalFloorPlanProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const room = designState.room;

  // Coordinate Mapping Scale: 220 pixels per metre
  const scale = 220;
  const paddingM = 0.6; // 60cm border padding for architectural dimension callouts
  const totalWidthM = room.widthM + paddingM * 2;
  const totalDepthM = room.depthM + paddingM * 2;

  const svgWidth = totalWidthM * scale;
  const svgHeight = totalDepthM * scale;

  // Helper to convert room metre coords (origin at room center) to SVG screen coords
  const toScreenX = (roomXM: number) => (paddingM + room.widthM / 2 + roomXM) * scale;
  const toScreenY = (roomYM: number) => (paddingM + room.depthM / 2 - roomYM) * scale; // invert Y for screen coords

  // Helper to convert screen SVG coords back to room metres
  const toRoomMetres = (screenX: number, screenY: number) => {
    const roomX = (screenX / scale) - paddingM - room.widthM / 2;
    const roomY = room.depthM / 2 - (screenY / scale - paddingM);
    return { x: roomX, y: roomY };
  };

  const isMoving = actionState.type === "MOVING";
  const movingProductCode = isMoving ? actionState.productCode : null;
  const selectedProductCode =
    actionState.type === "SELECTED" ||
    actionState.type === "MOVING" ||
    actionState.type === "PLACED" ||
    actionState.type === "ROTATING"
      ? actionState.productCode
      : null;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isMoving || !actionState.originalPlacement) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert pixel to SVG viewBox coords
    const viewBoxX = (clientX / rect.width) * svgWidth;
    const viewBoxY = (clientY / rect.height) * svgHeight;

    const roomCoords = toRoomMetres(viewBoxX, viewBoxY);

    const constrained = constrainPositionToSurface(
      { x: roomCoords.x, y: roomCoords.y, z: actionState.originalPlacement.position.z },
      actionState.originalPlacement.placementSurface,
      actionState.originalPlacement.footprint,
      room,
      undefined,
      { role: actionState.originalPlacement.role, zone: actionState.originalPlacement.zone },
    );

    onMovePreview({ x: constrained.x, y: constrained.y, z: constrained.z });
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isMoving) {
      e.stopPropagation();
      onCommitMoveClick();
    }
  };

  // Wall Outer & Inner Box Coordinates
  const innerLeft = toScreenX(-room.widthM / 2);
  const innerRight = toScreenX(room.widthM / 2);
  const innerTop = toScreenY(room.depthM / 2);
  const innerBottom = toScreenY(-room.depthM / 2);
  const innerWidth = room.widthM * scale;
  const innerDepth = room.depthM * scale;
  const wallThick = 0.12 * scale; // 12cm wall thickness

  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-auto p-4 select-none ${className ?? ""}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className={`max-h-full max-w-full drop-shadow-2xl ${isMoving ? "cursor-crosshair" : "cursor-default"}`}
        onPointerMove={handlePointerMove}
        onClick={handleSvgClick}
        style={{ minWidth: "320px", minHeight: "320px" }}
      >
        <defs>
          {/* Subtle Grid Pattern */}
          <pattern id="grid" width={0.5 * scale} height={0.5 * scale} patternUnits="userSpaceOnUse">
            <path
              d={`M ${0.5 * scale} 0 L 0 0 0 ${0.5 * scale}`}
              fill="none"
              stroke="#262320"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          </pattern>

          {/* Wall Hatch Pattern */}
          <pattern id="wallHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#3d3730" strokeWidth="2" />
          </pattern>

          {/* Shower Tile Pattern */}
          <pattern id="showerTile" width={0.15 * scale} height={0.15 * scale} patternUnits="userSpaceOnUse">
            <rect width={0.15 * scale} height={0.15 * scale} fill="#1a1815" stroke="#2c2722" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Room Floor Background */}
        <rect
          x={innerLeft}
          y={innerTop}
          width={innerWidth}
          height={innerDepth}
          fill="#141311"
        />

        {/* Grid Lines on Floor */}
        <rect
          x={innerLeft}
          y={innerTop}
          width={innerWidth}
          height={innerDepth}
          fill="url(#grid)"
        />

        {/* Shower Zone Indication (if rainhead or shower exists) */}
        {designState.placements.some((p) => p.zone === "shower") && (
          <rect
            x={innerLeft}
            y={innerTop}
            width={0.9 * scale}
            height={0.9 * scale}
            fill="url(#showerTile)"
            opacity="0.6"
          />
        )}

        {/* Exterior Walls */}
        {/* North Wall */}
        <rect
          x={innerLeft - wallThick}
          y={innerTop - wallThick}
          width={innerWidth + wallThick * 2}
          height={wallThick}
          fill="url(#wallHatch)"
          stroke="#4a433b"
          strokeWidth="1.5"
        />
        {/* South Wall */}
        <rect
          x={innerLeft - wallThick}
          y={innerBottom}
          width={innerWidth + wallThick * 2}
          height={wallThick}
          fill="url(#wallHatch)"
          stroke="#4a433b"
          strokeWidth="1.5"
        />
        {/* West Wall */}
        <rect
          x={innerLeft - wallThick}
          y={innerTop}
          width={wallThick}
          height={innerDepth}
          fill="url(#wallHatch)"
          stroke="#4a433b"
          strokeWidth="1.5"
        />
        {/* East Wall */}
        <rect
          x={innerRight}
          y={innerTop}
          width={wallThick}
          height={innerDepth}
          fill="url(#wallHatch)"
          stroke="#4a433b"
          strokeWidth="1.5"
        />

        {/* Doors and Swing Arcs */}
        {room.doors.map((door, idx) => {
          const doorWidthPx = door.widthM * scale;
          const doorOffsetPx = door.offsetM * scale;

          if (door.wall === "north") {
            const doorLeft = innerLeft + doorOffsetPx;
            return (
              <g key={`${door.wall}-${idx}`}>
                {/* Clear Door Opening */}
                <rect x={doorLeft} y={innerTop - wallThick} width={doorWidthPx} height={wallThick} fill="#141311" />
                {/* Door Leaf (Inward) */}
                <line
                  x1={doorLeft}
                  y1={innerTop}
                  x2={doorLeft}
                  y2={innerTop + doorWidthPx}
                  stroke="#c49a45"
                  strokeWidth="2.5"
                />
                {/* Swing Clearance Arc */}
                <path
                  d={`M ${doorLeft} ${innerTop + doorWidthPx} A ${doorWidthPx} ${doorWidthPx} 0 0 0 ${doorLeft + doorWidthPx} ${innerTop}`}
                  fill="none"
                  stroke="#c49a45"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                  opacity="0.7"
                />
              </g>
            );
          }
          return null;
        })}

        {/* Architectural Glass Shower Screen & Zone Footprint */}
        {(() => {
          const shower = getShowerZoneDefinition(room);
          const screenX = toScreenX(shower.glassX);
          const screenStartY = toScreenY(shower.bounds.minY);
          const screenEndY = toScreenY(shower.bounds.maxY);
          const showerLeft = screenX;
          const showerRight = toScreenX(shower.bounds.maxX);
          const showerTop = screenEndY;
          const showerBottom = screenStartY;

          return (
            <g key="architectural-shower-zone">
              {/* Subtle Wet Zone Floor Indicator */}
              <rect
                x={showerLeft}
                y={showerTop}
                width={showerRight - showerLeft}
                height={showerBottom - showerTop}
                fill="#202428"
                fillOpacity="0.4"
                stroke="#353e46"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              {/* Glass Shower Screen Profile */}
              <line
                x1={screenX}
                y1={screenStartY}
                x2={screenX}
                y2={screenEndY}
                stroke="#7bb8cc"
                strokeWidth="3"
                strokeLinecap="square"
                opacity="0.85"
              />
              {/* Screen Wall Mount Profile */}
              <rect
                x={screenX - 3}
                y={screenStartY - 2}
                width="6"
                height="4"
                fill="#94a3b8"
              />
            </g>
          );
        })()}

        {/* Placed Fixtures Footprints */}
        {designState.placements.map((placement) => {
          const isSelected = selectedProductCode === placement.productCode;
          const isPlacedState = actionState.type === "PLACED" && actionState.productCode === placement.productCode;
          const isInvalid = isPlacedState && !actionState.validation.valid;

          // Compute Screen Center and Dimensions
          const cx = toScreenX(placement.position.x);
          const cy = toScreenY(placement.position.y);
          const w = placement.footprint.widthM * scale;
          const d = placement.footprint.depthM * scale;
          const rotDeg = placement.rotation.z;

          const role = placement.role.toLowerCase();
          const isFaucet = role.includes("faucet");
          const isToilet = role.includes("toilet");
          const isBasin = !isFaucet && (role.includes("basin") || role.includes("vanity"));
          const isBath = !isFaucet && role.includes("bath");
          const isShower = role.includes("shower") || role.includes("rainhead");

          return (
            <g
              key={placement.productCode}
              transform={`translate(${cx}, ${cy}) rotate(${rotDeg})`}
              onClick={(e) => {
                if (!isMoving) {
                  e.stopPropagation();
                  onSelectProduct(placement.productCode);
                }
              }}
              className="cursor-pointer transition-transform"
            >
              {/* Selected Highlight Ring / Box */}
              {isSelected && (
                <rect
                  x={-w / 2 - 8}
                  y={-d / 2 - 8}
                  width={w + 16}
                  height={d + 16}
                  rx="6"
                  fill="none"
                  stroke={isInvalid ? "#f43f5e" : "#c49a45"}
                  strokeWidth="2.5"
                  strokeDasharray={isMoving ? "4,4" : undefined}
                />
              )}

              {/* Fixture Body Footprint */}
              {isToilet && (
                <g>
                  {/* Cistern Tank */}
                  <rect
                    x={-w / 2}
                    y={-d / 2}
                    width={w}
                    height={d * 0.32}
                    rx="3"
                    fill={isSelected ? "#2b251f" : "#1f1d1a"}
                    stroke={isSelected ? "#c49a45" : "#6e6355"}
                    strokeWidth="1.5"
                  />
                  {/* Bowl Oval */}
                  <ellipse
                    cx="0"
                    cy={d * 0.12}
                    rx={w * 0.44}
                    ry={d * 0.36}
                    fill={isSelected ? "#362e24" : "#24221e"}
                    stroke={isSelected ? "#c49a45" : "#8a7e6e"}
                    strokeWidth="1.5"
                  />
                  <ellipse
                    cx="0"
                    cy={d * 0.14}
                    rx={w * 0.3}
                    ry={d * 0.24}
                    fill="#151412"
                    stroke="#524a3e"
                    strokeWidth="1"
                  />
                </g>
              )}

              {isBasin && (
                <g>
                  {/* Vanity Countertop */}
                  <rect
                    x={-w / 2}
                    y={-d / 2}
                    width={w}
                    height={d}
                    rx="4"
                    fill={isSelected ? "#2b251f" : "#1e1d1a"}
                    stroke={isSelected ? "#c49a45" : "#6e6355"}
                    strokeWidth="1.5"
                  />
                  {/* Inner Basin Cutout */}
                  <ellipse
                    cx="0"
                    cy="0"
                    rx={w * 0.38}
                    ry={d * 0.34}
                    fill={isSelected ? "#362e24" : "#282520"}
                    stroke={isSelected ? "#c49a45" : "#8a7e6e"}
                    strokeWidth="1.5"
                  />
                  {/* Basin Center Drain */}
                  <circle cx="0" cy="0" r="3" fill="#6e6355" />
                </g>
              )}

              {isFaucet && (
                <g>
                  {/* Faucet Base Flange */}
                  <circle
                    cx="0"
                    cy="0"
                    r={Math.max(w, d) * 0.45}
                    fill={isSelected ? "#362e24" : "#24221e"}
                    stroke={isSelected ? "#c49a45" : "#c29d66"}
                    strokeWidth="1.5"
                  />
                  {/* Spout Line pointing forward */}
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2={-Math.max(w, d) * 0.75}
                    stroke={isSelected ? "#d4af37" : "#c29d66"}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Aerator Dot */}
                  <circle
                    cx="0"
                    cy={-Math.max(w, d) * 0.75}
                    r="2.5"
                    fill="#ffffff"
                  />
                </g>
              )}

              {isBath && (
                <g>
                  {/* Bathtub Rim */}
                  <rect
                    x={-w / 2}
                    y={-d / 2}
                    width={w}
                    height={d}
                    rx="14"
                    fill={isSelected ? "#2b251f" : "#1e1d1a"}
                    stroke={isSelected ? "#c49a45" : "#6e6355"}
                    strokeWidth="1.5"
                  />
                  {/* Bathtub Inner Well */}
                  <rect
                    x={-w / 2 + 10}
                    y={-d / 2 + 10}
                    width={w - 20}
                    height={d - 20}
                    rx="10"
                    fill={isSelected ? "#362e24" : "#282520"}
                    stroke={isSelected ? "#c49a45" : "#8a7e6e"}
                    strokeWidth="1"
                  />
                </g>
              )}

              {isShower && (
                <g>
                  <circle cx="0" cy="0" r={Math.min(w, d) * 0.45} fill="#1c1a17" stroke="#c49a45" strokeWidth="1.5" />
                  <line x1={-12} y1={0} x2={12} y2={0} stroke="#c49a45" strokeWidth="1" />
                  <line x1={0} y1={-12} x2={0} y2={12} stroke="#c49a45" strokeWidth="1" />
                </g>
              )}

              {/* General / Other fixture fallback */}
              {!isToilet && !isBasin && !isBath && !isShower && (
                <rect
                  x={-w / 2}
                  y={-d / 2}
                  width={w}
                  height={d}
                  rx="3"
                  fill={isSelected ? "#2b251f" : "#1f1d1a"}
                  stroke={isSelected ? "#c49a45" : "#6e6355"}
                  strokeWidth="1.5"
                />
              )}

              {/* Product Code Label */}
              <text
                x="0"
                y={d / 2 + 14}
                textAnchor="middle"
                fontSize="10"
                fontFamily="sans-serif"
                fill={isSelected ? (isInvalid ? "#f43f5e" : "#f0d8a8") : "#a1998e"}
                fontWeight={isSelected ? "bold" : "normal"}
              >
                {placement.productCode}
              </text>
            </g>
          );
        })}

        {/* Dimension Callouts */}
        {/* Width Dimension Line (Top) */}
        <g stroke="#786f62" strokeWidth="1">
          <line x1={innerLeft} y1={innerTop - 25} x2={innerRight} y2={innerTop - 25} />
          <line x1={innerLeft} y1={innerTop - 32} x2={innerLeft} y2={innerTop - 18} />
          <line x1={innerRight} y1={innerTop - 32} x2={innerRight} y2={innerTop - 18} />
          <text
            x={(innerLeft + innerRight) / 2}
            y={innerTop - 30}
            fill="#dcd4c8"
            fontSize="11"
            fontFamily="monospace"
            textAnchor="middle"
          >
            {room.widthM.toFixed(2)} m ({((room.widthM * 3.28084)).toFixed(1)} ft)
          </text>
        </g>

        {/* Depth Dimension Line (Left) */}
        <g stroke="#786f62" strokeWidth="1">
          <line x1={innerLeft - 25} y1={innerTop} x2={innerLeft - 25} y2={innerBottom} />
          <line x1={innerLeft - 32} y1={innerTop} x2={innerLeft - 18} y2={innerTop} />
          <line x1={innerLeft - 32} y1={innerBottom} x2={innerLeft - 18} y2={innerBottom} />
          <text
            x={innerLeft - 32}
            y={(innerTop + innerBottom) / 2}
            fill="#dcd4c8"
            fontSize="11"
            fontFamily="monospace"
            textAnchor="middle"
            transform={`rotate(-90 ${innerLeft - 32} ${(innerTop + innerBottom) / 2})`}
          >
            {room.depthM.toFixed(2)} m ({((room.depthM * 3.28084)).toFixed(1)} ft)
          </text>
        </g>
      </svg>
    </div>
  );
}

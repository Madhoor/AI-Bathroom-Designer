"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";

function LargeFormatTiles({
  width,
  depth,
  position,
  rotation,
  surface,
}: {
  width: number;
  depth: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  surface: "floor" | "wall";
}) {
  const tiles = [];
  const tileWidth = 1.2;
  const tileHeight = 0.6;
  const columns = Math.ceil(width / tileWidth);
  const rows = Math.ceil(depth / tileHeight);

  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const x = -width / 2 + tileWidth / 2 + column * tileWidth;
      const offset = column % 2 === 0 ? 0 : tileHeight / 2;
      const z = -depth / 2 + tileHeight / 2 + row * tileHeight + offset;
      tiles.push(
        <mesh
          key={`${column}-${row}`}
          position={
            surface === "floor"
              ? [x, 0, z]
              : [x, -depth / 2 + tileHeight / 2 + row * tileHeight, 0]
          }
        >
          <boxGeometry
            args={
              surface === "floor"
                ? [tileWidth - 0.012, 0.018, tileHeight - 0.012]
                : [tileWidth - 0.012, tileHeight - 0.012, 0.018]
            }
          />
          <meshStandardMaterial
            color="#b9b1a5"
            roughness={0.72}
            metalness={0.02}
          />
        </mesh>,
      );
    }
  }

  return (
    <group position={position} rotation={rotation}>
      {tiles}
    </group>
  );
}

function CeilingLight() {
  return (
    <group position={[0, 3.96, -0.2]}>
      {[-1.8, 0, 1.8].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.025, 24]} />
          <meshStandardMaterial
            color="#eee9df"
            emissive="#fff5d6"
            emissiveIntensity={0.65}
            roughness={0.4}
          />
        </mesh>
      ))}
      <pointLight
        castShadow
        color="#fff1d1"
        intensity={32}
        distance={12}
        decay={2}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
    </group>
  );
}

function Vanity() {
  return (
    <group position={[-1.45, 0, -2.55]}>
      <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
        <boxGeometry args={[2.35, 1.05, 0.62]} />
        <meshStandardMaterial color="#5a5148" roughness={0.34} metalness={0.08} />
      </mesh>
      <mesh castShadow position={[0, 1.31, 0]}>
        <boxGeometry args={[2.5, 0.12, 0.72]} />
        <meshStandardMaterial color="#e1ddd4" roughness={0.28} />
      </mesh>
      <mesh castShadow position={[0, 1.4, 0]}>
        <boxGeometry args={[1.65, 0.13, 0.45]} />
        <meshStandardMaterial color="#f4f2ec" roughness={0.18} />
      </mesh>
      <mesh castShadow position={[0, 1.53, 0.12]}>
        <cylinderGeometry args={[0.055, 0.055, 0.34, 20]} />
        <meshStandardMaterial color="#b58b5b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 1.68, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.11, 0.04, 12, 24, Math.PI]} />
        <meshStandardMaterial color="#b58b5b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 2.25, 0.18]}>
        <boxGeometry args={[1.95, 1.15, 0.05]} />
        <meshStandardMaterial
          color="#76624e"
          metalness={0.72}
          roughness={0.24}
          emissive="#382b20"
          emissiveIntensity={0.22}
        />
      </mesh>
      <mesh position={[0, 2.25, 0.145]}>
        <boxGeometry args={[1.82, 1.02, 0.018]} />
        <meshPhysicalMaterial
          color="#9fa9a5"
          metalness={0.2}
          roughness={0.12}
          reflectivity={0.9}
          clearcoat={0.7}
          clearcoatRoughness={0.12}
        />
      </mesh>
      <mesh position={[0, 2.25, 0.115]}>
        <boxGeometry args={[1.7, 0.9, 0.012]} />
        <meshStandardMaterial color="#b7c0bb" emissive="#aab8b0" emissiveIntensity={0.12} />
      </mesh>
    </group>
  );
}

function Toilet() {
  return (
    <group position={[1.35, 0, -2.4]}>
      <mesh castShadow receiveShadow position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.5, 0.58, 0.78, 32]} />
        <meshStandardMaterial color="#e9e7e1" roughness={0.22} />
      </mesh>
      <mesh castShadow position={[0, 0.83, 0.03]} scale={[1, 0.22, 0.82]}>
        <sphereGeometry args={[0.59, 32, 16]} />
        <meshStandardMaterial color="#f5f3ee" roughness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 0.92, -0.16]} scale={[0.48, 0.07, 0.34]}>
        <torusGeometry args={[0.72, 0.12, 16, 32]} />
        <meshStandardMaterial color="#d7d4ce" roughness={0.25} />
      </mesh>
      <mesh castShadow position={[0, 1.15, -0.25]}>
        <boxGeometry args={[0.82, 0.58, 0.18]} />
        <meshStandardMaterial color="#efede8" roughness={0.25} />
      </mesh>
    </group>
  );
}

function Shower() {
  return (
    <group position={[2.85, 0, 0.9]}>
      <mesh receiveShadow position={[0, 1.95, -1.05]}>
        <boxGeometry args={[2.25, 3.8, 0.06]} />
        <meshPhysicalMaterial
          color="#9bb4b2"
          transparent
          opacity={0.22}
          roughness={0.08}
          transmission={0.35}
          thickness={0.03}
        />
      </mesh>
      <mesh castShadow position={[-0.92, 1.95, 0]}>
        <boxGeometry args={[0.055, 3.8, 2.1]} />
        <meshPhysicalMaterial color="#a4bbb9" transparent opacity={0.2} roughness={0.1} />
      </mesh>
      <mesh position={[-0.82, 2.95, -0.18]}>
        <cylinderGeometry args={[0.18, 0.18, 0.05, 32]} />
        <meshStandardMaterial color="#d1b181" metalness={0.85} roughness={0.18} />
      </mesh>
      <mesh position={[-0.82, 2.75, -0.18]}>
        <cylinderGeometry args={[0.025, 0.025, 0.5, 12]} />
        <meshStandardMaterial color="#d1b181" metalness={0.85} roughness={0.18} />
      </mesh>
      <mesh castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[2.15, 0.12, 2.05]} />
        <meshStandardMaterial color="#77726a" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Bathroom() {
  return (
    <>
      <color attach="background" args={["#d6d0c4"]} />
      <fog attach="fog" args={["#d6d0c4", 10, 20]} />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#aaa398" roughness={0.86} />
      </mesh>
      <LargeFormatTiles width={8} depth={6} position={[0, 0.012, 0]} surface="floor" />

      <mesh receiveShadow position={[0, 2, -3]}>
        <boxGeometry args={[8, 4, 0.15]} />
        <meshStandardMaterial color="#d8d3c9" roughness={0.8} />
      </mesh>
      <LargeFormatTiles
        width={8}
        depth={4}
        position={[0, 0, -2.91]}
        surface="wall"
      />

      <mesh receiveShadow position={[-4, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[6, 4, 0.15]} />
        <meshStandardMaterial color="#d4cec3" roughness={0.8} />
      </mesh>

      <Vanity />
      <Toilet />
      <Shower />
      <CeilingLight />

      <ambientLight intensity={0.55} color="#fffaf0" />
      <hemisphereLight args={["#fff7e8", "#6b6258", 1.1]} />
      <directionalLight
        castShadow
        position={[-4, 7, 4]}
        intensity={2.2}
        color="#fff3d8"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-5}
      />
      <ContactShadows
        position={[0, 0.012, 0]}
        opacity={0.38}
        scale={10}
        blur={2.5}
        far={4.5}
        resolution={512}
        color="#3d352c"
      />
    </>
  );
}

export default function BathroomCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [8.6, 5.6, 8.4], fov: 43, near: 0.1, far: 30 }}
    >
      <Bathroom />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.06}
        minDistance={5.5}
        maxDistance={14}
        minPolarAngle={0.65}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 1.35, -0.7]}
      />
    </Canvas>
  );
}

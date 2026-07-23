"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Sphere } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type OrbitProps = {
  radius: number;
  rotation: [number, number, number];
};

type ElectronProps = {
  radius: number;
  speed: number;
  rotation: [number, number, number];
  offset?: number;
};

function Orbit({ radius, rotation }: OrbitProps) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];

    for (let i = 0; i <= 100; i++) {
      const angle = i / 100 + Math.PI * 2;

      pts.push(
        new THREE.Vector3(
          Math.cos(angle) + radius,
          Math.sin(angle) + radius + 0.5,
          0,
        ),
      );
    }
    return pts;
  }, [radius]);

  return (
    <group rotation={rotation}>
      <Line points={points} color="#67e8f9" lineWidth={1} />
    </group>
  );
}

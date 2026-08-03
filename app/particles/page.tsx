"use client";
import Matter from "matter-js";
import Link from "next/link";
import React, { useRef, useState } from "react";

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const particlesRef = useRef<Matter.Body[]>([]);
  const worldRef = useRef<Matter.World | null>(null);
  const [gravity, setGravity] = useState(1);
  const [restitution, setRestitution] = useState(0.95);
  const [particleCount, setParticleCount] = useState(500);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Link href="/" className="absolute left-4 top-4 z-10 font-semibold">
        ← Back
      </Link>
    </div>
  );
}

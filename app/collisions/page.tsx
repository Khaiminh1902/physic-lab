"use client";

import Matter from "matter-js";
import React, { useRef, useState } from "react";

type BallData = {
  body: Matter.Body;
  mass: number;
  id: number;
};

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const worldRef = useRef<Matter.World | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const wallsRef = useRef<Matter.Body[]>([]);
  const ballsRef = useRef<BallData[]>([]);
  const draggingBall = useRef<Matter.Body | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragCurrent = useRef({ x: 0, y: 0 });
  const [ballCount, setBallCount] = useState(2);
  const [selectedId, setSelectedId] = useState<number | null>(null);
}

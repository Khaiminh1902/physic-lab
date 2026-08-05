"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const INITIAL_LENGTH_METERS = 1.2;
const INITIAL_GRAVITY = 9.8;
const INITIAL_DAMPING = 0.045;
const INITIAL_BOB_MASS = 8;
const INITIAL_START_ANGLE = 32;

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const angleRef = useRef(Math.PI / 3);
  const velocityRef = useRef(0);
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const accumulatorRef = useRef(0);
  const dragModeRef = useRef<"bob" | "pivot" | null>(null);
  const bobStateRef = useRef({ x: 0, y: 0, radius: 0, pivotX: 0, pivotY: 0 });
  const pivotRef = useRef({ x: 0, y: 0, initialized: false });
  const hoverTargetRef = useRef<"bob" | "pivot" | null>(null);
  const [lengthMeters, setLengthMeters] = useState(INITIAL_LENGTH_METERS);
  const [gravity, setGravity] = useState(INITIAL_GRAVITY);
  const [damping, setDamping] = useState(INITIAL_DAMPING);
  const [bobMass, setBobMass] = useState(INITIAL_BOB_MASS);
  const [startAngle, setStartAngle] = useState(INITIAL_START_ANGLE);
  const [isRunning, setIsRunning] = useState(true);
  const [energy, setEnergy] = useState(0);

  useEffect(() => {
    angleRef.current = (startAngle * Math.PI) / 180;
    velocityRef.current = 0;
    trailRef.current = [];
    accumulatorRef.current = 0;
  }, [startAngle, lengthMeters]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const context = canvas.getContext("2d");

    if (!context) return;

    let previousTime = performance.now();

    const draw = (now: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const pixelRatio = window.devicePixelRatio || 1;

      if (
        canvas.width !== Math.floor(width * pixelRatio) ||
        canvas.height !== Math.floor(height * pixelRatio)
      ) {
        canvas.width = Math.floor(width * pixelRatio);
        canvas.height = Math.floor(height * pixelRatio);
      }

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      const dt = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;

      if (isRunning && dragModeRef.current === null) {
        const fixedStep = 1 / 120;
        accumulatorRef.current = Math.min(accumulatorRef.current + dt, 0.1);

        while (accumulatorRef.current >= fixedStep) {
          const angularAcceleration =
            -(gravity / lengthMeters) * Math.sin(angleRef.current) -
            damping * velocityRef.current;

          velocityRef.current += angularAcceleration * fixedStep;
          angleRef.current += velocityRef.current * fixedStep;
          accumulatorRef.current -= fixedStep;
        }
      }

      if (!pivotRef.current.initialized) {
        pivotRef.current = {
          x: width / 2,
          y: Math.min(120, height * 0.22),
          initialized: true,
        };
      } else {
        pivotRef.current.x = clamp(pivotRef.current.x, 40, width - 40);
        pivotRef.current.y = clamp(pivotRef.current.y, 40, height - 140);
      }

      const pivotX = pivotRef.current.x;
      const pivotY = pivotRef.current.y;
      const bobRadius = clamp(12 + bobMass * 1.3, 16, 30);
      const maxVisualLength = Math.max(height - pivotY - bobRadius - 40, 120);
      const pendulumLengthPx = Math.min(lengthMeters * 140, maxVisualLength);
      const bobX = pivotX + pendulumLengthPx * Math.sin(angleRef.current);
      const bobY = pivotY + pendulumLengthPx * Math.cos(angleRef.current);

      bobStateRef.current = {
        x: bobX,
        y: bobY,
        radius: bobRadius,
        pivotX,
        pivotY,
      };

      trailRef.current.push({ x: bobX, y: bobY });
      if (trailRef.current.length > 90) {
        trailRef.current.shift();
      }

      const speed = lengthMeters * velocityRef.current;
      const currentEnergy =
        bobMass * gravity * lengthMeters * (1 - Math.cos(angleRef.current)) +
        0.5 * bobMass * speed * speed;
      setEnergy(currentEnergy);

      context.fillStyle = "rgba(6, 11, 24, 0.45)";
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(34, 211, 238, 0.4)";
      context.lineWidth = 2;
      context.beginPath();
      trailRef.current.forEach((point, index) => {
        if (index === 0) {
          context.moveTo(point.x, point.y);
          return;
        }

        context.lineTo(point.x, point.y);
      });
      context.stroke();

      context.strokeStyle = "rgba(226, 232, 240, 0.95)";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(pivotX, pivotY);
      context.lineTo(bobX, bobY);
      context.stroke();

      context.fillStyle = "rgba(34, 211, 238, 0.18)";
      context.beginPath();
      context.arc(pivotX, pivotY, 24, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "#e2e8f0";
      context.beginPath();
      context.arc(pivotX, pivotY, 6, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "#67e8f9";
      context.shadowColor = "rgba(34, 211, 238, 0.5)";
      context.shadowBlur = 28;
      context.beginPath();
      context.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    animationFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [bobMass, damping, gravity, isRunning, lengthMeters]);
}

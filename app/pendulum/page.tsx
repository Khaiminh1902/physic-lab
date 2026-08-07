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

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "#000000";
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

      context.strokeStyle = "#000000";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(pivotX, pivotY);
      context.lineTo(bobX, bobY);
      context.stroke();

      context.fillStyle = "#000000";
      context.beginPath();
      context.arc(pivotX, pivotY, 24, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "#000000";
      context.beginPath();
      context.arc(pivotX, pivotY, 6, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "#000000";
      context.shadowColor = "#ffffff";
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

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const getCanvasPoint = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const updatePendulumFromPointer = (event: PointerEvent) => {
      const { x, y } = getCanvasPoint(event);
      const { pivotX, pivotY } = bobStateRef.current;
      const dx = x - pivotX;
      const dy = y - pivotY;

      if (dx === 0 && dy === 0) return;

      angleRef.current = Math.atan2(dx, dy);
      velocityRef.current = 0;
      accumulatorRef.current = 0;
      trailRef.current = [];
    };

    const updatePivotFromPointer = (event: PointerEvent) => {
      const { x, y } = getCanvasPoint(event);
      const { radius } = bobStateRef.current;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      pivotRef.current.x = clamp(x, 40, width - 40);
      pivotRef.current.y = clamp(y, 40, height - radius * 2 - 32);
      velocityRef.current = 0;
      accumulatorRef.current = 0;
      trailRef.current = [];
    };

    const handlePointerDown = (event: PointerEvent) => {
      const { x, y, radius, pivotX, pivotY } = bobStateRef.current;
      const point = getCanvasPoint(event);
      const bobDistance = Math.hypot(point.x - x, point.y - y);
      const pivotDistance = Math.hypot(point.x - pivotX, point.y - pivotY);

      if (pivotDistance <= 24) {
        dragModeRef.current = "pivot";
        velocityRef.current = 0;
        accumulatorRef.current = 0;
        trailRef.current = [];
        updatePivotFromPointer(event);
        canvas.style.cursor = "pointer";
        canvas.setPointerCapture(event.pointerId);
        return;
      }

      if (bobDistance > radius + 12) return;

      dragModeRef.current = "bob";
      velocityRef.current = 0;
      accumulatorRef.current = 0;
      trailRef.current = [];
      updatePendulumFromPointer(event);
      canvas.style.cursor = "pointer";
      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const { x, y, radius, pivotX, pivotY } = bobStateRef.current;
      const point = getCanvasPoint(event);
      const bobDistance = Math.hypot(point.x - x, point.y - y);
      const pivotDistance = Math.hypot(point.x - pivotX, point.y - pivotY);
      const hoverTarget =
        pivotDistance <= 24
          ? "pivot"
          : bobDistance <= radius + 12
            ? "bob"
            : null;

      if (
        hoverTargetRef.current !== hoverTarget &&
        dragModeRef.current === null
      ) {
        hoverTargetRef.current = hoverTarget;
        canvas.style.cursor = hoverTarget ? "pointer" : "default";
      }

      if (dragModeRef.current === "pivot") {
        updatePivotFromPointer(event);
        return;
      }

      if (dragModeRef.current !== "bob") return;
      updatePendulumFromPointer(event);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (dragModeRef.current === null) return;

      const activeMode = dragModeRef.current;
      dragModeRef.current = null;
      canvas.releasePointerCapture(event.pointerId);

      if (activeMode === "pivot") {
        updatePivotFromPointer(event);
      } else {
        updatePendulumFromPointer(event);
      }

      const { x, y, radius, pivotX, pivotY } = bobStateRef.current;
      const point = getCanvasPoint(event);
      const bobDistance = Math.hypot(point.x - x, point.y - y);
      const pivotDistance = Math.hypot(point.x - pivotX, point.y - pivotY);

      hoverTargetRef.current =
        pivotDistance <= 24
          ? "pivot"
          : bobDistance <= radius + 12
            ? "bob"
            : null;
      canvas.style.cursor = hoverTargetRef.current ? "pointer" : "default";
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (dragModeRef.current === null) return;
      dragModeRef.current = null;
      canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = hoverTargetRef.current ? "pointer" : "default";
    };

    const handlePointerLeave = () => {
      if (dragModeRef.current !== null) return;
      hoverTargetRef.current = null;
      canvas.style.cursor = "default";
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerCancel);
    canvas.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerCancel);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  const resetExperiment = () => {
    setLengthMeters(INITIAL_LENGTH_METERS);
    setGravity(INITIAL_GRAVITY);
    setDamping(INITIAL_DAMPING);
    setBobMass(INITIAL_BOB_MASS);
    setStartAngle(INITIAL_START_ANGLE);
    setIsRunning(true);
    setEnergy(0);

    angleRef.current = (INITIAL_START_ANGLE * Math.PI) / 180;
    velocityRef.current = 0;
    trailRef.current = [];
    accumulatorRef.current = 0;
    dragModeRef.current = null;
    hoverTargetRef.current = null;
    pivotRef.current = { x: 0, y: 0, initialized: false };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = "default";
    }
  };

  return (
    <main className="relative h-screen overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
      />

      <Link
        href="/"
        className="absolute left-4 top-4 z-10 inline-flex items-center font-semibold text-black"
      >
        ← Back
      </Link>

      <div className="absolute right-4 top-4 z-10 flex items-center gap-3 md:right-5 md:top-5">
        <div className="border px-4 py-2 backdrop-blur-xl">
          <div className="text-[0.68rem] uppercase tracking-[0.35em]">
            Energy
          </div>
          <div className="mt-1 text-xl font-semibold">
            {energy.toFixed(0)} J
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsRunning((value) => !value)}
          className="border px-4 py-2 text-sm font-semibold cursor-pointer"
        >
          {isRunning ? "Pause" : "Resume"}
        </button>
      </div>

      <aside className="absolute bottom-4 right-4 top-20 z-10 w-80 overflow-hidden border md:bottom-5 md:right-5 md:top-24 md:w-84 p-2">
        <div className="mb-5 p-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.35em] ">
            Pendulum Simulator
          </div>

          <div className="mt-1 h-px bg-linear-to-r " />

          <div className="mt-3 text-2xl font-bold">Controls</div>

          <div className="text-sm">
            Drag the bob or pivot to reposition the pendulum
          </div>
        </div>

        <div className="space-y-3">
          <ControlCard
            label="String length"
            value={`${lengthMeters.toFixed(1)} m`}
            min="0.4"
            max="2.4"
            step="0.1"
            currentValue={lengthMeters}
            onChange={(value) => setLengthMeters(value)}
          />
          <ControlCard
            label="Gravity"
            value={`${gravity.toFixed(1)} m/s²`}
            min="1"
            max="20"
            step="0.1"
            currentValue={gravity}
            onChange={(value) => setGravity(value)}
          />
          <ControlCard
            label="Damping"
            value={damping.toFixed(3)}
            min="0"
            max="0.18"
            step="0.005"
            currentValue={damping}
            onChange={(value) => setDamping(value)}
          />
          <ControlCard
            label="Bob mass"
            value={`${bobMass.toFixed(0)} kg`}
            min="4"
            max="14"
            step="1"
            currentValue={bobMass}
            onChange={(value) => setBobMass(value)}
          />
          <ControlCard
            label="Release angle"
            value={`${startAngle.toFixed(0)}°`}
            min="5"
            max="85"
            step="1"
            currentValue={startAngle}
            onChange={(value) => setStartAngle(value)}
          />
        </div>

        <button
          onClick={resetExperiment}
          className="
          mt-5 w-full
          px-4 py-3
          font-medium
          cursor-pointer
          border 
        "
        >
          Refresh
        </button>
      </aside>
    </main>
  );
}

type ControlCardProps = {
  label: string;
  value: string;
  min: string;
  max: string;
  step: string;
  currentValue: number;
  onChange: (value: number) => void;
};

function ControlCard({
  label,
  value,
  min,
  max,
  step,
  currentValue,
  onChange,
}: ControlCardProps) {
  return (
    <div className="border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium ">{label}</div>
        <div className="text-xs">{value}</div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2.5 w-full cursor-pointer accent-black"
      />
    </div>
  );
}

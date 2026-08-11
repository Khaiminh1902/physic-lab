"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type WeightType = {
  id: string;
  label: string;
  grams: number;
  width: number;
  height: number;
};

type AttachedWeight = WeightType & {
  instanceId: number;
};

const WEIGHT_TYPES: WeightType[] = [
  {
    id: "w-50",
    label: "50 g",
    grams: 50,
    width: 56,
    height: 62,
  },
  {
    id: "w-100",
    label: "100 g",
    grams: 100,
    width: 68,
    height: 84,
  },
  {
    id: "w-250",
    label: "250 g",
    grams: 250,
    width: 80,
    height: 112,
  },
  {
    id: "w-500",
    label: "500 g",
    grams: 500,
    width: 92,
    height: 136,
  },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const HOOK_MASS_KG = 0.08;
const RELAXED_LENGTH_PX = 160;
const METERS_TO_PIXELS = 110;
const INITIAL_EXTENSION = 0.05;
const INITIAL_SPRING_COUNT = 1;
const INITIAL_GRAVITY = 9.8;
const INITIAL_STIFFNESS = 18;
const INITIAL_DAMPING = 0.75;
const MIN_EXTENSION = -0.72;
const MAX_EXTENSION = 2.4;

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const extensionRef = useRef(INITIAL_EXTENSION);
  const velocityRef = useRef(0);
  const accumulatorRef = useRef(0);
  const attachedWeightsRef = useRef<AttachedWeight[]>([]);
  const springCountRef = useRef(INITIAL_SPRING_COUNT);
  const gravityRef = useRef(INITIAL_GRAVITY);
  const stiffnessRef = useRef(INITIAL_STIFFNESS);
  const dampingRef = useRef(INITIAL_DAMPING);
  const nextWeightIdRef = useRef(1);
  const draggingHookRef = useRef(false);
  const draggingWeightRef = useRef<{
    instanceId: number;
    pointerX: number;
    pointerY: number;
  } | null>(null);
  const hookFrameRef = useRef({
    x: 0,
    y: 0,
    anchorY: 0,
    shelfY: 0,
    dropZone: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    },
    weightRects: [] as Array<{
      instanceId: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }>,
  });

  const [attachedWeights, setAttachedWeights] = useState<AttachedWeight[]>([]);
  const [springCount, setSpringCount] = useState(INITIAL_SPRING_COUNT);
  const [gravity, setGravity] = useState(INITIAL_GRAVITY);
  const [stiffness, setStiffness] = useState(INITIAL_STIFFNESS);
  const [damping, setDamping] = useState(INITIAL_DAMPING);
  const [isHookActive, setIsHookActive] = useState(false);

  useEffect(() => {
    attachedWeightsRef.current = attachedWeights;
  }, [attachedWeights]);

  useEffect(() => {
    springCountRef.current = springCount;
  }, [springCount]);

  useEffect(() => {
    gravityRef.current = gravity;
  }, [gravity]);

  useEffect(() => {
    stiffnessRef.current = stiffness;
  }, [stiffness]);

  useEffect(() => {
    dampingRef.current = damping;
  }, [damping]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const context = canvas.getContext("2d");

    if (!context) return;

    let previousTime = performance.now();

    const drawSpring = (
      anchorX: number,
      topY: number,
      bottomY: number,
      width: number,
    ) => {
      const span = bottomY - topY;
      const turns = Math.max(11, Math.round(span / 18));
      const lead = 14;

      context.beginPath();
      context.moveTo(anchorX, topY);
      context.lineTo(anchorX, topY + lead);

      for (let i = 0; i <= turns; i += 1) {
        const t = i / turns;
        const direction = i % 2 === 0 ? -1 : 1;
        const x =
          i === 0 || i === turns ? anchorX : anchorX + direction * width * 0.5;
        const y = topY + lead + (span - lead * 2) * t;

        context.lineTo(x, y);
      }

      context.lineTo(anchorX, bottomY);
      context.stroke();
    };

    const render = (now: number) => {
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

      const dt = Math.min((now - previousTime) / 1000, 0.04);
      previousTime = now;
      accumulatorRef.current = Math.min(accumulatorRef.current + dt, 0.08);

      const mass =
        HOOK_MASS_KG +
        attachedWeightsRef.current.reduce(
          (sum, weight) => sum + weight.grams / 1000,
          0,
        );
      const effectiveStiffness = springCountRef.current * stiffnessRef.current;
      const fixedStep = 1 / 120;

      while (accumulatorRef.current >= fixedStep) {
        if (draggingHookRef.current || draggingWeightRef.current !== null) {
          accumulatorRef.current = 0;
          break;
        }

        const acceleration =
          (mass * gravityRef.current -
            effectiveStiffness * extensionRef.current -
            dampingRef.current * velocityRef.current) /
          mass;

        velocityRef.current += acceleration * fixedStep;
        extensionRef.current = clamp(
          extensionRef.current + velocityRef.current * fixedStep,
          MIN_EXTENSION,
          MAX_EXTENSION,
        );
        accumulatorRef.current -= fixedStep;
      }

      const supportY = 58;
      const anchorY = supportY + 6;
      const baseX = width * 0.52;
      const shelfY = height - 76;
      const hookY = clamp(
        anchorY + RELAXED_LENGTH_PX + extensionRef.current * METERS_TO_PIXELS,
        anchorY + 56,
        shelfY - 120,
      );
      const springTopY = anchorY + 10;
      const springBottomY = hookY - 10;
      const offsetGap = springCountRef.current > 1 ? 42 : 0;
      const springOffsets = Array.from(
        { length: springCountRef.current },
        (_, index) => (index - (springCountRef.current - 1) / 2) * offsetGap,
      );

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "#000000";
      context.lineWidth = 8;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(baseX - 150, supportY);
      context.lineTo(baseX + 150, supportY);
      context.stroke();

      context.strokeStyle = "#000000";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(baseX, supportY);
      context.lineTo(baseX, springTopY);
      context.stroke();

      springOffsets.forEach((offsetX) => {
        const springX = baseX + offsetX;

        context.strokeStyle = "#000000";
        context.lineWidth = 3.1;
        context.lineJoin = "round";
        context.lineCap = "round";
        drawSpring(springX, springTopY, springBottomY, 34);

        context.strokeStyle = "#000000";
        context.lineWidth = 1.2;
        drawSpring(springX + 1.5, springTopY, springBottomY, 30);
      });

      context.strokeStyle = "#000000";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(baseX - 18, hookY - 10);
      context.lineTo(baseX + 18, hookY - 10);
      context.stroke();

      context.beginPath();
      context.arc(baseX, hookY + 8, 18, Math.PI * 0.08, Math.PI * 1.08, false);
      context.stroke();

      context.strokeStyle = isHookActive ? "#000000" : "#000000";
      context.lineWidth = 1.5;
      context.setLineDash([6, 6]);
      const dropZone = {
        x: baseX - 62,
        y: hookY - 30,
        width: 124,
        height: 108,
      };
      context.strokeRect(
        dropZone.x,
        dropZone.y,
        dropZone.width,
        dropZone.height,
      );
      context.setLineDash([]);

      let stackY = hookY + 34;
      const weightRects: Array<{
        instanceId: number;
        x: number;
        y: number;
        width: number;
        height: number;
      }> = [];

      attachedWeightsRef.current.forEach((weight) => {
        if (draggingWeightRef.current?.instanceId === weight.instanceId) {
          return;
        }

        const blockWidth = clamp(weight.width, 48, 96);
        const blockHeight = clamp(weight.height * 0.55, 40, 90);
        const left = baseX - blockWidth / 2;

        const gradient = context.createLinearGradient(
          left,
          stackY,
          left + blockWidth,
          stackY + blockHeight,
        );
        gradient.addColorStop(0, "#000000");
        gradient.addColorStop(1, "#000000");

        context.fillStyle = gradient;
        context.fillRect(left, stackY, blockWidth, blockHeight);
        context.strokeStyle = "rgba(255,255,255,0.35)";
        context.lineWidth = 1.2;
        context.strokeRect(left, stackY, blockWidth, blockHeight);

        context.fillStyle = "rgba(15,23,42,0.9)";
        context.font = "700 12px sans-serif";
        context.textAlign = "center";
        context.fillText(weight.label, baseX, stackY + blockHeight / 2 + 4);

        weightRects.push({
          instanceId: weight.instanceId,
          x: left,
          y: stackY,
          width: blockWidth,
          height: blockHeight,
        });

        stackY += blockHeight + 6;
      });

      const draggingWeight = draggingWeightRef.current
        ? attachedWeightsRef.current.find(
            (weight) =>
              weight.instanceId === draggingWeightRef.current?.instanceId,
          )
        : null;

      if (draggingWeight && draggingWeightRef.current) {
        const blockWidth = clamp(draggingWeight.width, 48, 96);
        const blockHeight = clamp(draggingWeight.height * 0.55, 40, 90);
        const left = draggingWeightRef.current.pointerX - blockWidth / 2;
        const top = draggingWeightRef.current.pointerY - blockHeight / 2;
        const gradient = context.createLinearGradient(
          left,
          top,
          left + blockWidth,
          top + blockHeight,
        );
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(1, "#d1d5db");

        context.globalAlpha = 0.92;
        context.fillStyle = gradient;
        context.fillRect(left, top, blockWidth, blockHeight);
        context.strokeStyle = "rgba(255,255,255,0.55)";
        context.lineWidth = 1.2;
        context.strokeRect(left, top, blockWidth, blockHeight);
        context.fillStyle = "rgba(15,23,42,0.9)";
        context.font = "700 12px sans-serif";
        context.textAlign = "center";
        context.fillText(
          draggingWeight.label,
          left + blockWidth / 2,
          top + blockHeight / 2 + 4,
        );
        context.globalAlpha = 1;
      }

      hookFrameRef.current = {
        x: baseX,
        y: hookY + 8,
        anchorY,
        shelfY,
        dropZone,
        weightRects,
      };

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isHookActive]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const getPoint = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const isInsideDropZone = (x: number, y: number) => {
      const { dropZone } = hookFrameRef.current;

      return (
        x >= dropZone.x &&
        x <= dropZone.x + dropZone.width &&
        y >= dropZone.y &&
        y <= dropZone.y + dropZone.height
      );
    };

    const updateFromPointer = (event: PointerEvent) => {
      const point = getPoint(event);
      const { anchorY, shelfY } = hookFrameRef.current;
      const minHookY = anchorY + 56;
      const maxHookY = shelfY - 120;
      const targetHookY = clamp(point.y, minHookY, maxHookY);

      extensionRef.current = clamp(
        (targetHookY - anchorY - RELAXED_LENGTH_PX) / METERS_TO_PIXELS,
        MIN_EXTENSION,
        MAX_EXTENSION,
      );
      velocityRef.current = 0;
      accumulatorRef.current = 0;
    };

    const handlePointerDown = (event: PointerEvent) => {
      const point = getPoint(event);
      const { x, y, weightRects } = hookFrameRef.current;

      const clickedWeight = weightRects.find(
        (weight) =>
          point.x >= weight.x &&
          point.x <= weight.x + weight.width &&
          point.y >= weight.y &&
          point.y <= weight.y + weight.height,
      );

      if (clickedWeight) {
        draggingWeightRef.current = {
          instanceId: clickedWeight.instanceId,
          pointerX: point.x,
          pointerY: point.y,
        };
        velocityRef.current = 0;
        accumulatorRef.current = 0;
        setIsHookActive(true);
        canvas.style.cursor = "grabbing";
        canvas.setPointerCapture(event.pointerId);
        return;
      }

      if (Math.hypot(point.x - x, point.y - y) > 36) return;

      draggingHookRef.current = true;
      updateFromPointer(event);
      canvas.style.cursor = "grabbing";
      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const point = getPoint(event);
      const { x, y } = hookFrameRef.current;
      const isHoveringHook = Math.hypot(point.x - x, point.y - y) <= 36;

      if (draggingHookRef.current) {
        updateFromPointer(event);
        return;
      }

      if (draggingWeightRef.current) {
        draggingWeightRef.current = {
          ...draggingWeightRef.current,
          pointerX: point.x,
          pointerY: point.y,
        };
        setIsHookActive(isInsideDropZone(point.x, point.y));
        return;
      }

      const isHoveringWeight = hookFrameRef.current.weightRects.some(
        (weight) =>
          point.x >= weight.x &&
          point.x <= weight.x + weight.width &&
          point.y >= weight.y &&
          point.y <= weight.y + weight.height,
      );

      canvas.style.cursor = isHoveringWeight
        ? "pointer"
        : isHoveringHook
          ? "grab"
          : "default";
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (draggingWeightRef.current) {
        const point = getPoint(event);
        const draggedInstanceId = draggingWeightRef.current.instanceId;
        const shouldKeep = isInsideDropZone(point.x, point.y);

        if (!shouldKeep) {
          setAttachedWeights((current) =>
            current.filter((item) => item.instanceId !== draggedInstanceId),
          );
        }

        draggingWeightRef.current = null;
        setIsHookActive(false);
        canvas.style.cursor = "default";
        canvas.releasePointerCapture(event.pointerId);
        return;
      }

      if (!draggingHookRef.current) return;

      draggingHookRef.current = false;
      setIsHookActive(false);
      canvas.style.cursor = "grab";
      canvas.releasePointerCapture(event.pointerId);
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  const addWeight = (weightTypeId: string) => {
    const weight = WEIGHT_TYPES.find((item) => item.id === weightTypeId);

    if (!weight) return;

    setAttachedWeights((current) => [
      ...current,
      { ...weight, instanceId: nextWeightIdRef.current++ },
    ]);
  };

  const resetSimulation = () => {
    setAttachedWeights([]);
    attachedWeightsRef.current = [];
    setSpringCount(INITIAL_SPRING_COUNT);
    springCountRef.current = INITIAL_SPRING_COUNT;
    setGravity(INITIAL_GRAVITY);
    gravityRef.current = INITIAL_GRAVITY;
    setStiffness(INITIAL_STIFFNESS);
    stiffnessRef.current = INITIAL_STIFFNESS;
    setDamping(INITIAL_DAMPING);
    dampingRef.current = INITIAL_DAMPING;
    setIsHookActive(false);
    nextWeightIdRef.current = 1;
    extensionRef.current = INITIAL_EXTENSION;
    velocityRef.current = 0;
    accumulatorRef.current = 0;
  };

  return (
    <main
      className="relative h-screen overflow-hidden"
      onDragOver={(event) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const { dropZone } = hookFrameRef.current;
        const isInside =
          x >= dropZone.x &&
          x <= dropZone.x + dropZone.width &&
          y >= dropZone.y &&
          y <= dropZone.y + dropZone.height;

        setIsHookActive(isInside);
      }}
      onDragLeave={() => setIsHookActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const { dropZone } = hookFrameRef.current;
        const isInside =
          x >= dropZone.x &&
          x <= dropZone.x + dropZone.width &&
          y >= dropZone.y &&
          y <= dropZone.y + dropZone.height;

        setIsHookActive(false);

        if (!isInside) return;

        addWeight(event.dataTransfer.getData("text/plain"));
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <Link
        href="/"
        className="absolute left-4 top-4 z-20 inline-flex items-center font-semibold0"
      >
        ← Back
      </Link>

      <div className="absolute right-4 top-4 z-20 w-[min(320px,calc(100vw-2rem))] border p-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.35em]">
          Spring Simulation
        </div>
        <div className="mt-1 h-px " />

        <div className="mt-4 space-y-3">
          <ControlRow
            label="Springs"
            value={`${springCount}`}
            min={1}
            max={4}
            step={1}
            current={springCount}
            onChange={(value) => setSpringCount(value)}
          />
          <ControlRow
            label="Gravity"
            value={gravity.toFixed(1)}
            min={0}
            max={20}
            step={0.1}
            current={gravity}
            onChange={(value) => setGravity(value)}
          />
          <ControlRow
            label="Stiffness"
            value={stiffness.toFixed(1)}
            min={6}
            max={40}
            step={0.5}
            current={stiffness}
            onChange={(value) => setStiffness(value)}
          />
          <ControlRow
            label="Damping"
            value={damping.toFixed(2)}
            min={0.1}
            max={2}
            step={0.05}
            current={damping}
            onChange={(value) => setDamping(value)}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={resetSimulation}
            className="
          group relative w-full overflow-hidden 
          border 
          px-4 py-3
          font-medium
          cursor-pointer
        "
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="absolute bottom-5 left-5 z-20">
        <div className="relative flex h-44 w-85 items-end gap-4">
          {WEIGHT_TYPES.map((weight) => (
            <button
              key={weight.id}
              type="button"
              draggable
              onDragStart={(event) =>
                event.dataTransfer.setData("text/plain", weight.id)
              }
              className="relative bottom-3 flex cursor-pointer items-end justify-center border border-white/35 pb-3 text-sm font-bold text-white  hover:-translate-y-1 bg-black"
              style={{
                width: weight.width,
                height: weight.height,
                backgroundImage: "#000000",
              }}
            >
              <span>{weight.label}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

type ControlRowProps = {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (value: number) => void;
};

function ControlRow({
  label,
  value,
  min,
  max,
  step,
  current,
  onChange,
}: ControlRowProps) {
  return (
    <div className=" border border-slate-800 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs">{value}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full cursor-pointer accent-black"
      />
    </div>
  );
}

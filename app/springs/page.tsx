import Link from "next/link";
import { useRef, useState, useEffect } from "react";

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
    label: "50g",
    grams: 50,
    width: 56,
    height: 62,
  },
  {
    id: "w-100",
    label: "100g",
    grams: 100,
    width: 68,
    height: 84,
  },
  {
    id: "w-250",
    label: "250g",
    grams: 250,
    width: 80,
    height: 112,
  },
  {
    id: "w-500",
    label: "500g",
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

  return (
    <div>
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 inline-flex items-center font-semibold text-black"
      >
        ← Back
      </Link>
      <div></div>
    </div>
  );
}

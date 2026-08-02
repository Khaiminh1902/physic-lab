/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import Link from "next/link";

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

  const [resetKey, setResetKey] = useState(0);

  function createBall(x: number, y: number, mass = 1, id = Date.now()) {
    const body = Matter.Bodies.circle(x, y, 25, {
      restitution: 1,
      friction: 0,
      frictionAir: 0,
      render: { fillStyle: "#000000" },
    });

    Matter.Body.setMass(body, mass);

    return { body, mass, id };
  }

  function initSimulation() {
    const { Engine, Render, Runner, World, Bodies, Events, Query } = Matter;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const engine = Engine.create();
    engine.gravity.y = 0;

    engineRef.current = engine;
    worldRef.current = engine.world;

    const render = Render.create({
      canvas: canvasRef.current!,
      engine,
      options: {
        width,
        height,
        wireframes: false,
        background: "transparent",
      },
    });

    const onResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      render.options.width = width;
      render.options.height = height;

      render.canvas.width = width;
      render.canvas.height = height;

      World.remove(engine.world, wallsRef.current);

      const thickness = 200;

      wallsRef.current = [
        Bodies.rectangle(width / 2, -thickness / 2, width, thickness, {
          isStatic: true,
        }),
        Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, {
          isStatic: true,
        }),
        Bodies.rectangle(-thickness / 2, height / 2, thickness, height, {
          isStatic: true,
        }),
        Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, {
          isStatic: true,
        }),
      ];

      World.add(engine.world, wallsRef.current);
    };

    window.addEventListener("resize", onResize);

    renderRef.current = render;

    const thickness = 200;

    wallsRef.current = [
      Bodies.rectangle(width / 2, -thickness / 2, width, thickness, {
        isStatic: true,
      }),
      Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, {
        isStatic: true,
      }),
      Bodies.rectangle(-thickness / 2, height / 2, thickness, height, {
        isStatic: true,
      }),
      Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, {
        isStatic: true,
      }),
    ];

    World.add(engine.world, wallsRef.current);

    const b1 = createBall(width / 2 - 80, height / 2, 1, 1);
    const b2 = createBall(width / 2 + 80, height / 2, 1, 2);

    ballsRef.current = [b1, b2];

    World.add(
      engine.world,
      ballsRef.current.map((b) => b.body),
    );

    const canvas = render.canvas;

    const getBallAt = (x: number, y: number) => {
      const found = Query.point(
        ballsRef.current.map((b) => b.body),
        { x, y },
      );
      return found[0] || null;
    };

    const onMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouse = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      const body = getBallAt(mouse.x, mouse.y);
      if (!body) return;

      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(body, 0);

      draggingBall.current = body;
      dragStart.current = mouse;
      dragCurrent.current = mouse;

      setSelectedId(ballsRef.current.find((b) => b.body === body)?.id ?? null);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!draggingBall.current) return;

      const rect = canvas.getBoundingClientRect();
      dragCurrent.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const onMouseUp = () => {
      if (!draggingBall.current) return;

      const body = draggingBall.current;

      const dx = dragStart.current.x - dragCurrent.current.x;
      const dy = dragStart.current.y - dragCurrent.current.y;

      const power = 0.02;

      Matter.Body.setVelocity(body, {
        x: dx * power,
        y: dy * power,
      });

      draggingBall.current = null;
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);

    Events.on(render, "afterRender", () => {
      const ctx = render.context;

      if (draggingBall.current) {
        const start = draggingBall.current.position;

        const dx = dragCurrent.current.x - dragStart.current.x;
        const dy = dragCurrent.current.y - dragStart.current.y;

        const end = {
          x: start.x - dx,
          y: start.y - dy,
        };

        const speed = Math.sqrt(dx * dx + dy * dy) * 0.02;

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.stroke();

        const angle = Math.atan2(end.y - start.y, end.x - start.x);

        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - 10 * Math.cos(angle - 0.5),
          end.y - 10 * Math.sin(angle - 0.5),
        );
        ctx.lineTo(
          end.x - 10 * Math.cos(angle + 0.5),
          end.y - 10 * Math.sin(angle + 0.5),
        );
        ctx.fillStyle = "#000000";
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.font = "14px sans-serif";
        ctx.fillText(`${speed.toFixed(2)} m/s`, end.x + 10, end.y + 10);
      }

      ballsRef.current.forEach((b) => {
        ctx.fillStyle = b.id === selectedId ? "#000000" : "#000000";
        ctx.font = "12px sans-serif";
        ctx.fillText(
          `m=${b.mass.toFixed(1)}kg`,
          b.body.position.x - 10,
          b.body.position.y - 30,
        );
      });
    });

    Events.on(engine, "beforeUpdate", () => {
      ballsRef.current.forEach((b) => {
        const v = b.body.velocity;
        const speed = Math.sqrt(v.x * v.x + v.y * v.y);

        const max = 50;

        if (speed > max) {
          Matter.Body.setVelocity(b.body, {
            x: (v.x / speed) * max,
            y: (v.y / speed) * max,
          });
        }
      });
    });

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", onResize);

      Render.stop(render);
      Runner.stop(runner);
      World.clear(engine.world, false);
      Engine.clear(engine);
    };
  }

  useEffect(() => {
    initSimulation();
  }, [resetKey]);

  useEffect(() => {
    ballsRef.current.forEach((b) => {
      if (b.id === selectedId) {
        b.body.render.fillStyle = "#000000";
      } else {
        b.body.render.fillStyle = "#000000";
      }
    });
  }, [selectedId]);

  const addBall = () => {
    if (!worldRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const id = Date.now();

    const ball = createBall(width / 2 + Math.random() * 100, height / 2, 1, id);

    ballsRef.current.push(ball);
    Matter.World.add(worldRef.current, ball.body);

    setBallCount(ballsRef.current.length);
  };

  const removeBall = () => {
    if (!worldRef.current) return;
    if (ballsRef.current.length <= 1) return;

    const removed = ballsRef.current.pop();
    if (!removed) return;

    Matter.World.remove(worldRef.current, removed.body);

    setBallCount(ballsRef.current.length);
  };

  const increaseMass = () => {
    const ball = ballsRef.current.find((b) => b.id === selectedId);
    if (!ball) return;

    ball.mass += 0.5;
    Matter.Body.setMass(ball.body, ball.mass);
  };

  const decreaseMass = () => {
    const ball = ballsRef.current.find((b) => b.id === selectedId);
    if (!ball) return;

    ball.mass = Math.max(0.1, ball.mass - 0.5);
    Matter.Body.setMass(ball.body, ball.mass);
  };

  const resetSimulation = () => {
    setResetKey((k) => k + 1);
    setBallCount(2);
    setSelectedId(null);
    ballsRef.current = [];
  };

  return (
    <div className="relative h-screen overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />

      <Link href="/" className="absolute left-4 top-4 z-10 font-semibold">
        ← Back
      </Link>

      <div className="absolute right-5 top-5 z-10">
        <div className="w-72 rounded-3xl border p-5">
          <div className="mb-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.35em]">
              Collisions Simulator
            </div>

            <div className="mt-1 h-px" />

            <div className="mt-3 text-2xl font-bold">Controls</div>

            <div className="text-sm">Drag the balls to launch them</div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Balls Amount</div>
                  <div className="text-xs">{ballCount}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={removeBall}
                className="cursor-pointer flex-1 rounded-xl border"
              >
                -
              </button>

              <button
                onClick={addBall}
                className=" cursor-pointer flex-1 rounded-xl border"
              >
                +
              </button>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-2">
                <div className="font-medium">Mass</div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={decreaseMass}
                  className="cursor-pointer flex-1 rounded-xl border"
                >
                  −
                </button>

                <button
                  onClick={increaseMass}
                  className="cursor-pointer flex-1 rounded-xl border"
                >
                  +
                </button>
              </div>
            </div>
            <button
              onClick={resetSimulation}
              className="
        "
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

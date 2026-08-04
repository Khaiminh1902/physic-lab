/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const engineRef = useRef<Matter.Engine | null>(null);
  const particlesRef = useRef<Matter.Body[]>([]);
  const worldRef = useRef<Matter.World | null>(null);

  const [gravity, setGravity] = useState(1);
  const [restitution, setRestitution] = useState(0.95);
  const [particleCount, setParticleCount] = useState(500);

  useEffect(() => {
    const { Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint } =
      Matter;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const engine = Engine.create();
    engine.positionIterations = 12;
    engine.velocityIterations = 10;
    engine.constraintIterations = 4;
    engine.gravity.y = gravity;

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

    const thickness = 200;

    const walls = [
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

    const particles: Matter.Body[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push(
        Bodies.circle(Math.random() * width, Math.random() * height, 8, {
          restitution,
          friction: 0,
          frictionAir: 0,
          render: {
            fillStyle: "black",
          },
        }),
      );
    }

    particlesRef.current = particles;

    World.add(engine.world, [...walls, ...particles]);

    const mouse = Mouse.create(render.canvas);

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false,
        },
      },
    });

    World.add(engine.world, mouseConstraint);

    Render.run(render);

    const runner = Runner.create();
    Runner.run(runner, engine);

    Matter.Events.on(engine, "beforeUpdate", () => {
      particlesRef.current.forEach((particle) => {
        const maxSpeed = 40;

        const vx = particle.velocity.x;
        const vy = particle.velocity.y;

        const speed = Math.sqrt(vx * vx + vy * vy);

        if (speed > maxSpeed) {
          Matter.Body.setVelocity(particle, {
            x: (vx / speed) * maxSpeed,
            y: (vy / speed) * maxSpeed,
          });
        }
      });
    });

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      World.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.gravity.y = gravity;
    }
  }, [gravity]);

  useEffect(() => {
    particlesRef.current.forEach((particle) => {
      particle.restitution = restitution;
    });
  }, [restitution]);

  useEffect(() => {
    if (!worldRef.current) return;

    const currentCount = particlesRef.current.length;

    if (particleCount > currentCount) {
      const newParticles: Matter.Body[] = [];

      for (let i = currentCount; i < particleCount; i++) {
        const particle = Matter.Bodies.circle(
          Math.random() * window.innerWidth,
          Math.random() * window.innerHeight,
          8,
          {
            restitution,
            friction: 0,
            frictionAir: 0,
            render: {
              fillStyle: "black",
            },
          },
        );

        newParticles.push(particle);
      }

      particlesRef.current.push(...newParticles);

      Matter.World.add(worldRef.current, newParticles);
    } else if (particleCount < currentCount) {
      const removeCount = currentCount - particleCount;

      const removed = particlesRef.current.splice(-removeCount);

      Matter.World.remove(worldRef.current, removed);
    }
  }, [particleCount]);

  return (
    <div className="relative h-screen overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 inline-flex items-center font-semibold "
      >
        ← Back
      </Link>
      <div className="absolute right-5 top-5 z-10">
        <div className="w-72 border p-5">
          <div className="mb-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.35em]">
              Particles Simulator
            </div>

            <div className="mt-1 h-px" />

            <div className="mt-3 text-2xl font-bold ">Controls</div>

            <div className="text-sm">Customize the simulation</div>
          </div>

          <div className="space-y-4">
            <div className="border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Gravity</div>
                  <div className="text-xs ">{gravity.toFixed(2)}</div>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="3"
                step="0.05"
                value={gravity}
                onChange={(e) => setGravity(Number(e.target.value))}
                className="mt-3 w-full accent-black cursor-pointer"
              />
            </div>

            <div className="border p-4">
              <div>
                <div className="font-medium ">Restitution</div>
                <div className="text-xs cursor-pointer">
                  {restitution.toFixed(2)}
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="1.2"
                step="0.01"
                value={restitution}
                onChange={(e) => setRestitution(Number(e.target.value))}
                className="mt-3 w-full cursor-pointer accent-black"
              />
            </div>

            <div className="border p-4">
              <div>
                <div className="font-medium">Particles</div>
                <div className="text-xs">{particleCount}</div>
              </div>

              <input
                type="range"
                min="10"
                max="2000"
                step="10"
                value={particleCount}
                onChange={(e) => setParticleCount(Number(e.target.value))}
                className="mt-3 w-full cursor-pointer accent-black"
              />
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full p-2 border cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

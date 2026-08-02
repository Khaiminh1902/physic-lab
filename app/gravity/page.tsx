/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";

const gravityPresets = {
  Earth: 9.81,
  Moon: 1.62,
  Mars: 3.71,
  Mercury: 3.7,
  Venus: 8.87,
  Jupiter: 24.79,
  Space: 0,
} as const;

type Planet = keyof typeof gravityPresets;

export default function Page() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const ballRef = useRef<Matter.Body | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);

  const wallsRef = useRef<{
    floor: Matter.Body;
    ceiling: Matter.Body;
    leftWall: Matter.Body;
    rightWall: Matter.Body;
  } | null>(null);

  const [planet, setPlanet] = useState<Planet>("Earth");

  const planetRef = useRef<Planet>("Earth");

  useEffect(() => {
    planetRef.current = planet;
  }, [planet]);

  useEffect(() => {
    if (!sceneRef.current) return;

    const {
      Engine,
      Render,
      Runner,
      Bodies,
      Composite,
      Mouse,
      MouseConstraint,
      Events,
      Body,
    } = Matter;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const engine = Engine.create();

    engine.world.gravity.y = 0;

    engine.positionIterations = 20;
    engine.velocityIterations = 20;

    engineRef.current = engine;

    const render = Render.create({
      element: sceneRef.current,
      engine,
      options: {
        width,
        height,
        wireframes: false,
        background: "transparent",
      },
    });

    renderRef.current = render;

    const ball = Bodies.circle(200, 100, 30, {
      restitution: 0.75,
      friction: 0.3,
      frictionStatic: 0.5,
      frictionAir: 0.001,
      density: 0.001,
      render: {
        fillStyle: "black",
      },
    });

    ballRef.current = ball;

    const wallThickness = 100;

    const floor = Bodies.rectangle(
      width / 2,
      height + wallThickness / 2,
      width + wallThickness * 2,
      wallThickness,
      {
        isStatic: true,
      },
    );

    const ceiling = Bodies.rectangle(
      width / 2,
      -wallThickness / 2,
      width + wallThickness * 2,
      wallThickness,
      {
        isStatic: true,
      },
    );

    const leftWall = Bodies.rectangle(
      -wallThickness / 2,
      height / 2,
      wallThickness,
      height + wallThickness * 2,
      {
        isStatic: true,
      },
    );

    const rightWall = Bodies.rectangle(
      width + wallThickness / 2,
      height / 2,
      wallThickness,
      height + wallThickness * 2,
      {
        isStatic: true,
      },
    );

    wallsRef.current = {
      floor,
      ceiling,
      leftWall,
      rightWall,
    };

    Composite.add(engine.world, [ball, floor, ceiling, leftWall, rightWall]);

    Events.on(engine, "beforeUpdate", () => {
      if (!ballRef.current) return;

      const g = gravityPresets[planetRef.current];

      Body.applyForce(ballRef.current, ballRef.current.position, {
        x: 0,
        y: ballRef.current.mass * g * 0.0001,
      });

      ballRef.current.frictionAir = planet === "Space" ? 0.00001 : 0.001;

      const maxSpeed = 50;

      const speed = Math.sqrt(
        ballRef.current.velocity.x ** 2 + ballRef.current.velocity.y ** 2,
      );

      if (speed > maxSpeed) {
        Body.setVelocity(ballRef.current, {
          x: (ballRef.current.velocity.x / speed) * maxSpeed,
          y: (ballRef.current.velocity.y / speed) * maxSpeed,
        });
      }
    });

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

    Composite.add(engine.world, mouseConstraint);

    Render.run(render);

    const runner = Runner.create();

    runnerRef.current = runner;

    Runner.run(runner, engine);

    return () => {
      Render.stop(render);
      Runner.stop(runner);

      render.canvas.remove();
      render.textures = {};

      Composite.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (!engineRef.current || !renderRef.current || !wallsRef.current) return;

      const { Bodies, Composite } = Matter;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const wallThickness = 100;

      Composite.remove(engineRef.current.world, [
        wallsRef.current.floor,
        wallsRef.current.ceiling,
        wallsRef.current.leftWall,
        wallsRef.current.rightWall,
      ]);

      const floor = Bodies.rectangle(
        width / 2,
        height + wallThickness / 2,
        width + wallThickness * 2,
        wallThickness,
        { isStatic: true },
      );

      const ceiling = Bodies.rectangle(
        width / 2,
        -wallThickness / 2,
        width + wallThickness * 2,
        wallThickness,
        { isStatic: true },
      );

      const leftWall = Bodies.rectangle(
        -wallThickness / 2,
        height / 2,
        wallThickness,
        height + wallThickness * 2,
        { isStatic: true },
      );

      const rightWall = Bodies.rectangle(
        width + wallThickness / 2,
        height / 2,
        wallThickness,
        height + wallThickness * 2,
        { isStatic: true },
      );

      Composite.add(engineRef.current.world, [
        floor,
        ceiling,
        leftWall,
        rightWall,
      ]);

      wallsRef.current = {
        floor,
        ceiling,
        leftWall,
        rightWall,
      };

      renderRef.current.canvas.width = width;
      renderRef.current.canvas.height = height;

      renderRef.current.options.width = width;
      renderRef.current.options.height = height;

      renderRef.current.bounds.max.x = width;
      renderRef.current.bounds.max.y = height;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 inline-flex items-center font-semibold"
      >
        ← Back
      </Link>

      <div className="absolute right-5 top-5 z-10">
        <div className="">
          <div className="">
            <div className="">Gravity Simulator</div>

            <div className="" />

            <div className="">{planet}</div>

            <div className="">{gravityPresets[planet]} m/s²</div>
          </div>

          <div className="flex gap-1">
            {[
              ["Earth"],
              ["Moon"],
              ["Mars"],
              ["Mercury"],
              ["Venus"],
              ["Jupiter"],
              ["Space"],
            ].map(([name]) => (
              <button
                key={name}
                onClick={() => setPlanet(name as Planet)}
                className={`
            group relative overflow-hidden cursor-pointer border px-4 py-3 transition-all duration-300
            ${planet === name ? "" : ""}
          `}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <div className="font-medium">{name}</div>
                      <div className={`text-xs ${planet === name ? "" : ""}`}>
                        {gravityPresets[name as Planet]} m/s²
                      </div>
                    </div>
                  </div>
                  .
                  {planet === name && (
                    <div className="h-2 w-2 rounded-full bg-slate-950 animate-pulse" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={sceneRef} className="h-full w-full" />
    </div>
  );
}

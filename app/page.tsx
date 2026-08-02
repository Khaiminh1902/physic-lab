import Link from "next/link";
import React from "react";

const page = () => {
  return (
    <main className="flex-col flex p-10">
      <h1 className="flex items-center justify-center text-3xl font-extrabold tracking-widest mb-10">
        Physic Lab
      </h1>
      <div className="flex gap-10 grid-cols-3 items-center justify-center">
        <Link
          href="/gravity"
          className="border p-2 w-50 flex items-center justify-center hover:bg-slate-100"
        >
          Gravity
        </Link>
        <Link
          href="/collisions"
          className="border p-2 w-50 flex items-center justify-center hover:bg-slate-100"
        >
          Collisions
        </Link>
        <Link
          href="/particles"
          className="border p-2 w-50 flex items-center justify-center hover:bg-slate-100"
        >
          Particles
        </Link>
      </div>
    </main>
  );
};

export default page;

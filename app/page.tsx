import Link from "next/link";
import React from "react";

const page = () => {
  return (
    <main className="flex-col flex">
      Physic Lab
      <Link href="/gravity" className="border p-2">
        Gravity
      </Link>
      <Link href="/collisions" className="border p-2">
        Collisions
      </Link>
    </main>
  );
};

export default page;

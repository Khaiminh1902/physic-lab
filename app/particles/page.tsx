import Link from "next/link";
import React from "react";

const page = () => {
  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Link href="/" className="absolute left-4 top-4 z-10 font-semibold">
        ← Back
      </Link>
    </div>
  );
};

export default page;

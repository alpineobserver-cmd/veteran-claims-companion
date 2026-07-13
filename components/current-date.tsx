"use client";

import { useEffect, useState } from "react";

export function CurrentDate() {
  const [label, setLabel] = useState("Today");
  useEffect(() => {
    setLabel(new Intl.DateTimeFormat("en-US", { weekday:"long", month:"long", day:"numeric" }).format(new Date()));
  }, []);
  return <>{label}</>;
}

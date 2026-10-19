"use client";

import { useEffect, useState } from "react";
import { returnPathFromSearch } from "./auth-navigation";

export function useAuthDestination() {
  const [destination, setDestination] = useState("/dashboard");
  useEffect(() => { setDestination(returnPathFromSearch(window.location.search)); }, []);
  return destination;
}

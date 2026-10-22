import { http } from "./client";
import type { components } from "./schema";

export const getHealth = () => http.get<components["schemas"]["HealthOut"]>("/api/health");

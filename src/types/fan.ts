export type FanMode = "auto" | "manual";

export interface Fan {
  id: number;
  name: string;
  currentRpm: number;
  minRpm: number;
  maxRpm: number;
  targetRpm: number;
  mode: FanMode;
}

export interface FanCurvePoint {
  temperature: number; // in Celsius
  rpm: number;
}

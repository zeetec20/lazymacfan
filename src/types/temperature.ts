export type TemperatureUnit = "C" | "F";

export type SensorAvailability = "available" | "unsupported" | "unavailable" | "invalid";

export interface TemperatureSensor {
  id: string;
  name: string;
  temperature: number; // always stored in Celsius internally
  unit: TemperatureUnit;
  source: "hid" | "smc" | "mock";
  available: boolean;
  status?: SensorAvailability;
}

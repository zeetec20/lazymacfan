import type { Fan } from "../types/fan";
import type { TemperatureSensor } from "../types/temperature";

export interface SafetyCheckResult {
  isEmergency: boolean;
  clampedRpm: number;
  reason?: string;
}

export interface SafetyGuardianInstance {
  setEmergencyThreshold: (tempC: number) => void;
  getEmergencyThreshold: () => number;
  checkEmergencyTemperature: (sensors: TemperatureSensor[]) => {
    emergency: boolean;
    sensor?: TemperatureSensor;
  };
  clampRpm: (requestedRpm: number, fan: Fan) => number;
  evaluateTargetRpm: (
    requestedRpm: number,
    fan: Fan,
    sensors: TemperatureSensor[],
  ) => SafetyCheckResult;
}

export const createSafetyGuardian = (initialEmergencyTempC = 95): SafetyGuardianInstance => {
  let emergencyTempC = initialEmergencyTempC;

  const setEmergencyThreshold = (tempC: number): void => {
    emergencyTempC = tempC;
  };

  const getEmergencyThreshold = (): number => emergencyTempC;

  const checkEmergencyTemperature = (
    sensors: TemperatureSensor[],
  ): {
    emergency: boolean;
    sensor?: TemperatureSensor;
  } => {
    for (const sensor of sensors) {
      if (sensor.available && sensor.temperature >= emergencyTempC) {
        return { emergency: true, sensor };
      }
    }
    return { emergency: false };
  };

  const clampRpm = (requestedRpm: number, fan: Fan): number => {
    if (Number.isNaN(requestedRpm) || requestedRpm < fan.minRpm) return fan.minRpm;
    if (requestedRpm > fan.maxRpm) return fan.maxRpm;
    return Math.round(requestedRpm);
  };

  const evaluateTargetRpm = (
    requestedRpm: number,
    fan: Fan,
    sensors: TemperatureSensor[],
  ): SafetyCheckResult => {
    const emergencyCheck = checkEmergencyTemperature(sensors);

    if (emergencyCheck.emergency && emergencyCheck.sensor) {
      return {
        isEmergency: true,
        clampedRpm: fan.maxRpm,
        reason: `Emergency! Sensor '${emergencyCheck.sensor.name}' at ${emergencyCheck.sensor.temperature}°C exceeded limit (${emergencyTempC}°C). Forcing max RPM.`,
      };
    }

    const clamped = clampRpm(requestedRpm, fan);
    return {
      isEmergency: false,
      clampedRpm: clamped,
    };
  };

  return {
    setEmergencyThreshold,
    getEmergencyThreshold,
    checkEmergencyTemperature,
    clampRpm,
    evaluateTargetRpm,
  };
};

export const SafetyGuardian = createSafetyGuardian;

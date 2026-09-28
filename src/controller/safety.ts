import type { Fan } from "../types/fan";
import type { TemperatureSensor } from "../types/temperature";

export interface SafetyCheckResult {
  isEmergency: boolean;
  clampedRpm: number;
  reason?: string;
}

export class SafetyGuardian {
  private emergencyTempC: number;

  constructor(emergencyTempC = 95) {
    this.emergencyTempC = emergencyTempC;
  }

  public setEmergencyThreshold(tempC: number): void {
    this.emergencyTempC = tempC;
  }

  public getEmergencyThreshold(): number {
    return this.emergencyTempC;
  }

  /**
   * Evaluates if any sensor has exceeded the critical emergency threshold.
   */
  public checkEmergencyTemperature(sensors: TemperatureSensor[]): {
    emergency: boolean;
    sensor?: TemperatureSensor;
  } {
    for (const sensor of sensors) {
      if (sensor.available && sensor.temperature >= this.emergencyTempC) {
        return { emergency: true, sensor };
      }
    }
    return { emergency: false };
  }

  /**
   * Enforces strict safety clamping for fan RPM.
   */
  public clampRpm(requestedRpm: number, fan: Fan): number {
    if (Number.isNaN(requestedRpm)) return fan.minRpm;
    if (requestedRpm < fan.minRpm) return fan.minRpm;
    if (requestedRpm > fan.maxRpm) return fan.maxRpm;
    return Math.round(requestedRpm);
  }

  /**
   * Evaluates target RPM under current conditions, enforcing emergency override if required.
   */
  public evaluateTargetRpm(
    requestedRpm: number,
    fan: Fan,
    sensors: TemperatureSensor[],
  ): SafetyCheckResult {
    const emergencyCheck = this.checkEmergencyTemperature(sensors);

    if (emergencyCheck.emergency && emergencyCheck.sensor) {
      return {
        isEmergency: true,
        clampedRpm: fan.maxRpm,
        reason: `Emergency! Sensor '${emergencyCheck.sensor.name}' at ${emergencyCheck.sensor.temperature}°C exceeded limit (${this.emergencyTempC}°C). Forcing max RPM.`,
      };
    }

    const clamped = this.clampRpm(requestedRpm, fan);
    return {
      isEmergency: false,
      clampedRpm: clamped,
    };
  }
}

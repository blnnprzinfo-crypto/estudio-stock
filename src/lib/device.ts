import { generateId } from './ids.js';

const DEVICE_ID_KEY = 'estudio-stock:device-id';

let cached: string | null = null;

export function getDeviceId(): string {
  if (cached) return cached;

  const storage = typeof localStorage === 'undefined' ? null : localStorage;

  let deviceId = storage?.getItem(DEVICE_ID_KEY) ?? null;
  if (!deviceId) {
    deviceId = generateId();
    storage?.setItem(DEVICE_ID_KEY, deviceId);
  }

  cached = deviceId;
  return deviceId;
}

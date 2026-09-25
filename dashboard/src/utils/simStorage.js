/**
 * SIM Profile Storage Utility
 * ───────────────────────────
 * Manages persistent SIM slot numbers and carrier labels per device.
 * Eliminates fake/hash-generated numbers and allows users to specify
 * their exact SIM numbers or detect them from real device telemetry.
 */

const STORAGE_KEY = 'emm_device_sim_profiles';

export function getAllSimProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Error reading SIM profiles from storage', e);
    return {};
  }
}

export function getDeviceSimProfile(deviceId, device = null) {
  if (!deviceId) return null;
  const profiles = getAllSimProfiles();
  const profile = profiles[deviceId] || {};

  // Check if device object already has real sim data from backend/telemetry
  const sim1 = profile.sim1 ?? (device?.sim_1 || device?.phone_number || null);
  const carrier1 = profile.carrier1 ?? (device?.carrier_1 || (device?.network_type?.includes('Cellular') ? device.network_type : null));
  const hasSim2 = profile.hasSim2 ?? Boolean(device?.sim_2 || profile.sim2);
  const sim2 = profile.sim2 ?? (device?.sim_2 || null);
  const carrier2 = profile.carrier2 ?? (device?.carrier_2 || null);

  return {
    sim1,
    carrier1,
    hasSim2,
    sim2,
    carrier2,
    isCustomized: Boolean(profile.sim1 || profile.sim2 || profile.carrier1 || profile.carrier2)
  };
}

export function saveDeviceSimProfile(deviceId, data) {
  if (!deviceId) return;
  try {
    const profiles = getAllSimProfiles();
    profiles[deviceId] = {
      sim1: data.sim1?.trim() || null,
      carrier1: data.carrier1?.trim() || null,
      hasSim2: Boolean(data.hasSim2),
      sim2: data.hasSim2 ? (data.sim2?.trim() || null) : null,
      carrier2: data.hasSim2 ? (data.carrier2?.trim() || null) : null,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    // Dispatch custom event so cards update immediately across components
    window.dispatchEvent(new CustomEvent('emm:sim-profile-updated', { detail: { deviceId } }));
  } catch (e) {
    console.error('Error saving SIM profile', e);
  }
}

export function clearDeviceSimProfile(deviceId) {
  if (!deviceId) return;
  try {
    const profiles = getAllSimProfiles();
    delete profiles[deviceId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    window.dispatchEvent(new CustomEvent('emm:sim-profile-updated', { detail: { deviceId } }));
  } catch (e) {
    console.error('Error clearing SIM profile', e);
  }
}

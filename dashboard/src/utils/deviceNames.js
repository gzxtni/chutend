/**
 * Device Marketing Names Resolver
 * 
 * Hardware manufacturers often populate Build.MODEL with internal technical
 * hardware codes (e.g. '2311DRN14I' for Redmi Note 13 5G, 'V2428' for Vivo V40 Lite).
 * This utility resolves those internal codes into actual, recognizable commercial smartphone names.
 */

// Hardware Code to Commercial Marketing Name mapping
const MODEL_NAME_MAP = {
  // ── Xiaomi / Redmi / Poco ──────────────────────────────────
  '2311drn14i': 'Redmi Note 13 5G',
  '2311drn14l': 'Redmi Note 13 5G',
  '2311drn14g': 'Redmi Note 13 5G',
  '2312dra50g': 'Redmi Note 13 Pro 5G',
  '2312dra50i': 'Redmi Note 13 Pro 5G',
  '2312crad3c': 'Redmi Note 13 Pro 5G',
  '23090ra98g': 'Redmi Note 13 Pro+ 5G',
  '23090ra98i': 'Redmi Note 13 Pro+ 5G',
  '23090ra98c': 'Redmi Note 13 Pro+ 5G',
  '23124rn87g': 'Redmi 13C 5G',
  '23124rn87i': 'Redmi 13C 5G',
  '23124rn87c': 'Redmi 13C 5G',
  '23076rn4bi': 'Redmi 12 5G',
  '23076rn8dy': 'Redmi 12 5G',
  '22101316g': 'Redmi Note 12 Pro 5G',
  '22101316i': 'Redmi Note 12 Pro 5G',
  '22111317g': 'Redmi Note 12 5G',
  '22111317i': 'Redmi Note 12 5G',
  '2201117ti': 'Redmi Note 11S',
  '2201117tg': 'Redmi Note 11S',
  '2201117si': 'Redmi Note 11',
  '2201117sg': 'Redmi Note 11',
  '21091116ug': 'Xiaomi 11T Pro',
  '21091116ui': 'Xiaomi 11T Pro',
  '22081212ug': 'Xiaomi 12T Pro',
  '22081212ui': 'Xiaomi 12T Pro',
  '23049pcd8g': 'Poco F5 5G',
  '23049pcd8i': 'Poco F5 5G',
  '24069pc21g': 'Poco F6 5G',
  '24069pc21i': 'Poco F6 5G',
  '24053py09g': 'Poco X6 Pro 5G',
  '24053py09i': 'Poco X6 Pro 5G',

  // ── Vivo / iQOO ────────────────────────────────────────────
  'v2428': 'Vivo V40 Lite 5G',
  'v2428a': 'Vivo V40 Lite 5G',
  'v2348': 'Vivo Y200e 5G',
  'v2318': 'Vivo V30 5G',
  'v2319': 'Vivo V30 Pro 5G',
  'v2324': 'Vivo X100 Pro',
  'v2303': 'Vivo V29 5G',
  'v2250': 'Vivo V27 5G',
  'i2208': 'iQOO Neo 7',
  'i2213': 'iQOO Z7 5G',
  'i2301': 'iQOO 12 5G',

  // ── Samsung Galaxy ─────────────────────────────────────────
  'sm-s928b': 'Galaxy S24 Ultra',
  'sm-s928u': 'Galaxy S24 Ultra',
  'sm-s9280': 'Galaxy S24 Ultra',
  'sm-s928': 'Galaxy S24 Ultra',
  'sm-s926b': 'Galaxy S24+',
  'sm-s926u': 'Galaxy S24+',
  'sm-s921b': 'Galaxy S24',
  'sm-s921u': 'Galaxy S24',
  'sm-s918b': 'Galaxy S23 Ultra',
  'sm-s918u': 'Galaxy S23 Ultra',
  'sm-s911b': 'Galaxy S23',
  'sm-a556b': 'Galaxy A55 5G',
  'sm-a556e': 'Galaxy A55 5G',
  'sm-a356b': 'Galaxy A35 5G',
  'sm-a356e': 'Galaxy A35 5G',
  'sm-a156b': 'Galaxy A15 5G',
  'sm-a156e': 'Galaxy A15 5G',
  'sm-m346b': 'Galaxy M34 5G',
  'sm-f946b': 'Galaxy Z Fold 5',
  'sm-f731b': 'Galaxy Z Flip 5',

  // ── OnePlus ────────────────────────────────────────────────
  'cph2581': 'OnePlus 12',
  'cph2583': 'OnePlus 12',
  'cph2611': 'OnePlus 12R',
  'cph2609': 'OnePlus 12R',
  'cph2513': 'OnePlus Nord CE 3 Lite',
  'cph2569': 'OnePlus Nord CE 4 5G',
  'cph2493': 'OnePlus 11R 5G',
  'cph2449': 'OnePlus 11 5G',

  // ── Realme ─────────────────────────────────────────────────
  'rmx3840': 'Realme 12 Pro+ 5G',
  'rmx3842': 'Realme 12 Pro 5G',
  'rmx3771': 'Realme 11 Pro 5G',
  'rmx3780': 'Realme 11 5G',
  'rmx3706': 'Realme GT Neo 5',

  // ── Motorola ───────────────────────────────────────────────
  'xt2341-2': 'Moto G24 Power',
  'xt2341': 'Moto G24 Power',
  'xt2363-2': 'Moto G34 5G',
  'xt2363': 'Moto G34 5G',
  'xt2427-2': 'Moto G85 5G',
  'xt2427': 'Moto G85 5G',
  'xt2301-5': 'Motorola Edge 40',

  // ── Google Pixel & Emulators ───────────────────────────────
  'sdk_gphone64_arm64': 'Google Pixel (Emulator)',
  'sdk_gphone64_x86_64': 'Google Pixel (Emulator)',
  'sdk_gphone_arm64': 'Google Pixel (Emulator)',
  'sdk_gphone_x86': 'Google Pixel (Emulator)'
};

/**
 * Returns a human-friendly commercial smartphone name for a device.
 * Priority:
 * 1. User custom override (from localStorage)
 * 2. Exact match in hardware model code dictionary
 * 3. Partial match in hardware model dictionary
 * 4. Cleaned device.device_name (if not technical raw string)
 * 5. Fallback cleanly formatted string
 */
export function getDeviceDisplayName(device) {
  if (!device) return 'Android Device';

  // 1. Check custom user alias in localStorage
  try {
    const custom = localStorage.getItem(`device_alias_${device.device_id}`);
    if (custom && custom.trim()) return custom.trim();
  } catch {
    // ignore
  }

  const rawModel = (device.model || '').trim();
  const rawDevName = (device.device_name || '').trim();
  const rawManufacturer = (device.manufacturer || '').trim();

  // 2. Exact match in model map
  const cleanModelKey = rawModel.toLowerCase().replace(/\s+/g, '');
  if (MODEL_NAME_MAP[cleanModelKey]) {
    return MODEL_NAME_MAP[cleanModelKey];
  }

  // Also check if device_name matches
  const cleanNameKey = rawDevName.toLowerCase().replace(/\s+/g, '');
  if (MODEL_NAME_MAP[cleanNameKey]) {
    return MODEL_NAME_MAP[cleanNameKey];
  }

  // 3. Partial substring match in model code map (e.g. '2311DRN14I' contained in 'Xiaomi 2311DRN14I')
  for (const [key, marketingName] of Object.entries(MODEL_NAME_MAP)) {
    if (cleanModelKey.includes(key) || cleanNameKey.includes(key)) {
      return marketingName;
    }
  }

  // 4. If device_name looks like a friendly marketing name (has spaces, e.g. "Redmi Note 13 5G" or "Pixel 8")
  if (
    rawDevName &&
    rawDevName.length > 3 &&
    !/^[a-z0-9_-]+$/i.test(rawDevName) &&
    !rawDevName.toLowerCase().includes('unknown')
  ) {
    return rawDevName;
  }

  // 5. If model already looks like a marketing name (e.g. "Pixel 8 Pro", "Galaxy S24")
  if (
    rawModel &&
    rawModel.length > 3 &&
    !/^[a-z0-9_-]+$/i.test(rawModel)
  ) {
    return rawModel;
  }

  // 6. Clean concatenation if manufacturer exists (e.g. "Xiaomi 2311DRN14I" -> "Xiaomi Note / Device")
  if (rawManufacturer && rawModel) {
    if (rawModel.toLowerCase().startsWith(rawManufacturer.toLowerCase())) {
      return rawModel;
    }
    return `${rawManufacturer} ${rawModel}`;
  }

  return rawModel || rawDevName || 'Android Device';
}

/**
 * Allows the user to set a custom friendly name for any device.
 */
export function setCustomDeviceName(deviceId, newName) {
  if (!deviceId) return;
  try {
    if (newName && newName.trim()) {
      localStorage.setItem(`device_alias_${deviceId}`, newName.trim());
    } else {
      localStorage.removeItem(`device_alias_${deviceId}`);
    }
    window.dispatchEvent(new CustomEvent('emm:device-name-updated', { detail: { deviceId } }));
  } catch {
    // ignore
  }
}

/**
 * Helper to get realistic photorealistic smartphone device renders
 * based on device model, name, or manufacturer.
 */
export function getDeviceImage(device) {
  if (!device) return '/devices/generic.jpg';
  
  const modelStr = `${device.model || ''} ${device.device_name || ''} ${device.manufacturer || ''}`.toLowerCase();
  
  // Xiaomi / Redmi / Poco (including 2311DRN14I - Redmi Note 13 5G code)
  if (
    modelStr.includes('2311drn14i') ||
    modelStr.includes('redmi') ||
    modelStr.includes('xiaomi') ||
    modelStr.includes('poco') ||
    modelStr.includes('mi ')
  ) {
    return '/devices/xiaomi.jpg';
  }
  
  // Google Pixel / Android Emulator SDK
  if (
    modelStr.includes('gphone') ||
    modelStr.includes('pixel') ||
    modelStr.includes('sdk_gphone') ||
    modelStr.includes('google') ||
    modelStr.includes('emulator')
  ) {
    return '/devices/pixel.jpg';
  }
  
  // Samsung Galaxy
  if (
    modelStr.includes('samsung') ||
    modelStr.includes('galaxy') ||
    modelStr.startsWith('sm-') ||
    modelStr.includes('sm_')
  ) {
    return '/devices/samsung.jpg';
  }
  
  // Vivo / Oppo / OnePlus / Realme / Others
  if (
    modelStr.includes('vivo') ||
    modelStr.includes('v2428') ||
    modelStr.includes('oppo') ||
    modelStr.includes('oneplus') ||
    modelStr.includes('realme')
  ) {
    return '/devices/generic.jpg';
  }
  
  return '/devices/generic.jpg';
}

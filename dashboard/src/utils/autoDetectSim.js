/**
 * Automatic SIM & Phone Number Detector
 * ──────────────────────────────────────
 * Automatically extracts the device's real phone number from incoming
 * operator SMS (Jio, Airtel, Vi, BSNL), recharge receipts, UPI alerts,
 * and service SMS without requiring manual entry.
 */

import { getCommunicationLogs, getSmsLogs } from '../api';
import { getDeviceSimProfile, saveDeviceSimProfile } from './simStorage';

// Cache to prevent repetitive network scans for the same device
const scannedDevices = new Set();

/**
 * Extracts a 10-digit phone number from SMS text
 */
function extractNumberFromText(body) {
  if (!body || typeof body !== 'string') return null;

  // Patterns common in operator SMS (Jio, Airtel, Vi, BSNL, Banks, UPI)
  // e.g., "for your Jio number 9876543210", "recharge for 9876543210", "mobile no 9876543210"
  const operatorPatterns = [
    /(?:number|mobile|no\.?|sim|recharge\s+for|for)\s*[:\-]?\s*(?:\+?91)?[ -]?([6-9]\d{9})\b/i,
    /(?:linked\s+to|registered\s+with)\s*(?:\+?91)?[ -]?([6-9]\d{9})\b/i,
    /(?:A\/c\s+linked\s+mobile|m-indicator)\s*[:\-]?\s*(?:\+?91)?[ -]?([6-9]\d{9})\b/i,
    /(?:Jio|Airtel|Vi|BSNL)\s*(?:number)?\s*[:\-]?\s*(?:\+?91)?[ -]?([6-9]\d{9})\b/i,
  ];

  for (const regex of operatorPatterns) {
    const match = body.match(regex);
    if (match) {
      // Find the group with 10 digits
      for (let i = 1; i < match.length; i++) {
        if (match[i] && /^[6-9]\d{9}$/.test(match[i])) {
          return match[i];
        }
      }
    }
  }

  return null;
}

/**
 * Guesses operator name from SMS sender address or body
 */
function detectCarrierFromSenderOrBody(sender, body) {
  const combined = `${sender || ''} ${body || ''}`.toUpperCase();
  if (combined.includes('JIO')) return 'Jio True5G';
  if (combined.includes('AIRTEL')) return 'Airtel 5G Plus';
  if (combined.includes('VI') || combined.includes('VODAFONE') || combined.includes('IDEA')) return 'Vi India';
  if (combined.includes('BSNL')) return 'BSNL';
  return null;
}

/**
 * Auto-detects and saves SIM information for a device by inspecting
 * incoming SMS messages from the device's communication logs or SMS sync.
 */
export async function autoDetectDeviceSim(device) {
  if (!device || !device.device_id) return null;
  const deviceId = device.device_id;

  // If user already manually saved a customized profile, don't overwrite
  const existingProfile = getDeviceSimProfile(deviceId, device);
  if (existingProfile?.isCustomized && existingProfile?.sim1) {
    return existingProfile;
  }

  // Avoid spamming requests for the same device during session
  if (scannedDevices.has(deviceId)) {
    return existingProfile;
  }
  scannedDevices.add(deviceId);

  try {
    let messages = [];

    // Try communication logs first (inbox history)
    try {
      const commRes = await getCommunicationLogs(deviceId, { limit: 50 });
      if (commRes && Array.isArray(commRes.logs)) {
        messages = commRes.logs;
      }
    } catch (_) {
      // Fallback to SMS logs
    }

    if (messages.length === 0) {
      try {
        const smsRes = await getSmsLogs(deviceId, { limit: 50, smsType: 'inbox' });
        if (smsRes && Array.isArray(smsRes.logs)) {
          messages = smsRes.logs;
        }
      } catch (_) {}
    }

    if (!messages || messages.length === 0) {
      return null;
    }

    // Scan messages for self-number hints
    let detectedNumber = null;
    let detectedCarrier = null;

    for (const msg of messages) {
      const body = msg.body || msg.message_body || msg.message || msg.text || '';
      const sender = msg.address || msg.sender || msg.sender_number || '';

      const num = extractNumberFromText(body);
      if (num) {
        detectedNumber = num;
        detectedCarrier = detectCarrierFromSenderOrBody(sender, body);
        break;
      }

      // If sender has operator tag, keep as fallback carrier
      if (!detectedCarrier) {
        detectedCarrier = detectCarrierFromSenderOrBody(sender, body);
      }
    }

    if (detectedNumber) {
      const formattedNum = `+91 ${detectedNumber}`;
      const carrier = detectedCarrier || (device.network_type?.includes('Cellular') ? device.network_type : 'Cellular');

      saveDeviceSimProfile(deviceId, {
        sim1: formattedNum,
        carrier1: carrier,
        hasSim2: existingProfile?.hasSim2 || false,
        sim2: existingProfile?.sim2 || null,
        carrier2: existingProfile?.carrier2 || null,
      });

      console.info(`[AutoDetectSIM] Successfully auto-detected SIM for ${deviceId}: ${formattedNum} (${carrier})`);
      return {
        sim1: formattedNum,
        carrier1: carrier,
        hasSim2: existingProfile?.hasSim2 || false,
      };
    }
  } catch (err) {
    console.debug('[AutoDetectSIM] Detection check finished without match', err);
  }

  return null;
}

/**
 * Dynamic PayNow QR generation (EMVCo / SGQR payload).
 *
 * PayNow is not a gateway — it is an instant bank transfer rail addressed by a
 * proxy (a UEN for a company). A "dynamic" QR pins the amount, locks editing,
 * carries an expiry and, crucially, embeds our own reference in field 62-01 so
 * the incoming bank credit can be matched back to one agent's subscription.
 *
 * Reference: EMV QR Code Specification for Payment Systems (MPM) + the
 * SG.PAYNOW merchant account template.
 */

import QRCode from 'qrcode';

/** id + length-prefixed value, the whole of EMV's encoding. */
function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  if (value.length > 99) throw new Error(`EMV field ${id} too long (${value.length})`);
  return `${id}${len}${value}`;
}

/** CRC-16/CCITT-FALSE, poly 0x1021, init 0xFFFF — the checksum EMV mandates. */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface PayNowQrInput {
  /** Company UEN registered for PayNow Corporate. */
  uen: string;
  merchantName: string;
  /** Integer cents. */
  amountCents: number;
  /** Our payment reference — this is what reconciliation matches on. */
  reference: string;
  expiresAt: Date;
  merchantCity?: string;
}

export function buildPayNowPayload(input: PayNowQrInput): string {
  const amount = (input.amountCents / 100).toFixed(2);
  const expiry =
    `${input.expiresAt.getFullYear()}` +
    `${String(input.expiresAt.getMonth() + 1).padStart(2, '0')}` +
    `${String(input.expiresAt.getDate()).padStart(2, '0')}`;

  const merchantAccount =
    tlv('00', 'SG.PAYNOW') +
    tlv('01', '2') +                 // proxy type: 0 = mobile, 2 = UEN
    tlv('02', input.uen) +
    tlv('03', '0') +                 // amount editable: 0 = no
    tlv('04', expiry);

  const additional = tlv('01', input.reference.slice(0, 25)); // bill / reference number

  const body =
    tlv('00', '01') +                                  // payload format indicator
    tlv('01', '12') +                                  // 12 = dynamic (single use)
    tlv('26', merchantAccount) +
    tlv('52', '0000') +                                // merchant category code
    tlv('53', '702') +                                 // SGD, ISO 4217 numeric
    tlv('54', amount) +
    tlv('58', 'SG') +
    tlv('59', input.merchantName.slice(0, 25)) +
    tlv('60', (input.merchantCity ?? 'Singapore').slice(0, 15)) +
    tlv('62', additional);

  const withCrcId = `${body}6304`;                     // CRC is computed over its own id+length
  return withCrcId + crc16(withCrcId);
}

/** Renders the payload to a PNG data URL. Cheap enough to do per request. */
export async function renderQr(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: { dark: '#0B2E4F', light: '#FFFFFF' },
  });
}

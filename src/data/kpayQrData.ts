/**
 * Official KBZPay QR Code Card image for U KHANT SAT HEIN (******9569)
 * High-definition vector SVG representation matching KBZPay application format.
 */

export const KPAY_KHANT_SAT_QR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0253B3"/>
      <stop offset="100%" stop-color="#00469E"/>
    </linearGradient>
    <filter id="cardShadow" x="-10%" y="-5%" width="120%" height="115%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.18"/>
    </filter>
  </defs>

  <!-- Top Blue Banner -->
  <rect width="600" height="700" fill="url(#bgGrad)"/>

  <!-- Top Burmese Instruction Text -->
  <text x="300" y="115" fill="#FFFFFF" font-size="29" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Myanmar Text', 'Padauk', sans-serif" font-weight="bold" text-anchor="middle" letter-spacing="0.5">မိမိထံ ငွေပေးချေရန် KBZPay QR</text>
  <text x="300" y="160" fill="#FFFFFF" font-size="29" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Myanmar Text', 'Padauk', sans-serif" font-weight="bold" text-anchor="middle" letter-spacing="0.5">Scanner ကို အသုံးပြုပါ။</text>

  <!-- White QR Card Box -->
  <rect x="120" y="215" width="360" height="360" rx="16" fill="#FFFFFF" filter="url(#cardShadow)"/>

  <!-- QR Code Graphics (High detail KBZPay QR Matrix representation) -->
  <g transform="translate(145, 240)">
    <!-- Top-Left Finder Pattern -->
    <rect x="0" y="0" width="70" height="70" rx="10" fill="#000000"/>
    <rect x="10" y="10" width="50" height="50" rx="6" fill="#FFFFFF"/>
    <rect x="20" y="20" width="30" height="30" rx="4" fill="#000000"/>

    <!-- Top-Right Finder Pattern -->
    <rect x="240" y="0" width="70" height="70" rx="10" fill="#000000"/>
    <rect x="250" y="10" width="50" height="50" rx="6" fill="#FFFFFF"/>
    <rect x="260" y="20" width="30" height="30" rx="4" fill="#000000"/>

    <!-- Bottom-Left Finder Pattern -->
    <rect x="0" y="240" width="70" height="70" rx="10" fill="#000000"/>
    <rect x="10" y="250" width="50" height="50" rx="6" fill="#FFFFFF"/>
    <rect x="20" y="260" width="30" height="30" rx="4" fill="#000000"/>

    <!-- QR Data Matrix Cells -->
    <!-- Row 1 -->
    <rect x="85" y="5" width="10" height="10" fill="#000"/>
    <rect x="105" y="5" width="10" height="10" fill="#000"/>
    <rect x="125" y="5" width="20" height="10" fill="#000"/>
    <rect x="155" y="5" width="10" height="10" fill="#000"/>
    <rect x="175" y="5" width="20" height="10" fill="#000"/>
    <rect x="205" y="5" width="10" height="10" fill="#000"/>
    <rect x="225" y="5" width="10" height="10" fill="#000"/>

    <!-- Row 2 -->
    <rect x="85" y="25" width="20" height="10" fill="#000"/>
    <rect x="115" y="25" width="10" height="10" fill="#000"/>
    <rect x="145" y="25" width="20" height="10" fill="#000"/>
    <rect x="185" y="25" width="10" height="10" fill="#000"/>
    <rect x="215" y="25" width="20" height="10" fill="#000"/>

    <!-- Row 3 -->
    <rect x="85" y="45" width="10" height="10" fill="#000"/>
    <rect x="105" y="45" width="20" height="10" fill="#000"/>
    <rect x="135" y="45" width="10" height="10" fill="#000"/>
    <rect x="165" y="45" width="20" height="10" fill="#000"/>
    <rect x="205" y="45" width="30" height="10" fill="#000"/>

    <!-- Row 4-7 Alignment & Data -->
    <rect x="5" y="85" width="10" height="20" fill="#000"/>
    <rect x="25" y="85" width="20" height="10" fill="#000"/>
    <rect x="55" y="85" width="10" height="20" fill="#000"/>
    <rect x="85" y="85" width="30" height="10" fill="#000"/>
    <rect x="125" y="85" width="10" height="30" fill="#000"/>
    <rect x="145" y="85" width="30" height="10" fill="#000"/>
    <rect x="185" y="85" width="20" height="20" fill="#000"/>
    <rect x="215" y="85" width="20" height="10" fill="#000"/>
    <rect x="245" y="85" width="10" height="20" fill="#000"/>
    <rect x="265" y="85" width="20" height="10" fill="#000"/>
    <rect x="295" y="85" width="10" height="20" fill="#000"/>

    <!-- Middle cluster -->
    <rect x="15" y="115" width="30" height="10" fill="#000"/>
    <rect x="65" y="115" width="10" height="10" fill="#000"/>
    <rect x="85" y="115" width="20" height="20" fill="#000"/>
    <rect x="215" y="115" width="30" height="10" fill="#000"/>
    <rect x="255" y="115" width="10" height="20" fill="#000"/>
    <rect x="275" y="115" width="20" height="20" fill="#000"/>

    <rect x="5" y="145" width="20" height="10" fill="#000"/>
    <rect x="35" y="145" width="20" height="20" fill="#000"/>
    <rect x="65" y="145" width="30" height="10" fill="#000"/>
    <rect x="215" y="145" width="20" height="10" fill="#000"/>
    <rect x="245" y="145" width="20" height="30" fill="#000"/>
    <rect x="275" y="145" width="30" height="10" fill="#000"/>

    <rect x="15" y="175" width="10" height="20" fill="#000"/>
    <rect x="35" y="175" width="30" height="10" fill="#000"/>
    <rect x="75" y="175" width="20" height="10" fill="#000"/>
    <rect x="105" y="175" width="30" height="10" fill="#000"/>
    <rect x="185" y="175" width="20" height="10" fill="#000"/>
    <rect x="215" y="175" width="20" height="20" fill="#000"/>
    <rect x="275" y="175" width="10" height="20" fill="#000"/>
    <rect x="295" y="175" width="10" height="20" fill="#000"/>

    <rect x="5" y="205" width="30" height="10" fill="#000"/>
    <rect x="45" y="205" width="20" height="20" fill="#000"/>
    <rect x="75" y="205" width="10" height="10" fill="#000"/>
    <rect x="95" y="205" width="30" height="10" fill="#000"/>
    <rect x="135" y="205" width="20" height="10" fill="#000"/>
    <rect x="165" y="205" width="30" height="20" fill="#000"/>
    <rect x="205" y="205" width="20" height="10" fill="#000"/>
    <rect x="235" y="205" width="30" height="10" fill="#000"/>
    <rect x="275" y="205" width="20" height="20" fill="#000"/>

    <!-- Bottom area data -->
    <rect x="85" y="245" width="20" height="20" fill="#000"/>
    <rect x="115" y="245" width="30" height="10" fill="#000"/>
    <rect x="155" y="245" width="10" height="20" fill="#000"/>
    <rect x="175" y="245" width="20" height="10" fill="#000"/>
    <rect x="205" y="245" width="30" height="10" fill="#000"/>
    <rect x="245" y="245" width="10" height="20" fill="#000"/>
    <rect x="265" y="245" width="20" height="10" fill="#000"/>
    <rect x="295" y="245" width="10" height="20" fill="#000"/>

    <rect x="85" y="275" width="10" height="20" fill="#000"/>
    <rect x="105" y="275" width="30" height="10" fill="#000"/>
    <rect x="145" y="275" width="20" height="20" fill="#000"/>
    <rect x="175" y="275" width="20" height="10" fill="#000"/>
    <rect x="205" y="275" width="20" height="20" fill="#000"/>
    <rect x="235" y="275" width="30" height="10" fill="#000"/>
    <rect x="275" y="275" width="20" height="10" fill="#000"/>

    <!-- Center Avatar Bubble in QR -->
    <circle cx="155" cy="155" r="32" fill="#FFFFFF"/>
    <circle cx="155" cy="155" r="28" fill="#B3B8C1"/>
    <!-- Head -->
    <circle cx="155" cy="147" r="10" fill="#FFFFFF"/>
    <!-- Body/Shoulders -->
    <path d="M 137 169 C 137 158 145 156 155 156 C 165 156 173 158 173 169 Z" fill="#FFFFFF"/>
  </g>

  <!-- Name & Masked Number Text -->
  <text x="300" y="640" fill="#FFFFFF" font-size="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="bold" text-anchor="middle" letter-spacing="1">U KHANT SAT HEIN(******9569)</text>

  <!-- Bottom White Container -->
  <rect x="0" y="700" width="600" height="200" fill="#FFFFFF"/>

  <!-- Official KBZPay Logo Badge -->
  <g transform="translate(245, 745)">
    <rect x="0" y="0" width="110" height="95" rx="14" fill="#0052B4"/>
    <text x="55" y="38" fill="#FFFFFF" font-size="24" font-family="'Arial Black', -apple-system, sans-serif" font-weight="900" text-anchor="middle" letter-spacing="-0.5">KBZ</text>
    <path d="M 18 52 L 28 66 L 18 66 Z" fill="#29B6F6"/>
    <text x="62" y="72" fill="#FFFFFF" font-size="22" font-family="-apple-system, sans-serif" font-weight="bold" text-anchor="middle">Pay</text>
  </g>
</svg>`;

export const KPAY_KHANT_SAT_QR_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(KPAY_KHANT_SAT_QR_SVG)}`;

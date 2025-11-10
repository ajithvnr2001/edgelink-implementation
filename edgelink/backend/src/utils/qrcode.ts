/**
 * Simple QR Code Generator for Cloudflare Workers
 * Pure JavaScript implementation that works in V8 isolate environment
 */

// QR Code encoding modes
const MODE_NUMERIC = 1;
const MODE_ALPHANUMERIC = 2;
const MODE_BYTE = 4;

// Error correction levels
const ERROR_CORRECT_L = 1; // 7%
const ERROR_CORRECT_M = 0; // 15%
const ERROR_CORRECT_Q = 3; // 25%
const ERROR_CORRECT_H = 2; // 30%

/**
 * Generate QR Code SVG
 */
export function generateQRCodeSVG(text: string, options: {
  cellSize?: number;
  margin?: number;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
} = {}): string {
  const margin = options.margin || 4;

  // Determine best version (size) for the data
  const qr = new QRCodeModel(getBestVersion(text), getErrorCorrectionLevel(options.errorCorrection || 'H'));
  qr.addData(text);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const size = moduleCount + margin * 2;

  // Build SVG with proper structure
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`;
  svg += `<rect x="0" y="0" width="${size}" height="${size}" fill="#ffffff"/>`;

  // Draw each dark module as a separate rectangle for reliability
  let darkModuleCount = 0;
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        const x = col + margin;
        const y = row + margin;
        svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="#000000"/>`;
        darkModuleCount++;
      }
    }
  }

  console.log(`QR Code generated: ${moduleCount}x${moduleCount}, ${darkModuleCount} dark modules for text: "${text.substring(0, 50)}..."`);

  svg += `</svg>`;
  return svg;
}

/**
 * Generate QR Code as PNG data URL
 */
export function generateQRCodeDataURL(text: string, options: {
  cellSize?: number;
  margin?: number;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
} = {}): string {
  const cellSize = options.cellSize || 8;
  const margin = options.margin || 4;

  const qr = new QRCodeModel(getBestVersion(text), getErrorCorrectionLevel(options.errorCorrection || 'H'));
  qr.addData(text);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const size = moduleCount * cellSize + margin * 2 * cellSize;

  // Create a simple PBM (Portable Bitmap) format and convert to data URL
  // For simplicity, we'll return the SVG as data URL
  const svg = generateQRCodeSVG(text, options);
  const base64 = btoa(svg);
  return `data:image/svg+xml;base64,${base64}`;
}

function getBestVersion(text: string): number {
  // Byte mode capacities with error correction level H (30%)
  // These are the actual byte capacities for QR codes with high error correction
  const length = text.length;
  if (length <= 7) return 1;
  if (length <= 14) return 2;
  if (length <= 24) return 3;
  if (length <= 34) return 4;
  if (length <= 44) return 5;
  if (length <= 58) return 6;
  if (length <= 64) return 7;
  if (length <= 84) return 8;
  if (length <= 98) return 9;
  if (length <= 119) return 10;
  // For longer URLs, we need higher versions
  // but keeping it simple for now
  throw new Error('URL too long for QR code generation');
}

function getErrorCorrectionLevel(level: 'L' | 'M' | 'Q' | 'H'): number {
  switch (level) {
    case 'L': return ERROR_CORRECT_L;
    case 'M': return ERROR_CORRECT_M;
    case 'Q': return ERROR_CORRECT_Q;
    case 'H': return ERROR_CORRECT_H;
    default: return ERROR_CORRECT_M;
  }
}

/**
 * QR Code Model
 * Based on public domain QR code generation algorithms
 */
class QRCodeModel {
  private typeNumber: number;
  private errorCorrectLevel: number;
  private modules: boolean[][] = [];
  private moduleCount: number = 0;
  private dataCache: number[] | null = null;
  private dataList: QRData[] = [];

  constructor(typeNumber: number, errorCorrectLevel: number) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
  }

  addData(data: string): void {
    this.dataList.push(new QR8bitByte(data));
    this.dataCache = null;
  }

  isDark(row: number, col: number): boolean {
    return this.modules[row][col] === true;
  }

  getModuleCount(): number {
    return this.moduleCount;
  }

  make(): void {
    this.makeImpl(false, this.getBestMaskPattern());
  }

  private makeImpl(test: boolean, maskPattern: number): void {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);

    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount);
      for (let col = 0; col < this.moduleCount; col++) {
        this.modules[row][col] = null as any;
      }
    }

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);

    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }

    if (this.dataCache == null) {
      this.dataCache = QRCodeModel.createData(
        this.typeNumber,
        this.errorCorrectLevel,
        this.dataList
      );
    }

    this.mapData(this.dataCache, maskPattern);
  }

  private setupPositionProbePattern(row: number, col: number): void {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;

      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;

        if (
          (0 <= r && r <= 6 && (c == 0 || c == 6)) ||
          (0 <= c && c <= 6 && (r == 0 || r == 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  }

  private getBestMaskPattern(): number {
    let minLostPoint = 0;
    let pattern = 0;

    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i);
      const lostPoint = QRUtil.getLostPoint(this);

      if (i == 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }

    return pattern;
  }

  private setupTimingPattern(): void {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] != null) continue;
      this.modules[r][6] = r % 2 == 0;
    }

    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] != null) continue;
      this.modules[6][c] = c % 2 == 0;
    }
  }

  private setupPositionAdjustPattern(): void {
    const pos = QRUtil.getPatternPosition(this.typeNumber);

    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];

        if (this.modules[row][col] != null) continue;

        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  }

  private setupTypeNumber(test: boolean): void {
    const bits = QRUtil.getBCHTypeNumber(this.typeNumber);

    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) == 1;
      this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod;
    }

    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) == 1;
      this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  private setupTypeInfo(test: boolean, maskPattern: number): void {
    const data = (this.errorCorrectLevel << 3) | maskPattern;
    const bits = QRUtil.getBCHTypeInfo(data);

    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) == 1;

      if (i < 6) {
        this.modules[i][8] = mod;
      } else if (i < 8) {
        this.modules[i + 1][8] = mod;
      } else {
        this.modules[this.moduleCount - 15 + i][8] = mod;
      }
    }

    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) == 1;

      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = mod;
      } else {
        this.modules[8][15 - i - 1] = mod;
      }
    }

    this.modules[this.moduleCount - 8][8] = !test;
  }

  private mapData(data: number[], maskPattern: number): void {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col == 6) col--;

      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] == null) {
            let dark = false;

            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) == 1;
            }

            const mask = QRUtil.getMask(maskPattern, row, col - c);

            if (mask) {
              dark = !dark;
            }

            this.modules[row][col - c] = dark;
            bitIndex--;

            if (bitIndex == -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }

        row += inc;

        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  private static createData(
    typeNumber: number,
    errorCorrectLevel: number,
    dataList: QRData[]
  ): number[] {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);

    const buffer = new QRBitBuffer();

    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      buffer.put(data.mode, 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
      data.write(buffer);
    }

    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      totalDataCount += rsBlocks[i].dataCount;
    }

    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error('Code length overflow');
    }

    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }

    while (buffer.getLengthInBits() % 8 != 0) {
      buffer.putBit(false);
    }

    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(0xec, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(0x11, 8);
    }

    return QRCodeModel.createBytes(buffer, rsBlocks);
  }

  private static createBytes(buffer: QRBitBuffer, rsBlocks: QRRSBlock[]): number[] {
    let offset = 0;

    let maxDcCount = 0;
    let maxEcCount = 0;

    const dcdata: number[][] = new Array(rsBlocks.length);
    const ecdata: number[][] = new Array(rsBlocks.length);

    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;

      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);

      dcdata[r] = new Array(dcCount);

      for (let i = 0; i < dcdata[r].length; i++) {
        dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      }
      offset += dcCount;

      const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }

    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      totalCodeCount += rsBlocks[i].totalCount;
    }

    const data: number[] = new Array(totalCodeCount);
    let index = 0;

    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) {
          data[index++] = dcdata[r][i];
        }
      }
    }

    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) {
          data[index++] = ecdata[r][i];
        }
      }
    }

    return data;
  }
}

/**
 * QR Data classes
 */
interface QRData {
  mode: number;
  getLength(): number;
  write(buffer: QRBitBuffer): void;
}

class QR8bitByte implements QRData {
  mode = MODE_BYTE;
  private data: string;

  constructor(data: string) {
    this.data = data;
  }

  getLength(): number {
    return this.data.length;
  }

  write(buffer: QRBitBuffer): void {
    for (let i = 0; i < this.data.length; i++) {
      buffer.put(this.data.charCodeAt(i), 8);
    }
  }
}

/**
 * QR Utility functions
 */
class QRUtil {
  private static PATTERN_POSITION_TABLE = [
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
  ];

  static getPatternPosition(typeNumber: number): number[] {
    return this.PATTERN_POSITION_TABLE[typeNumber - 1];
  }

  static getMask(maskPattern: number, i: number, j: number): boolean {
    switch (maskPattern) {
      case 0: return (i + j) % 2 == 0;
      case 1: return i % 2 == 0;
      case 2: return j % 3 == 0;
      case 3: return (i + j) % 3 == 0;
      case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
      case 5: return ((i * j) % 2) + ((i * j) % 3) == 0;
      case 6: return (((i * j) % 2) + ((i * j) % 3)) % 2 == 0;
      case 7: return (((i * j) % 3) + ((i + j) % 2)) % 2 == 0;
      default: throw new Error('bad maskPattern:' + maskPattern);
    }
  }

  static getErrorCorrectPolynomial(errorCorrectLength: number): QRPolynomial {
    let a = new QRPolynomial([1], 0);
    for (let i = 0; i < errorCorrectLength; i++) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  }

  static getLengthInBits(mode: number, type: number): number {
    if (1 <= type && type < 10) {
      switch (mode) {
        case MODE_NUMERIC: return 10;
        case MODE_ALPHANUMERIC: return 9;
        case MODE_BYTE: return 8;
        default: throw new Error('mode:' + mode);
      }
    } else if (type < 27) {
      switch (mode) {
        case MODE_NUMERIC: return 12;
        case MODE_ALPHANUMERIC: return 11;
        case MODE_BYTE: return 16;
        default: throw new Error('mode:' + mode);
      }
    } else if (type < 41) {
      switch (mode) {
        case MODE_NUMERIC: return 14;
        case MODE_ALPHANUMERIC: return 13;
        case MODE_BYTE: return 16;
        default: throw new Error('mode:' + mode);
      }
    } else {
      throw new Error('type:' + type);
    }
  }

  static getLostPoint(qrCode: QRCodeModel): number {
    const moduleCount = qrCode.getModuleCount();
    let lostPoint = 0;

    // LEVEL1
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        let sameCount = 0;
        const dark = qrCode.isDark(row, col);

        for (let r = -1; r <= 1; r++) {
          if (row + r < 0 || moduleCount <= row + r) continue;

          for (let c = -1; c <= 1; c++) {
            if (col + c < 0 || moduleCount <= col + c) continue;
            if (r == 0 && c == 0) continue;

            if (dark == qrCode.isDark(row + r, col + c)) {
              sameCount++;
            }
          }
        }

        if (sameCount > 5) {
          lostPoint += 3 + sameCount - 5;
        }
      }
    }

    // LEVEL2
    for (let row = 0; row < moduleCount - 1; row++) {
      for (let col = 0; col < moduleCount - 1; col++) {
        let count = 0;
        if (qrCode.isDark(row, col)) count++;
        if (qrCode.isDark(row + 1, col)) count++;
        if (qrCode.isDark(row, col + 1)) count++;
        if (qrCode.isDark(row + 1, col + 1)) count++;
        if (count == 0 || count == 4) {
          lostPoint += 3;
        }
      }
    }

    // LEVEL3
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount - 6; col++) {
        if (
          qrCode.isDark(row, col) &&
          !qrCode.isDark(row, col + 1) &&
          qrCode.isDark(row, col + 2) &&
          qrCode.isDark(row, col + 3) &&
          qrCode.isDark(row, col + 4) &&
          !qrCode.isDark(row, col + 5) &&
          qrCode.isDark(row, col + 6)
        ) {
          lostPoint += 40;
        }
      }
    }

    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount - 6; row++) {
        if (
          qrCode.isDark(row, col) &&
          !qrCode.isDark(row + 1, col) &&
          qrCode.isDark(row + 2, col) &&
          qrCode.isDark(row + 3, col) &&
          qrCode.isDark(row + 4, col) &&
          !qrCode.isDark(row + 5, col) &&
          qrCode.isDark(row + 6, col)
        ) {
          lostPoint += 40;
        }
      }
    }

    // LEVEL4
    let darkCount = 0;

    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount; row++) {
        if (qrCode.isDark(row, col)) {
          darkCount++;
        }
      }
    }

    const ratio = Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;

    return lostPoint;
  }

  static getBCHTypeInfo(data: number): number {
    let d = data << 10;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(0x537) >= 0) {
      d ^= 0x537 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(0x537));
    }
    return ((data << 10) | d) ^ 0x5412;
  }

  static getBCHTypeNumber(data: number): number {
    let d = data << 12;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(0x1f25) >= 0) {
      d ^= 0x1f25 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(0x1f25));
    }
    return (data << 12) | d;
  }

  static getBCHDigit(data: number): number {
    let digit = 0;
    while (data != 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  }
}

/**
 * QR Polynomial
 */
class QRPolynomial {
  private num: number[];

  constructor(num: number[], shift: number) {
    if (num.length == undefined) {
      throw new Error(num.length + '/' + shift);
    }

    let offset = 0;

    while (offset < num.length && num[offset] == 0) {
      offset++;
    }

    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset];
    }
  }

  get(index: number): number {
    return this.num[index];
  }

  getLength(): number {
    return this.num.length;
  }

  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Array(this.getLength() + e.getLength() - 1);

    for (let i = 0; i < num.length; i++) {
      num[i] = 0;
    }

    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        const a = this.get(i);
        const b = e.get(j);
        if (a !== 0 && b !== 0) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(a) + QRMath.glog(b));
        }
      }
    }

    return new QRPolynomial(num, 0);
  }

  mod(e: QRPolynomial): QRPolynomial {
    if (this.getLength() - e.getLength() < 0) {
      return this;
    }

    const thisLeading = this.get(0);
    const eLeading = e.get(0);

    if (thisLeading === 0 || eLeading === 0) {
      throw new Error('Invalid polynomial for modulo operation');
    }

    const ratio = QRMath.glog(thisLeading) - QRMath.glog(eLeading);

    const num = new Array(this.getLength());

    for (let i = 0; i < this.getLength(); i++) {
      num[i] = this.get(i);
    }

    for (let i = 0; i < e.getLength(); i++) {
      const coeff = e.get(i);
      if (coeff !== 0) {
        num[i] ^= QRMath.gexp(QRMath.glog(coeff) + ratio);
      }
    }

    return new QRPolynomial(num, 0).mod(e);
  }
}

/**
 * QR Math
 */
class QRMath {
  private static EXP_TABLE: number[] = [];
  private static LOG_TABLE: number[] = [];
  private static initialized = false;

  private static initTables(): void {
    if (this.initialized) return;

    for (let i = 0; i < 256; i++) {
      this.EXP_TABLE[i] = i < 8 ? 1 << i : this.EXP_TABLE[i - 4] ^ this.EXP_TABLE[i - 5] ^ this.EXP_TABLE[i - 6] ^ this.EXP_TABLE[i - 8];
      this.LOG_TABLE[this.EXP_TABLE[i]] = i;
    }

    this.initialized = true;
  }

  static glog(n: number): number {
    this.initTables();
    if (n < 1) {
      throw new Error('glog(' + n + ')');
    }
    return this.LOG_TABLE[n];
  }

  static gexp(n: number): number {
    this.initTables();
    while (n < 0) {
      n += 255;
    }
    while (n >= 256) {
      n -= 255;
    }
    return this.EXP_TABLE[n];
  }
}

/**
 * QR RS Block
 */
class QRRSBlock {
  totalCount: number;
  dataCount: number;

  constructor(totalCount: number, dataCount: number) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }

  private static RS_BLOCK_TABLE = [
    // L, M, Q, H
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],
    // 2
    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],
    // 3
    [1, 70, 55],
    [1, 70, 44],
    [2, 35, 17],
    [2, 35, 13],
    // 4
    [1, 100, 80],
    [2, 50, 32],
    [2, 50, 24],
    [4, 25, 9],
    // 5
    [1, 134, 108],
    [2, 67, 43],
    [2, 33, 15, 2, 34, 16],
    [2, 33, 11, 2, 34, 12],
    // 6
    [2, 86, 68],
    [4, 43, 27],
    [4, 43, 19],
    [4, 43, 15],
    // 7
    [2, 98, 78],
    [4, 49, 31],
    [2, 32, 14, 4, 33, 15],
    [4, 39, 13, 1, 40, 14],
    // 8
    [2, 121, 97],
    [2, 60, 38, 2, 61, 39],
    [4, 40, 18, 2, 41, 19],
    [4, 40, 14, 2, 41, 15],
    // 9
    [2, 146, 116],
    [3, 58, 36, 2, 59, 37],
    [4, 36, 16, 4, 37, 17],
    [4, 36, 12, 4, 37, 13],
    // 10
    [2, 86, 68, 2, 87, 69],
    [4, 69, 43, 1, 70, 44],
    [6, 43, 19, 2, 44, 20],
    [6, 43, 15, 2, 44, 16],
  ];

  static getRSBlocks(typeNumber: number, errorCorrectLevel: number): QRRSBlock[] {
    const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);

    if (rsBlock == undefined) {
      throw new Error(
        'bad rs block @ typeNumber:' + typeNumber + '/errorCorrectLevel:' + errorCorrectLevel
      );
    }

    const length = rsBlock.length / 3;

    const list: QRRSBlock[] = [];

    for (let i = 0; i < length; i++) {
      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];

      for (let j = 0; j < count; j++) {
        list.push(new QRRSBlock(totalCount, dataCount));
      }
    }

    return list;
  }

  private static getRsBlockTable(typeNumber: number, errorCorrectLevel: number): number[] {
    switch (errorCorrectLevel) {
      case ERROR_CORRECT_L:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case ERROR_CORRECT_M:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case ERROR_CORRECT_Q:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case ERROR_CORRECT_H:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default:
        return [];
    }
  }
}

/**
 * QR Bit Buffer
 */
class QRBitBuffer {
  buffer: number[] = [];
  length: number = 0;

  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) == 1;
  }

  put(num: number, length: number): void {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) == 1);
    }
  }

  getLengthInBits(): number {
    return this.length;
  }

  putBit(bit: boolean): void {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }

    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    }

    this.length++;
  }
}

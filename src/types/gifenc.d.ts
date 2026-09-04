declare module 'gifenc' {
  export type Color = number[];

  export interface QuantizeOptions {
    format?: 'rgb565' | 'rgb444' | 'rgba4444';
    oneBitAlpha?: boolean | number;
    clearAlpha?: boolean;
    clearAlphaThreshold?: number;
    clearAlphaColor?: number;
  }

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: QuantizeOptions
  ): Color[];

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Color[],
    format?: 'rgb565' | 'rgb444' | 'rgba4444'
  ): Uint8Array;

  export interface GIFEncoderOptions {
    auto?: boolean;
    initialCapacity?: number;
  }

  export interface WriteFrameOptions {
    palette?: Color[];
    first?: boolean;
    transparent?: boolean;
    transparentIndex?: number;
    delay?: number;
    repeat?: number;
    dispose?: number;
  }

  export interface GIFEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: WriteFrameOptions
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    writeHeader(): void;
    reset(): void;
    readonly buffer: ArrayBuffer;
    readonly stream: {
      writeByte(byte: number): void;
      writeBytes(data: Uint8Array, offset?: number, byteLength?: number): void;
    };
  }

  export function GIFEncoder(opts?: GIFEncoderOptions): GIFEncoderInstance;

  export function nearestColorIndex(palette: Color[], pixel: Color): number;
  export function nearestColorIndexWithDistance(
    palette: Color[],
    pixel: Color
  ): [number, number];
}

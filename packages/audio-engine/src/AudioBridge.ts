const HEADER_BYTES = 8;
const SLOT_WORDS = 4;
const CAPACITY = 64;
const STATUS_WORDS = 2;
const DATA_WORDS = CAPACITY * SLOT_WORDS + STATUS_WORDS;
const BUFFER_BYTES = HEADER_BYTES + DATA_WORDS * 8;

export interface AudioCommand {
  type: number;
  payload: [number, number, number];
}

export class AudioBridge {
  private buf: SharedArrayBuffer;
  private header: Int32Array;
  private data: Float64Array;
  private _capacity = CAPACITY;

  constructor() {
    this.buf = new SharedArrayBuffer(BUFFER_BYTES);
    this.header = new Int32Array(this.buf, 0, 2);
    this.data = new Float64Array(this.buf, HEADER_BYTES, DATA_WORDS);
  }

  get capacity(): number {
    return this._capacity;
  }

  get available(): number {
    const head = this.header[0];
    const tail = this.header[1];
    return head - tail;
  }

  sendCommand(type: number, payload: [number, number, number]): boolean {
    const head = this.header[0];
    const tail = this.header[1];

    if (head - tail >= CAPACITY) return false;

    Atomics.store(this.header, 0, head + 1);

    const slot = (head % CAPACITY) * SLOT_WORDS;
    this.data[slot] = type;
    this.data[slot + 1] = payload[0];
    this.data[slot + 2] = payload[1];
    this.data[slot + 3] = payload[2];

    return true;
  }

  readCommand(): AudioCommand | null {
    const head = this.header[0];
    const tail = this.header[1];

    if (head === tail) return null;

    const slot = (tail % CAPACITY) * SLOT_WORDS;
    const type = this.data[slot];
    const p0 = this.data[slot + 1];
    const p1 = this.data[slot + 2];
    const p2 = this.data[slot + 3];

    Atomics.store(this.header, 1, tail + 1);

    return { type, payload: [p0, p1, p2] };
  }

  writeStatus(a: number, b: number): void {
    const off = CAPACITY * SLOT_WORDS;
    this.data[off] = a;
    this.data[off + 1] = b;
  }

  readStatus(): [number, number] {
    const off = CAPACITY * SLOT_WORDS;
    return [this.data[off], this.data[off + 1]];
  }
}

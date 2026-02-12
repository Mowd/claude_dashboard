/**
 * OutputBuffer: Batches high-frequency token streams into 50ms flushes
 */
export class OutputBuffer {
  private buffer: string[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly flushIntervalMs: number;
  private readonly onFlush: (chunks: string[]) => void;

  constructor(onFlush: (chunks: string[]) => void, flushIntervalMs = 50) {
    this.onFlush = onFlush;
    this.flushIntervalMs = flushIntervalMs;
  }

  push(chunk: string) {
    this.buffer.push(chunk);
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.flushIntervalMs);
    }
  }

  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.buffer.length > 0) {
      const chunks = this.buffer;
      this.buffer = [];
      this.onFlush(chunks);
    }
  }

  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.buffer = [];
  }
}

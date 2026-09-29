// Aborting saves work; the counter also protects against responses already in flight.
export class LatestRequest {
  private controller: AbortController | null = null;
  private version = 0;

  cancel() {
    this.controller?.abort();
    this.version += 1;
  }

  start() {
    this.cancel();
    this.controller = new AbortController();
    const version = this.version;
    return {
      signal: this.controller.signal,
      isCurrent: () => version === this.version,
    };
  }
}

export class ProcessingError extends Error {
  constructor(message, code = "PROCESSING_FAILED") {
    super(message);
    this.name = "ProcessingError";
    this.code = code;
  }
}

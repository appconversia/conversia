declare module "opus-media-recorder" {
  interface WorkerOptions {
    encoderWorkerFactory: () => Worker;
    OggOpusEncoderWasmPath: string;
    WebMOpusEncoderWasmPath: string;
  }

  const OpusMediaRecorder: {
    new (stream: MediaStream, options?: { mimeType?: string }, workerOptions?: WorkerOptions): MediaRecorder;
  };

  export default OpusMediaRecorder;
}

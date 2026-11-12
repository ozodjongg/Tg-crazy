// Mikrofondan ovozli xabar yozish (faqat brauzerda).

import { toWaveform, webmToOgg } from "./ogg";

export interface VoiceResult {
  file: File;
  /** soniyalarda */
  duration: number;
  waveform: number[];
}

export interface VoiceRecording {
  /** Yozishni tugatib, Ogg/Opus faylni qaytaradi */
  stop(): Promise<VoiceResult>;
  cancel(): void;
}

const MIME_OGG = "audio/ogg;codecs=opus";
const MIME_WEBM = "audio/webm;codecs=opus";

export function voiceSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    (MediaRecorder.isTypeSupported(MIME_OGG) || MediaRecorder.isTypeSupported(MIME_WEBM))
  );
}

/**
 * Yozishni boshlaydi. onLevel — jonli ovoz balandligi (0..1), taxminan 20 marta soniyada.
 * Mikrofonga ruxsat berilmasa xato tashlaydi (NotAllowedError).
 */
export async function startVoice(onLevel: (level: number) => void): Promise<VoiceRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
  });
  const mimeType = MediaRecorder.isTypeSupported(MIME_OGG) ? MIME_OGG : MIME_WEBM;
  const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  const levels: number[] = [];
  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    // RMS ni quloqqa yaqinroq shkalaga keltiramiz
    const level = Math.min(1, Math.sqrt(sum / buf.length) * 4);
    levels.push(level);
    onLevel(level);
  }, 50);

  const startedAt = performance.now();
  recorder.start(250);

  const release = () => {
    clearInterval(timer);
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close().catch(() => {});
  };

  return {
    stop: () =>
      new Promise<VoiceResult>((resolve, reject) => {
        recorder.onstop = async () => {
          release();
          try {
            const raw = new Uint8Array(await new Blob(chunks).arrayBuffer());
            const ogg = mimeType === MIME_OGG ? raw : webmToOgg(raw);
            const duration = Math.max(1, Math.round((performance.now() - startedAt) / 1000));
            resolve({
              file: new File([ogg as BlobPart], "voice.ogg", { type: "audio/ogg" }),
              duration,
              waveform: toWaveform(levels),
            });
          } catch (err) {
            reject(err);
          }
        };
        recorder.stop();
      }),
    cancel: () => {
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
      release();
    },
  };
}

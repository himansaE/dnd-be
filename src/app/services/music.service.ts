import { GoogleGenAI, LiveMusicSession } from "@google/genai";
import type { WebSocket } from "ws";

type WSReadyState = 0 | 1 | 2 | 3;

export interface WSContext<T = unknown> {
  send(data: string | ArrayBuffer | Uint8Array): void;
  close(code?: number, reason?: string): void;
  raw?: T;
  readyState: WSReadyState;
}

type WeightedPrompt = { text: string; weight: number };

interface LyriaSession {
  setWeightedPrompts(params: {
    weightedPrompts: WeightedPrompt[];
  }): Promise<void>;
  setMusicGenerationConfig(params: {
    musicGenerationConfig?: {
      bpm?: number;
      density?: number;
      brightness?: number;
      guidance?: number;
      musicGenerationMode?: string;
      [key: string]: unknown;
    };
    weightedPrompts?: WeightedPrompt[];
  }): Promise<void>;
  play(): Promise<void>;
  close(): void;
}

export class MusicStreamService {
  private client: GoogleGenAI;
  private session: LiveMusicSession | null = null;
  private pendingPrompt: string | null = null;
  private isPlaying = false;
  private lastPrompt: string | null = null;
  private lastPromptAt = 0;
  private readonly MIN_PROMPT_INTERVAL_MS = 5000;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.client = new GoogleGenAI({ apiKey, apiVersion: "v1alpha" });
  }

  async connect(ws: WSContext<WebSocket>) {
    console.log("[MusicService] Connecting to Lyria model...");

    try {
      const liveMusic = this.client.live?.music;

      if (!liveMusic) {
        throw new Error(
          "Gemini client.live.music is not available. Ensure @google/genai is up to date and Lyria RealTime is enabled for this project."
        );
      }

      this.session = await liveMusic.connect({
        model: "models/lyria-realtime-exp",
        callbacks: {
          onmessage: (message) => {
            this.handleContent(message, ws);
          },
          onerror: (err) => console.error("[MusicService] Lyria Error:", err),
          onclose: (e) => {
            console.log("[MusicService] Lyria Session Closed", e);
          },
        },
      });

      if (this.pendingPrompt) {
        const prompt = this.pendingPrompt;
        console.log(
          "[MusicService] Flushing pending prompt after connect():",
          prompt
        );
        await this.steer(prompt).catch((err) => {
          console.error(
            "[MusicService] Failed to send pending prompt after connect():",
            err
          );
        });
      }
    } catch (error: unknown) {
      console.error("[MusicService] Connection error:", error);
      ws.close(1011, "Failed to connect to AI Music Service");
      return;
    }
  }

  async steer(prompt: string) {
    if (!this.session) {
      console.warn(
        "[MusicService] steer called before session is ready, queueing"
      );
      this.pendingPrompt = prompt;
      return;
    }

    const session = this.session;

    const now = Date.now();
    if (
      this.lastPrompt &&
      this.lastPrompt === prompt &&
      now - this.lastPromptAt < this.MIN_PROMPT_INTERVAL_MS
    ) {
      console.log("[MusicService] Ignoring duplicate prompt within interval");
      return;
    }

    const promptConfig: WeightedPrompt = { text: prompt, weight: 1.0 };

    console.log("[MusicService] Steering music with prompt:", prompt);

    if (!this.isPlaying) {
      await session.setWeightedPrompts({
        weightedPrompts: [promptConfig],
      });

      await session.setMusicGenerationConfig({
        musicGenerationConfig: {
          guidance: 4.0,
        },
      });

      await session.play();
      this.isPlaying = true;
    } else {
      const blendedPrompts: WeightedPrompt[] =
        this.lastPrompt && this.lastPrompt !== prompt
          ? [
              { text: this.lastPrompt, weight: 0.3 },
              { text: prompt, weight: 0.7 },
            ]
          : [promptConfig];

      await session.setWeightedPrompts({
        weightedPrompts: blendedPrompts,
      });
    }

    this.pendingPrompt = null;
    this.lastPrompt = prompt;
    this.lastPromptAt = now;
  }

  close() {
    if (this.session) {
      try {
        this.session.close();
      } catch (e) {
        console.error("[MusicService] Error closing session:", e);
      } finally {
        this.session = null;
      }
    }
  }

  private handleContent(message: unknown, ws: WSContext<WebSocket>) {
    const anyMsg = message as any;
    const chunks = anyMsg?.serverContent?.audioChunks as
      | { data: string }[]
      | undefined;

    if (!Array.isArray(chunks) || chunks.length === 0) {
      return;
    }

    for (const chunk of chunks) {
      if (!chunk?.data) continue;
      const buffer = Buffer.from(chunk.data, "base64");
      if (ws.readyState !== 1) break;
      ws.send(buffer);
    }
  }
}

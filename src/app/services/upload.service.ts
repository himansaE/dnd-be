import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getEnvVariable } from "@/app/utils/env.js";
import crypto from "node:crypto";

export class UploadService {
  private client: S3Client;
  private bucket: string;
  private endpoint?: string;

  constructor() {
    const endpoint = getEnvVariable("R2_ENDPOINT", "");
    const region = getEnvVariable("R2_REGION", "auto");
    const accessKeyId = getEnvVariable("R2_ACCESS_KEY_ID", "");
    const secretAccessKey = getEnvVariable("R2_SECRET_ACCESS_KEY", "");
    this.bucket = getEnvVariable("R2_BUCKET_NAME", "") || "";

    this.endpoint = endpoint;
    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  generateKey(prefix = "characters/") {
    const id = crypto.randomUUID();
    return `${prefix}${id}`;
  }

  async putObject(params: {
    key?: string;
    contentType: string;
    body: Buffer | Uint8Array | Blob | string;
  }) {
    const key = params.key ?? this.generateKey();
    console.log(
      `[UploadService.putObject] START - key: ${key}, contentType: ${params.contentType}`
    );
    console.log(
      `[UploadService.putObject] Body type: ${typeof params.body}, size: ${
        params.body instanceof Buffer ? params.body.length : "unknown"
      }`
    );
    console.log(
      `[UploadService.putObject] Bucket: ${this.bucket}, Endpoint: ${this.endpoint}`
    );

    try {
      console.log(
        `[UploadService.putObject] Sending PutObjectCommand to R2...`
      );
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: params.body,
          ContentType: params.contentType,
        })
      );
      console.log(`[UploadService.putObject] Upload to R2 SUCCESS`);

      const base = getEnvVariable("BUCKET_URL", "");
      let url = key as string;
      if (base) {
        url = `${base.replace(/\/$/, "")}/${key}`;
        console.log(`[UploadService.putObject] URL from BUCKET_URL: ${url}`);
      } else if (this.endpoint) {
        try {
          const u = new URL(this.endpoint);
          url = `${u.protocol}//${this.bucket}.${u.host}/${key}`;
          console.log(`[UploadService.putObject] URL from endpoint: ${url}`);
        } catch (e) {
          console.warn(
            `[UploadService.putObject] Failed to parse endpoint URL:`,
            e
          );
        }
      } else {
        console.warn(
          `[UploadService.putObject] No BUCKET_URL or endpoint, URL is just the key: ${url}`
        );
      }

      console.log(
        `[UploadService.putObject] SUCCESS - returning { key: ${key}, url: ${url} }`
      );
      return { key, url };
    } catch (error) {
      console.error(`[UploadService.putObject] ERROR during upload:`, error);
      console.error(`[UploadService.putObject] Error details:`, {
        message: (error as any)?.message,
        code: (error as any)?.code,
        statusCode: (error as any)?.$metadata?.httpStatusCode,
      });
      console.error(`[UploadService.putObject] Stack:`, (error as any)?.stack);
      throw error;
    }
  }
}

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getEnvVariable } from "@/app/utils/env.js";
import crypto from "node:crypto";

export class UploadService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const endpoint = getEnvVariable("R2_ENDPOINT", "");
    const region = getEnvVariable("R2_REGION", "auto");
    const accessKeyId = getEnvVariable("R2_ACCESS_KEY_ID", "");
    const secretAccessKey = getEnvVariable("R2_SECRET_ACCESS_KEY", "");
    this.bucket = getEnvVariable("R2_BUCKET_NAME", "");

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
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: params.body,
        ContentType: params.contentType,
        ACL: "public-read",
      })
    );
    const base = getEnvVariable("BUCKET_URL", "");
    const url = base ? `${base}/${key}` : key;
    return { key, url };
  }
}

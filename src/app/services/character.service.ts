import { CharacterRepository } from "@repositories/character.repository.js";
import { UploadService } from "@services/upload.service.js";

export class CharacterService {
  private repo = new CharacterRepository();
  private uploader = new UploadService();

  async list(page = 1, pageSize = 20) {
    const take = pageSize;
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.repo.list(skip, take),
      this.repo.count(),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async get(id: string) {
    return this.repo.get(id);
  }

  async getMany(ids: string[]) {
    return this.repo.findManyByIds(ids);
  }

  async searchByName(q: string, page = 1, pageSize = 20) {
    const take = pageSize;
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.repo.searchByName(q, skip, take),
      this.repo.countSearchByName(q),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async create(
    data: {
      name: string;
      type: string;
      ability?: string;
      description?: string;
      imageKey?: string;
      imageUrl?: string;
    },
    options?: { file?: File | { bytes: Buffer; contentType: string } }
  ) {
    console.log(
      `[CharacterService.create] START - name: ${
        data.name
      }, hasFile: ${!!options?.file}`
    );
    const payload: any = { ...data };

    if (options?.file) {
      console.log(`[CharacterService.create] Uploading file...`);
      const { imageKey, imageUrl } = await this.uploadIfNeeded(options.file);
      console.log(`[CharacterService.create] Upload result:`, {
        imageKey,
        imageUrl,
      });
      if (imageKey && imageUrl) {
        payload.imageKey = imageKey;
        payload.imageUrl = imageUrl;
        console.log(`[CharacterService.create] Image data added to payload`);
      } else {
        console.warn(`[CharacterService.create] Upload returned empty key/url`);
      }
    } else {
      console.log(
        `[CharacterService.create] No file provided, skipping upload`
      );
    }

    console.log(
      `[CharacterService.create] Creating in DB with payload:`,
      payload
    );
    const result = await this.repo.create(payload);
    console.log(`[CharacterService.create] SUCCESS - created character:`, {
      id: result.id,
      imageKey: result.imageKey,
      imageUrl: result.imageUrl,
    });
    return result;
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      type: string;
      ability?: string;
      description?: string;
      imageKey?: string;
      imageUrl?: string;
    }>,
    options?: { file?: File | { bytes: Buffer; contentType: string } }
  ) {
    console.log(
      `[CharacterService.update] START - id: ${id}, hasFile: ${!!options?.file}`
    );
    const updates: any = { ...data };

    if (options?.file) {
      console.log(`[CharacterService.update] Uploading file...`);
      const { imageKey, imageUrl } = await this.uploadIfNeeded(options.file);
      console.log(`[CharacterService.update] Upload result:`, {
        imageKey,
        imageUrl,
      });
      if (imageKey && imageUrl) {
        updates.imageKey = imageKey;
        updates.imageUrl = imageUrl;
        console.log(`[CharacterService.update] Image data added to updates`);
      } else {
        console.warn(`[CharacterService.update] Upload returned empty key/url`);
      }
    } else {
      console.log(
        `[CharacterService.update] No file provided, skipping upload`
      );
    }

    console.log(`[CharacterService.update] Updating in DB with:`, updates);
    const result = await this.repo.update(id, updates);
    console.log(`[CharacterService.update] SUCCESS - updated character:`, {
      id: result.id,
      imageKey: result.imageKey,
      imageUrl: result.imageUrl,
    });
    return result;
  }

  private async uploadIfNeeded(
    file: File | { bytes: Buffer; contentType: string }
  ) {
    console.log(`[CharacterService.uploadIfNeeded] START`);
    try {
      let bytes: Buffer;
      let contentType: string;

      // Check if it's our custom Buffer object format
      if ("bytes" in file && file.bytes instanceof Buffer) {
        console.log(
          `[CharacterService.uploadIfNeeded] File is Buffer object, size: ${file.bytes.length}`
        );
        bytes = file.bytes;
        contentType = file.contentType;
      } else {
        // It's a File object (from Hono's FormData)
        console.log(
          `[CharacterService.uploadIfNeeded] File is File object, converting to Buffer...`
        );
        console.log(
          `[CharacterService.uploadIfNeeded] File name: ${
            (file as File).name
          }, type: ${(file as File).type}, size: ${(file as File).size}`
        );

        const ab = await (file as File).arrayBuffer();
        bytes = Buffer.from(ab);
        contentType = (file as File).type || "application/octet-stream";
        console.log(
          `[CharacterService.uploadIfNeeded] Converted, size: ${bytes.length}, contentType: ${contentType}`
        );
      }

      console.log(
        `[CharacterService.uploadIfNeeded] Calling uploader.putObject...`
      );
      const { key, url } = await this.uploader.putObject({
        body: bytes,
        contentType,
      });
      console.log(
        `[CharacterService.uploadIfNeeded] SUCCESS - key: ${key}, url: ${url}`
      );
      return { imageKey: key, imageUrl: url };
    } catch (error) {
      console.error(`[CharacterService.uploadIfNeeded] ERROR:`, error);
      console.error(
        `[CharacterService.uploadIfNeeded] Stack:`,
        (error as any)?.stack
      );
      return { imageKey: undefined, imageUrl: undefined };
    }
  }

  async remove(id: string) {
    return this.repo.remove(id);
  }
}

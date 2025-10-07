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
    const payload: any = { ...data };
    if (options?.file) {
      const { imageKey, imageUrl } = await this.uploadIfNeeded(options.file);
      if (imageKey && imageUrl) {
        payload.imageKey = imageKey;
        payload.imageUrl = imageUrl;
      }
    }
    return this.repo.create(payload);
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
    const updates: any = { ...data };
    if (options?.file) {
      const { imageKey, imageUrl } = await this.uploadIfNeeded(options.file);
      if (imageKey && imageUrl) {
        updates.imageKey = imageKey;
        updates.imageUrl = imageUrl;
      }
    }
    return this.repo.update(id, updates);
  }

  private async uploadIfNeeded(
    file: File | { bytes: Buffer; contentType: string }
  ) {
    try {
      let bytes: Buffer;
      let contentType: string;
      if ("bytes" in file) {
        bytes = file.bytes;
        contentType = file.contentType;
      } else {
        const ab = await (file as File).arrayBuffer();
        bytes = Buffer.from(ab);
        contentType = (file as File).type || "application/octet-stream";
      }
      const { key, url } = await this.uploader.putObject({
        body: bytes,
        contentType,
      });
      return { imageKey: key, imageUrl: url };
    } catch {
      return { imageKey: undefined, imageUrl: undefined };
    }
  }

  async remove(id: string) {
    return this.repo.remove(id);
  }
}

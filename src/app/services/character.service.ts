import { CharacterRepository } from "@repositories/character.repository.js";

export class CharacterService {
  private repo = new CharacterRepository();

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

  async create(data: {
    userId?: string;
    name: string;
    type: string;
    ability?: string;
    description?: string;
  }) {
    return this.repo.create(data);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      type: string;
      ability?: string;
      description?: string;
    }>
  ) {
    return this.repo.update(id, data);
  }

  async remove(id: string) {
    return this.repo.remove(id);
  }
}

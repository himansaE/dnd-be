import { prisma } from "@repositories/database.js";

export class CharacterRepository {
  async list(skip = 0, take = 20) {
    return prisma.character.findMany({
      orderBy: { updatedAt: "desc" },
      skip,
      take,
    });
  }

  async count(): Promise<number> {
    return prisma.character.count();
  }

  async get(id: string) {
    return prisma.character.findFirst({
      where: { id },
    });
  }

  async findManyByIds(ids: string[]) {
    if (!ids.length) return [];
    return prisma.character.findMany({
      where: { id: { in: ids } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async searchByName(q: string, skip = 0, take = 20) {
    return prisma.character.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take,
    });
  }

  async countSearchByName(q: string): Promise<number> {
    return prisma.character.count({
      where: { name: { contains: q, mode: "insensitive" } },
    });
  }

  async create(data: {
    name: string;
    type: string;
    ability?: string;
    description?: string;
    imageKey?: string;
    imageUrl?: string;
  }) {
    return prisma.character.create({ data });
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
    }>
  ) {
    return prisma.character.update({ where: { id }, data });
  }

  async remove(id: string) {
    return prisma.character.delete({ where: { id } });
  }
}

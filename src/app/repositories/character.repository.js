import { prisma } from "@repositories/database.js";
export class CharacterRepository {
    async list(skip = 0, take = 20) {
        return prisma.character.findMany({
            orderBy: { updatedAt: "desc" },
            skip,
            take,
        });
    }
    async count() {
        return prisma.character.count();
    }
    async get(id) {
        return prisma.character.findFirst({
            where: { id },
        });
    }
    async findManyByIds(ids) {
        if (!ids.length)
            return [];
        return prisma.character.findMany({
            where: { id: { in: ids } },
            orderBy: { updatedAt: "desc" },
        });
    }
    async searchByName(q, skip = 0, take = 20) {
        return prisma.character.findMany({
            where: {
                name: { contains: q, mode: "insensitive" },
            },
            orderBy: { updatedAt: "desc" },
            skip,
            take,
        });
    }
    async countSearchByName(q) {
        return prisma.character.count({
            where: { name: { contains: q, mode: "insensitive" } },
        });
    }
    async create(data) {
        return prisma.character.create({ data });
    }
    async update(id, data) {
        return prisma.character.update({ where: { id }, data });
    }
    async remove(id) {
        return prisma.character.delete({ where: { id } });
    }
}

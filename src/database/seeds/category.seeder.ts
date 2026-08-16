import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { CategoryTypeOrmEntity } from '../../modules/blog/infrastructure/persistence/typeorm/category.typeorm-entity';

const TEST_CATEGORIES = [
  { name: 'Backend', slug: 'backend' },
  { name: 'Frontend', slug: 'frontend' },
  { name: 'DevOps', slug: 'devops' },
  { name: 'Arquitectura', slug: 'arquitectura' },
];

export default class CategorySeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repository = dataSource.getRepository(CategoryTypeOrmEntity);
    const now = new Date();

    for (const category of TEST_CATEGORIES) {
      const existing = await repository.findOne({
        where: [{ slug: category.slug }, { name: category.name }],
      });

      if (existing) {
        continue;
      }

      await repository.insert({
        id: randomUUID(),
        name: category.name,
        slug: category.slug,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

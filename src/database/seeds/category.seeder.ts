import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { CategoryTypeOrmEntity } from '../../modules/blog/infrastructure/persistence/typeorm/category.typeorm-entity';

const CATEGORIES = [
  { name: 'Backend', slug: 'backend' },
  { name: 'Frontend', slug: 'frontend' },
  { name: 'Proyectos', slug: 'proyectos' },
  { name: 'Arquitectura', slug: 'arquitectura' },
  { name: 'Inteligencia Artificial', slug: 'inteligencia-artificial' },
  { name: 'Base de datos', slug: 'base-de-datos' },
  { name: 'Seguridad', slug: 'seguridad' },
];

export default class CategorySeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repository = dataSource.getRepository(CategoryTypeOrmEntity);
    const now = new Date();

    for (const category of CATEGORIES) {
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

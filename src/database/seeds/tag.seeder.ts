import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { TagTypeOrmEntity } from '../../modules/blog/infrastructure/persistence/typeorm/tag.typeorm-entity';

const TEST_TAGS = [
  { name: 'TypeScript', slug: 'typescript' },
  { name: 'NestJS', slug: 'nestjs' },
  { name: 'React', slug: 'react' },
  { name: 'PostgreSQL', slug: 'postgresql' },
  { name: 'Docker', slug: 'docker' },
  { name: 'Clean Architecture', slug: 'clean-architecture' },
];

export default class TagSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repository = dataSource.getRepository(TagTypeOrmEntity);
    const now = new Date();

    for (const tag of TEST_TAGS) {
      const existing = await repository.findOne({
        where: [{ slug: tag.slug }, { name: tag.name }],
      });

      if (existing) {
        continue;
      }

      await repository.insert({
        id: randomUUID(),
        name: tag.name,
        slug: tag.slug,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { TagTypeOrmEntity } from '../../modules/blog/infrastructure/persistence/typeorm/tag.typeorm-entity';

const TAGS = [
  { name: 'TypeScript', slug: 'typescript' },
  { name: 'JavaScript', slug: 'javascript' },
  { name: 'PHP', slug: 'php' },
  { name: 'SQL', slug: 'sql' },
  { name: 'Node.js', slug: 'nodejs' },
  { name: 'Nest.js', slug: 'nestjs' },
  { name: 'Laravel', slug: 'laravel' },
  { name: 'React', slug: 'react' },
  { name: 'Next.js', slug: 'nextjs' },
  { name: 'Tailwind CSS', slug: 'tailwindcss' },
  { name: 'HTML', slug: 'html' },
  { name: 'CSS', slug: 'css' },
  { name: 'UI/UX', slug: 'uiux' },
  { name: 'PostgreSQL', slug: 'postgresql' },
  { name: 'MySQL', slug: 'mysql' },
  { name: 'MongoDB', slug: 'mongodb' },
  { name: 'Docker', slug: 'docker' },
  { name: 'ORM', slug: 'orm' },
  { name: 'Git', slug: 'git' },
];

export default class TagSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repository = dataSource.getRepository(TagTypeOrmEntity);
    const now = new Date();

    for (const tag of TAGS) {
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

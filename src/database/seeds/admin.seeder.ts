import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { AdminTypeOrmEntity } from '../../modules/admin/infrastructure/persistence/typeorm/admin.typeorm-entity';

const TEST_ADMIN = {
  username: 'admin',
  email: 'admin@test.com',
  password: 'Admin123!',
};

export default class AdminSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repository = dataSource.getRepository(AdminTypeOrmEntity);

    const existing = await repository.findOne({
      where: [{ username: TEST_ADMIN.username }, { email: TEST_ADMIN.email }],
    });

    if (existing) {
      return;
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(TEST_ADMIN.password, 10);

    await repository.insert({
      id: randomUUID(),
      username: TEST_ADMIN.username,
      email: TEST_ADMIN.email,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  }
}

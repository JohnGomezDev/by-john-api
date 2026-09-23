import { MigrationInterface, QueryRunner } from "typeorm";

export class ResizePostChunkEmbeding1790191188937 implements MigrationInterface {
    name = 'ResizePostChunkEmbeding1790191188937'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts_chunks" DROP COLUMN "embedding"`);
        await queryRunner.query(`ALTER TABLE "posts_chunks" ADD "embedding" vector(384) NOT NULL`);
        await queryRunner.query(
            `CREATE INDEX "idx_chunks_embedding" ON "posts_chunks" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64)`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts_chunks" DROP COLUMN "embedding"`);
        await queryRunner.query(`ALTER TABLE "posts_chunks" ADD "embedding" vector(1024) NOT NULL`);
        await queryRunner.query(
            `CREATE INDEX "idx_chunks_embedding" ON "posts_chunks" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64)`,
        );
    }

}

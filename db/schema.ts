import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(), startedAt: integer('started_at').notNull()
});
export const scores = sqliteTable('scores', {
  id: text('id').primaryKey(), name: text('name').notNull(), score: integer('score').notNull(), createdAt: integer('created_at').notNull()
}, table => [index('scores_ranking').on(table.score,table.createdAt)]);

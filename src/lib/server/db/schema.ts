import { pgTable, text, timestamp, integer, bigint } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	hashedPassword: text('hashed_password').notNull(),
	vaultSalt: text('vault_salt').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

export const vaultCategories = pgTable('vault_categories', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	icon: text('icon').notNull().default('📁'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const vaultProjects = pgTable('vault_projects', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	categoryId: text('category_id')
		.notNull()
		.references(() => vaultCategories.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	sortOrder: bigint('sort_order', { mode: 'number' }).notNull().default(0),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const vaultItems = pgTable('vault_items', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	categoryId: text('category_id')
		.notNull()
		.references(() => vaultCategories.id, { onDelete: 'cascade' }),
	projectId: text('project_id').references(() => vaultProjects.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	encryptedData: text('encrypted_data').notNull(),
	iv: text('iv').notNull(),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const auditLog = pgTable('audit_log', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	action: text('action').notNull(),
	resourceType: text('resource_type'),
	resourceId: text('resource_id'),
	ipAddress: text('ip_address'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

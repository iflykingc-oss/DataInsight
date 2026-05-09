import { pgTable, foreignKey, unique, check, serial, varchar, integer, timestamp, jsonb, text, date, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 50 }).default('member'),
	status: varchar({ length: 50 }).default('active'),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	permissions: jsonb().default({"form":true,"share":true,"export":true,"upload":true,"dashboard":true,"ai_analyze":true,"custom_ai_model":false}),
}, (table) => [
	foreignKey({
				columns: [table.createdBy],
				foreignColumns: [table.id],
				name: "users_created_by_fkey"
			}),
		unique("users_username_key").on(table.username),
		unique("users_email_unique").on(table.email),
		check("users_role_check", sql`(role)::text = ANY ((ARRAY['admin'::character varying, 'member'::character varying])::text[])`),
		check("users_status_check", sql`(status)::text = ANY ((ARRAY['active'::character varying, 'disabled'::character varying])::text[])`),
]);

export const verificationCodes = pgTable("verification_codes", {
	id: serial().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 6 }).notNull(),
	type: varchar({ length: 20 }).default('register'),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	used: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const loginLogs = pgTable("login_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	ip: varchar({ length: 50 }),
	userAgent: text("user_agent"),
	status: varchar({ length: 50 }).default('success'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
				columns: [table.userId],
				foreignColumns: [users.id],
				name: "login_logs_user_id_fkey"
			}).onDelete("cascade"),
		check("login_logs_status_check", sql`(status)::text = ANY ((ARRAY['success'::character varying, 'failed'::character varying])::text[])`),
]);

export const usageStats = pgTable("usage_stats", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	action: varchar({ length: 100 }).notNull(),
	count: integer().default(1),
	date: date().default(sql`CURRENT_DATE`),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
				columns: [table.userId],
				foreignColumns: [users.id],
				name: "usage_stats_user_id_fkey"
			}).onDelete("cascade"),
]);

export const adminAiConfig = pgTable("admin_ai_config", {
	id: serial().primaryKey().notNull(),
	config: jsonb().default({"apiKey":"","baseUrl":"","modelName":""}).notNull(),
	updatedBy: integer("updated_by"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
				columns: [table.updatedBy],
				foreignColumns: [users.id],
				name: "admin_ai_config_updated_by_fkey"
			}),
]);

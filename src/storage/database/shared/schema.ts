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
	securityQuestion: varchar("security_question", { length: 500 }),
	securityAnswer: varchar("security_answer", { length: 255 }),
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

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const loginLogs = pgTable("login_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
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

export const announcements = pgTable("announcements", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	type: varchar({ length: 50 }).default('info'),
	priority: varchar({ length: 50 }).default('normal'),
	remindStrategy: varchar("remind_strategy", { length: 50 }).default('once'),
	status: varchar({ length: 50 }).default('draft'),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
				columns: [table.createdBy],
				foreignColumns: [users.id],
				name: "announcements_created_by_fkey"
			}),
		check("announcements_type_check", sql`(type)::text = ANY ((ARRAY['info'::character varying, 'warning'::character varying, 'urgent'::character varying, 'maintenance'::character varying])::text[])`),
		check("announcements_priority_check", sql`(priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying])::text[])`),
		check("announcements_remind_strategy_check", sql`(remind_strategy)::text = ANY ((ARRAY['once'::character varying, 'always'::character varying])::text[])`),
		check("announcements_status_check", sql`(status)::text = ANY ((ARRAY['draft'::character varying, 'scheduled'::character varying, 'published'::character varying, 'expired'::character varying])::text[])`),
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

// User Activity Logs - GDPR/CCPA compliant
// - Device IDs are SHA-256 hashed (never stored raw)
// - No PII in metadata (no email, phone, name)
// - 90-day auto-expiry per data minimization principle
// - User opt-out supported
export const userActivityLogs = pgTable("user_activity_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	eventCategory: varchar("event_category", { length: 50 }).notNull(),
	eventType: varchar("event_type", { length: 100 }).notNull(),
	deviceIdHash: varchar("device_id_hash", { length: 64 }),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: varchar("user_agent", { length: 500 }),
	metadata: jsonb().default({}),
	sessionId: varchar("session_id", { length: 64 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP + INTERVAL '90 days'`),
}, (table) => [
	foreignKey({
				columns: [table.userId],
				foreignColumns: [users.id],
				name: "fk_activity_logs_user_id"
			}).onDelete("set null"),
	check("chk_event_category", sql`(event_category)::text = ANY ((ARRAY['auth'::character varying, 'account'::character varying, 'action'::character varying, 'page_view'::character varying])::text[])`),
]);

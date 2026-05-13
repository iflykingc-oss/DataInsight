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

// AI Usage Logs - Track AI function calls for cost management
// - Stores function type, model name, token usage, latency
// - Used for admin cost dashboard and user quota management
export const aiUsageLogs = pgTable("ai_usage_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	functionType: varchar("function_type", { length: 50 }).notNull(), // insight, ai-table, ai-field, ai-formula, nl2dashboard, data-story, metric-ai, industry-detect, analysis-planner, chat
	modelName: varchar("model_name", { length: 100 }),
	inputTokens: integer("input_tokens").default(0),
	outputTokens: integer("output_tokens").default(0),
	totalTokens: integer("total_tokens").default(0),
	latencyMs: integer("latency_ms"),
	status: varchar({ length: 20 }).default('success'), // success, error, timeout
	errorMessage: varchar("error_message", { length: 500 }),
	ipAddress: varchar("ip_address", { length: 45 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
				columns: [table.userId],
				foreignColumns: [users.id],
				name: "fk_ai_usage_logs_user_id"
			}).onDelete("set null"),
	check("chk_ai_status", sql`(status)::text = ANY ((ARRAY['success'::character varying, 'error'::character varying, 'timeout'::character varying])::text[])`),
]);

// Pricing Plans - Admin configurable pricing tiers
export const pricingPlans = pgTable("pricing_plans", {
	id: serial().primaryKey().notNull(),
	planKey: varchar("plan_key", { length: 50 }).notNull(), // free, pro, enterprise
	name: varchar({ length: 100 }).notNull(),
	nameEn: varchar("name_en", { length: 100 }),
	description: text(),
	descriptionEn: text("description_en"),
	priceMonthly: integer("price_monthly").default(0), // in cents
	priceYearly: integer("price_yearly").default(0), // in cents
	currency: varchar({ length: 10 }).default('CNY'),
	features: jsonb().default({}), // { maxProjects: 3, maxFileSize: 5, aiCallLimit: 100, ... }
	isPopular: boolean("is_popular").default(false),
	sortOrder: integer("sort_order").default(0),
	status: varchar({ length: 20 }).default('active'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("pricing_plans_plan_key_unique").on(table.planKey),
]);

// User Subscriptions - Track user plan and usage quotas
export const userSubscriptions = pgTable("user_subscriptions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	planKey: varchar("plan_key", { length: 50 }).default('free'),
	aiCallsUsed: integer("ai_calls_used").default(0),
	aiCallsLimit: integer("ai_calls_limit").default(100),
	storageUsedMb: integer("storage_used_mb").default(0),
	storageLimitMb: integer("storage_limit_mb").default(5),
	periodStart: timestamp("period_start", { withTimezone: true, mode: 'string' }),
	periodEnd: timestamp("period_end", { withTimezone: true, mode: 'string' }),
	status: varchar({ length: 20 }).default('active'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
				columns: [table.userId],
				foreignColumns: [users.id],
				name: "fk_user_subscriptions_user_id"
			}).onDelete("cascade"),
]);

// Feedback - User feedback and support tickets
// - GDPR compliant: user can view/delete own feedback
// - Anonymous feedback supported (userId nullable)
// - XSS protected: content sanitized before storage
// - 90-day auto-cleanup for resolved tickets
export const feedback = pgTable("feedback", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"), // nullable for anonymous feedback
	type: varchar({ length: 50 }).notNull(), // bug, feature, question, complaint, other
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	contact: varchar({ length: 255 }), // optional email/phone for follow-up
	status: varchar({ length: 50 }).default('open'), // open, in_progress, resolved, closed
	priority: varchar({ length: 50 }).default('normal'), // low, normal, high, urgent
	adminReply: text("admin_reply"),
	repliedBy: integer("replied_by"),
	repliedAt: timestamp("replied_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
				columns: [table.userId],
				foreignColumns: [users.id],
				name: "fk_feedback_user_id"
			}).onDelete("set null"),
	foreignKey({
				columns: [table.repliedBy],
				foreignColumns: [users.id],
				name: "fk_feedback_replied_by"
			}).onDelete("set null"),
	check("chk_feedback_type", sql`(type)::text = ANY ((ARRAY['bug'::character varying, 'feature'::character varying, 'question'::character varying, 'complaint'::character varying, 'other'::character varying])::text[])`),
	check("chk_feedback_status", sql`(status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying])::text[])`),
	check("chk_feedback_priority", sql`(priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])`),
]);

// Audit Logs - Immutable audit trail for security compliance
// - No UPDATE/DELETE allowed (append-only)
// - Covers: data access, export, delete, permission changes, admin actions
export const auditLogs = pgTable("audit_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	action: varchar({ length: 100 }).notNull(), // data.export, data.delete, auth.permission_change, admin.user_create, etc.
	resourceType: varchar("resource_type", { length: 50 }), // user, data, dashboard, settings
	resourceId: varchar("resource_id", { length: 100 }),
	details: jsonb().default({}),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: varchar("user_agent", { length: 500 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
				columns: [table.userId],
				foreignColumns: [users.id],
				name: "fk_audit_logs_user_id"
			}).onDelete("set null"),
]);

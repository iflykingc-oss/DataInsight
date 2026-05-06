import { relations } from "drizzle-orm/relations";
import { users, loginLogs, usageStats, adminAiConfig } from "./schema";

export const usersRelations = relations(users, ({one, many}) => ({
	user: one(users, {
		fields: [users.createdBy],
		references: [users.id],
		relationName: "users_createdBy_users_id"
	}),
	users: many(users, {
		relationName: "users_createdBy_users_id"
	}),
	loginLogs: many(loginLogs),
	usageStats: many(usageStats),
	adminAiConfigs: many(adminAiConfig),
}));

export const loginLogsRelations = relations(loginLogs, ({one}) => ({
	user: one(users, {
		fields: [loginLogs.userId],
		references: [users.id]
	}),
}));

export const usageStatsRelations = relations(usageStats, ({one}) => ({
	user: one(users, {
		fields: [usageStats.userId],
		references: [users.id]
	}),
}));

export const adminAiConfigRelations = relations(adminAiConfig, ({one}) => ({
	user: one(users, {
		fields: [adminAiConfig.updatedBy],
		references: [users.id]
	}),
}));
import { v4 as uuidv4 } from "uuid";
import { relations, InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable(
  "User",
  {
    id: text("id").primaryKey().default(uuidv4()),
    name: text("name").notNull(),
    email: text("image").notNull(),
    password: text("password").notNull(),
  },
  (table) => {
    return {
      emailIdx: uniqueIndex("email_idx").on(table.email),
    };
  }
);

export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

export const customer = sqliteTable("Customer", {
  id: text("id").primaryKey().default(uuidv4()),
  name: text("name").notNull(),
  email: text("email").notNull(),
  image_url: text("image_url").notNull(),
});

export const customerRelations = relations(customer, ({ many }) => ({
  invoices: many(invoice),
}));

export type Customer = InferSelectModel<typeof customer>;
export type NewCustomer = InferInsertModel<typeof customer>;

export const invoice = sqliteTable("Invoice", {
  id: text("id").primaryKey().default(uuidv4()),
  amount: integer("amount").notNull(),
  status: text("status").notNull(),
  date: text("date").notNull(),
  customerId: text("customerId")
    .notNull()
    .references(() => customer.id, { onDelete: "cascade" }),
});

export const invoiceRelations = relations(invoice, ({ one }) => ({
  customer: one(customer, {
    fields: [invoice.customerId],
    references: [customer.id],
  }),
}));

export type Invoice = InferSelectModel<typeof invoice>;
export type NewInvoice = InferInsertModel<typeof invoice>;

export const revenue = sqliteTable("Revenue", {
  id: text("id").primaryKey().default(uuidv4()),
  month: text("month").notNull(),
  revenue: integer("revenue").notNull(),
});

export type Revenue = InferSelectModel<typeof revenue>;
export type NewRevenue = InferInsertModel<typeof revenue>;

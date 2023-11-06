import { sql as vercelSql } from "@vercel/postgres";
import { sql, or, like, eq, desc } from "drizzle-orm";
import { toInteger } from "lodash";
import {
  CustomerField,
  CustomersTable,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
} from "./definitions";
import { formatCurrency } from "./utils";
import prisma from "@/app/lib/db";
import { db } from "@/app/lib/drizzle";
import { revenue, customer, invoice } from "@/app/lib/schema";

export async function fetchRevenue() {
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).

  try {
    // Artificially delay a reponse for demo purposes.
    // Don't do this in real life :)
    const data = await db.query.revenue.findMany();

    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

export async function fetchLatestInvoices() {
  try {
    const invoices = await db.query.invoice.findMany({
      with: {
        customer: true,
      },
      orderBy: (invoice, { desc }) => [desc(invoice.date)],
      limit: 5,
    });

    const latestInvoices = invoices.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the latest invoices.");
  }
}

export async function fetchCardData() {
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(revenue);
    const customerCountPromise = db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(customer);
    const invoiceStatusPromise = db
      .select({
        count: sql<number>`sum(${invoice.amount})`.as("count"),
      })
      .from(invoice)
      .groupBy(invoice.status);

    // const invoiceStatusPromise = sql`SELECT
    //      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
    //      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
    //      FROM invoices`;

    const result = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const data = result.flatMap((array) => array.map((row) => row));

    const numberOfInvoices = Number(data[0].count ?? "0");
    const numberOfCustomers = Number(data[1].count ?? "0");
    const totalPaidInvoices = formatCurrency(data[2].count ?? 0);
    const totalPendingInvoices = formatCurrency(data[3].count ?? 0);

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to card data.");
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await db
      .select()
      .from(invoice)
      .leftJoin(customer, eq(customer.id, invoice.customerId))
      .where(
        or(
          like(customer.name, `%${query}%`),
          like(customer.email, `%${query}%`),
          eq(invoice.amount, toInteger(query)),
          eq(invoice.date, query),
          eq(invoice.status, query)
        )
      )
      .orderBy(desc(invoice.date))
      .limit(ITEMS_PER_PAGE)
      .offset(offset);

    return invoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices.");
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const invoices = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(invoice)
      .leftJoin(customer, eq(customer.id, invoice.customerId))
      .where(
        or(
          like(customer.name, `%${query}%`),
          like(customer.email, `%${query}%`),
          eq(invoice.amount, toInteger(query)),
          eq(invoice.date, query),
          eq(invoice.status, query)
        )
      );

    const totalPages = Math.ceil(Number(invoices[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of invoices.");
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await vercelSql<InvoiceForm>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error("Database Error:", error);
  }
}

export async function fetchCustomers() {
  try {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await vercelSql<CustomersTable>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch customer table.");
  }
}

export async function getUser(email: string) {
  try {
    const user = await vercelSql`SELECT * from USERS where email=${email}`;
    return user.rows[0] as User;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user.");
  }
}

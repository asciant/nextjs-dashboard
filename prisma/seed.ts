import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import {
  invoices,
  customers,
  revenue,
  users,
} from "../app/lib/placeholder-data";
import bcrypt from "bcrypt";

const libsql = createClient({
  url: `${process.env.TURSO_DATABASE_URL}`,
  authToken: `${process.env.TURSO_AUTH_TOKEN}`,
});

const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

const wait = (amount = 0) =>
  new Promise((resolve) => setTimeout(resolve, amount));

async function seedUsers() {
  try {
    // Insert data into the "users" table
    const insertedUsers = await Promise.all(
      users.map(async (user) => {
        return prisma.user.create({
          data: {
            id: user.id,
            name: user.name,
            email: user.email,
            password: await bcrypt.hash(user.password, 10),
          },
        });
      })
    );

    console.log(`Seeded ${insertedUsers.length} users`);

    return {
      users: insertedUsers,
    };
  } catch (error) {
    console.error("Error seeding users:", error);
    throw error;
  }
}

async function seedInvoices() {
  try {
    // Insert data into the "invoices" table
    const insertedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        return prisma.invoice.create({
          data: {
            customerId: invoice.customer_id,
            amount: invoice.amount,
            status: invoice.status,
            date: invoice.date,
          },
        });
      })
    );

    console.log(`Seeded ${insertedInvoices.length} invoices`);

    return {
      invoices: insertedInvoices,
    };
  } catch (error) {
    console.error("Error seeding invoices:", error);
    throw error;
  }
}

async function seedCustomers() {
  try {
    const insertedCustomers = await Promise.all(
      customers.map(async (customer) => {
        return prisma.customer.create({
          data: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            image_url: customer.image_url,
          },
        });
      })
    );

    console.log(`Seeded ${insertedCustomers.length} customers`);

    return {
      customers: insertedCustomers,
    };
  } catch (error) {
    console.error("Error seeding customers:", error);
    throw error;
  }
}

async function seedRevenue() {
  try {
    // Insert data into the "revenue" table
    const insertedRevenue = await Promise.all(
      revenue.map(async (rev) => {
        await wait(200);
        return prisma.revenue.create({
          data: {
            month: rev.month,
            revenue: rev.revenue,
          },
        });
      })
    );

    console.log(`Seeded ${insertedRevenue.length} revenue`);

    return {
      revenue: insertedRevenue,
    };
  } catch (error) {
    console.error("Error seeding revenue:", error);
    throw error;
  }
}

async function main() {
  await seedUsers();
  await seedCustomers();
  await seedInvoices();
  await seedRevenue();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

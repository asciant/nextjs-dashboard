"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/app/lib/drizzle";
import { invoice } from "@/app/lib/schema";

const InvoiceSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

const CreateInvoice = InvoiceSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  await db
    .insert(invoice)
    .values({ customerId, amount: amountInCents, status, date });

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

// ============================================================
// Zod schemas for form validation
// ============================================================

import { z } from 'zod';

// ------ Phone ------

export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(
    z
      .string()
      .length(10, 'Phone number must be exactly 10 digits')
      .regex(/^[6-9]/, 'Must start with 6-9')
  );

export const optionalPhoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(
    z.union([
      z.string().length(0),
      z
        .string()
        .length(10, 'Phone number must be exactly 10 digits')
        .regex(/^[6-9]/, 'Must start with 6-9'),
    ])
  );

// ------ Customer ------

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phoneNumber: phoneSchema,
  whatsappNumber: optionalPhoneSchema.default(''),
  sameAsWhatsApp: z.boolean().default(true),
  shopName: z.string().max(100).default(''),
  address: z.string().max(500).default(''),
  customerType: z.enum(['Retail', 'Wholesale']).default('Retail'),
  creditLimit: z
    .number()
    .min(0, 'Credit limit cannot be negative')
    .default(0),
  notes: z.string().max(1000).default(''),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

// ------ Fruit ------

export const fruitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  isActive: z.boolean().default(true),
  defaultWeightPerCrate: z
    .number()
    .positive('Weight must be greater than 0')
    .default(15),
  defaultRatePerKg: z.number().min(0, 'Rate cannot be negative').default(0),
  defaultDeliveryCharge: z
    .number()
    .min(0, 'Delivery charge cannot be negative')
    .default(0),
});

export type FruitFormData = z.infer<typeof fruitSchema>;

// ------ Sale ------

export const saleSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  customerName: z.string().min(1),
  fruitId: z.string().min(1, 'Fruit is required'),
  fruitName: z.string().min(1),
  date: z.date(),
  crates: z.number().positive('Crates must be greater than 0'),
  weightPerCrate: z.number().positive('Weight must be greater than 0'),
  ratePerKg: z.number().min(0, 'Rate cannot be negative'),
  deliveryCharge: z.number().min(0, 'Delivery charge cannot be negative').default(0),
  notes: z.string().max(500).default(''),
});

export type SaleFormData = z.infer<typeof saleSchema>;

// ------ Payment ------

export const paymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  customerName: z.string().min(1),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMode: z.enum(['Cash', 'UPI', 'Bank']).default('Cash'),
  date: z.date(),
  note: z.string().max(500).default(''),
  sendReceipt: z.boolean().default(true),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

// ------ Shop Setup ------

export const shopSetupSchema = z.object({
  ownerName: z.string().min(1, 'Owner name is required').max(100),
  shopName: z.string().min(1, 'Shop name is required').max(100),
  shopPhone: phoneSchema,
  shopAddress: z.string().max(500).default(''),
  whatsappNumber: optionalPhoneSchema.default(''),
  sameAsShopPhone: z.boolean().default(true),
});

export type ShopSetupFormData = z.infer<typeof shopSetupSchema>;

// ------ Settings ------

export const settingsSchema = z.object({
  ownerName: z.string().min(1, 'Owner name is required').max(100),
  shopName: z.string().min(1, 'Shop name is required').max(100),
  shopPhone: phoneSchema,
  shopAddress: z.string().max(500).default(''),
  whatsappNumber: optionalPhoneSchema.default(''),
  weeklyStartDay: z.number().min(1).max(7).default(1),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

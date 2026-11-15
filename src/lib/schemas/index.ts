// ============================================================
// Zod schemas for form validation
// ============================================================

import { z } from 'zod';

// ------ Phone ------

export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^[6-9]\d{9}$/, 'Phone number must be exactly 10 digits starting with 6-9');

export const optionalPhoneSchema = z
  .string()
  .refine(
    (val) => val === '' || /^[6-9]\d{9}$/.test(val),
    'Must be empty or a valid 10-digit number starting with 6-9'
  );

// ------ Customer ------

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phoneNumber: phoneSchema,
  whatsappNumber: optionalPhoneSchema,
  sameAsWhatsApp: z.boolean(),
  shopName: z.string().max(100),
  address: z.string().max(500),
  customerType: z.enum(['Retail', 'Wholesale']),
  creditLimit: z
    .number()
    .min(0, 'Credit limit cannot be negative'),
  notes: z.string().max(1000),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

// ------ Fruit ------

export const fruitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  isActive: z.boolean(),
  defaultWeightPerCrate: z
    .number()
    .positive('Weight must be greater than 0'),
  defaultRatePerKg: z.number().min(0, 'Rate cannot be negative'),
  defaultDeliveryCharge: z
    .number()
    .min(0, 'Delivery charge cannot be negative'),
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
  deliveryCharge: z.number().min(0, 'Delivery charge cannot be negative'),
  notes: z.string().max(500),
});

export type SaleFormData = z.infer<typeof saleSchema>;

// ------ Payment ------

export const paymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  customerName: z.string().min(1),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMode: z.enum(['Cash', 'UPI', 'Bank']),
  date: z.date(),
  note: z.string().max(500),
  sendReceipt: z.boolean(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

// ------ Shop Setup ------

export const shopSetupSchema = z.object({
  ownerName: z.string().min(1, 'Owner name is required').max(100),
  shopName: z.string().min(1, 'Shop name is required').max(100),
  shopPhone: phoneSchema,
  shopAddress: z.string().max(500),
  whatsappNumber: optionalPhoneSchema,
  sameAsShopPhone: z.boolean(),
});

export type ShopSetupFormData = z.infer<typeof shopSetupSchema>;

// ------ Settings ------

export const settingsSchema = z.object({
  ownerName: z.string().min(1, 'Owner name is required').max(100),
  shopName: z.string().min(1, 'Shop name is required').max(100),
  shopPhone: phoneSchema,
  shopAddress: z.string().max(500),
  whatsappNumber: optionalPhoneSchema,
  weeklyStartDay: z.number().min(1).max(7),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

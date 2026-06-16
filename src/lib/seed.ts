import { prisma } from "@/lib/db";

const now = new Date();
const daysAgo = (n: number) => {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};
const dollars = (n: number) => Math.round(n * 100);

type SeedItem = {
  sku: string;
  title: string;
  category: "standard" | "clearance" | "digital" | "perishable" | "custom";
  price: number;
  finalSale?: boolean;
  digitalAccessed?: boolean;
};

type SeedOrder = {
  placedDaysAgo: number;
  deliveredDaysAgo: number | null;
  items: SeedItem[];
};

type SeedCustomer = {
  email: string;
  name: string;
  accountStatus?: "active" | "flagged";
  orders: SeedOrder[];
  existingRefunds?: Array<{
    orderIdx: number;
    itemIdxs: number[];
    status: "approved" | "pending" | "denied";
    createdDaysAgo: number;
    reason: string;
  }>;
};

export const SEED_CUSTOMERS: SeedCustomer[] = [
  {
    email: "alice.chen@example.com",
    name: "Alice Chen",
    orders: [
      {
        placedDaysAgo: 20,
        deliveredDaysAgo: 14,
        items: [
          { sku: "MUG-001", title: "Ceramic Mug, 12oz", category: "standard", price: 18.0 },
          { sku: "TEA-014", title: "Loose Leaf Tea Sampler", category: "standard", price: 24.0 },
        ],
      },
    ],
  },
  {
    email: "ben.ortiz@example.com",
    name: "Ben Ortiz",
    orders: [
      {
        placedDaysAgo: 80,
        deliveredDaysAgo: 75,
        items: [{ sku: "SHIRT-7", title: "Cotton T-Shirt, Medium", category: "standard", price: 32.0 }],
      },
    ],
  },
  {
    email: "cassie.nguyen@example.com",
    name: "Cassie Nguyen",
    orders: [
      {
        placedDaysAgo: 10,
        deliveredDaysAgo: 7,
        items: [
          { sku: "CLR-301", title: "Clearance Wool Scarf", category: "clearance", price: 45.0, finalSale: true },
        ],
      },
    ],
  },
  {
    email: "diego.park@example.com",
    name: "Diego Park",
    orders: [
      {
        placedDaysAgo: 12,
        deliveredDaysAgo: 6,
        items: [{ sku: "BIKE-PRO", title: "Pro Road Bicycle", category: "standard", price: 1899.0 }],
      },
    ],
  },
  {
    email: "eun.song@example.com",
    name: "Eun Song",
    orders: [
      {
        placedDaysAgo: 60,
        deliveredDaysAgo: 55,
        items: [{ sku: "LAMP-22", title: "LED Desk Lamp", category: "standard", price: 79.99 }],
      },
    ],
  },
  {
    email: "fatima.al@example.com",
    name: "Fatima Al-Hassan",
    orders: [
      {
        placedDaysAgo: 5,
        deliveredDaysAgo: 5,
        items: [
          {
            sku: "SW-PRO-LIC",
            title: "Software Pro License (1yr)",
            category: "digital",
            price: 149.0,
            digitalAccessed: true,
          },
        ],
      },
    ],
  },
  {
    email: "george.lim@example.com",
    name: "George Lim",
    orders: [
      {
        placedDaysAgo: 3,
        deliveredDaysAgo: 3,
        items: [
          { sku: "EBOOK-44", title: "Photography eBook", category: "digital", price: 19.0, digitalAccessed: false },
        ],
      },
    ],
  },
  {
    email: "hana.iwata@example.com",
    name: "Hana Iwata",
    orders: [
      {
        placedDaysAgo: 18,
        deliveredDaysAgo: 11,
        items: [
          { sku: "ENGR-MUG", title: "Personalized Engraved Mug", category: "custom", price: 38.0, finalSale: true },
        ],
      },
    ],
  },
  {
    email: "ivan.petrov@example.com",
    name: "Ivan Petrov",
    orders: [
      {
        placedDaysAgo: 15,
        deliveredDaysAgo: 10,
        items: [{ sku: "HEAD-99", title: "Wireless Headphones", category: "standard", price: 199.0 }],
      },
    ],
    existingRefunds: [
      { orderIdx: 0, itemIdxs: [0], status: "approved", createdDaysAgo: 5, reason: "Defective right earcup" },
    ],
  },
  {
    email: "julia.ross@example.com",
    name: "Julia Ross",
    accountStatus: "flagged",
    orders: [
      {
        placedDaysAgo: 7,
        deliveredDaysAgo: 3,
        items: [{ sku: "BAG-12", title: "Canvas Tote Bag", category: "standard", price: 28.0 }],
      },
    ],
  },
  {
    email: "kenji.morris@example.com",
    name: "Kenji Morris",
    orders: [
      {
        placedDaysAgo: 88,
        deliveredDaysAgo: 80,
        items: [
          { sku: "BLEND-1", title: "Smoothie Blender", category: "standard", price: 89.0 },
          { sku: "JUICE-2", title: "Citrus Juicer", category: "standard", price: 65.0 },
          { sku: "POT-3", title: "Stockpot, 8qt", category: "standard", price: 75.0 },
          { sku: "PAN-4", title: "Nonstick Frying Pan", category: "standard", price: 49.0 },
        ],
      },
      {
        placedDaysAgo: 4,
        deliveredDaysAgo: 1,
        items: [{ sku: "KNIFE-7", title: "Chef's Knife", category: "standard", price: 110.0 }],
      },
    ],
    existingRefunds: [
      { orderIdx: 0, itemIdxs: [0], status: "approved", createdDaysAgo: 70, reason: "didn't like it" },
      { orderIdx: 0, itemIdxs: [1], status: "approved", createdDaysAgo: 55, reason: "changed mind" },
      { orderIdx: 0, itemIdxs: [2], status: "approved", createdDaysAgo: 40, reason: "wrong size" },
      { orderIdx: 0, itemIdxs: [3], status: "approved", createdDaysAgo: 20, reason: "not as expected" },
    ],
  },
  {
    email: "lara.kim@example.com",
    name: "Lara Kim",
    orders: [
      {
        placedDaysAgo: 6,
        deliveredDaysAgo: 4,
        items: [
          { sku: "CHOC-22", title: "Artisan Chocolate Box", category: "perishable", price: 42.0, finalSale: true },
        ],
      },
    ],
  },
  {
    email: "marco.silva@example.com",
    name: "Marco Silva",
    orders: [
      {
        placedDaysAgo: 2,
        deliveredDaysAgo: null,
        items: [{ sku: "SHOES-8", title: "Running Shoes, Size 10", category: "standard", price: 120.0 }],
      },
    ],
  },
  {
    email: "nadia.haddad@example.com",
    name: "Nadia Haddad",
    orders: [
      {
        placedDaysAgo: 10,
        deliveredDaysAgo: 5,
        items: [
          { sku: "TV-50", title: "50-inch Smart TV", category: "standard", price: 599.0 },
          { sku: "MOUNT-X", title: "Wall Mount Bracket", category: "standard", price: 49.0 },
          { sku: "HDMI-5", title: "HDMI Cable 5ft", category: "standard", price: 15.0 },
        ],
      },
    ],
  },
  {
    email: "owen.foster@example.com",
    name: "Owen Foster",
    orders: [
      {
        placedDaysAgo: 25,
        deliveredDaysAgo: 18,
        items: [{ sku: "BOOT-22", title: "Hiking Boots, Size 11", category: "standard", price: 165.0 }],
      },
    ],
  },
];

export type ResetDatabaseResult = {
  customers: number;
  orders: number;
  items: number;
  refunds: number;
  tracesCleared: boolean;
};

export async function resetDatabase(): Promise<ResetDatabaseResult> {
  await prisma.refund.deleteMany();
  await prisma.chatTrace.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();

  for (const c of SEED_CUSTOMERS) {
    const customer = await prisma.customer.create({
      data: {
        email: c.email,
        name: c.name,
        accountStatus: c.accountStatus ?? "active",
        createdAt: daysAgo(180),
      },
    });

    const orderRecords: { id: string; itemIds: string[] }[] = [];

    for (const o of c.orders) {
      const itemIds: string[] = [];
      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          customerEmail: c.email,
          placedAt: daysAgo(o.placedDaysAgo),
          deliveredAt: o.deliveredDaysAgo === null ? null : daysAgo(o.deliveredDaysAgo),
          totalCents: o.items.reduce((sum, it) => sum + dollars(it.price), 0),
          items: {
            create: o.items.map((it) => ({
              sku: it.sku,
              title: it.title,
              category: it.category,
              priceCents: dollars(it.price),
              finalSale: !!it.finalSale,
              digitalAccessed: !!it.digitalAccessed,
            })),
          },
        },
        include: { items: { select: { id: true } } },
      });
      for (const i of order.items) itemIds.push(i.id);
      orderRecords.push({ id: order.id, itemIds });
    }

    for (const r of c.existingRefunds ?? []) {
      const ord = orderRecords[r.orderIdx];
      const refundedItemIds = r.itemIdxs.map((i) => ord.itemIds[i]);
      const sum = await prisma.orderItem.aggregate({
        where: { id: { in: refundedItemIds } },
        _sum: { priceCents: true },
      });
      await prisma.refund.create({
        data: {
          orderId: ord.id,
          itemIdsJson: JSON.stringify(refundedItemIds),
          amountCents: sum._sum.priceCents ?? 0,
          reason: r.reason,
          status: r.status,
          createdAt: daysAgo(r.createdDaysAgo),
        },
      });
    }
  }

  return {
    customers: await prisma.customer.count(),
    orders: await prisma.order.count(),
    items: await prisma.orderItem.count(),
    refunds: await prisma.refund.count(),
    tracesCleared: true,
  };
}

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const pastries = [
    {
      name: "Meat Pie (Corned Beef Filling)",
      description: "Delicious meat pie with corned beef filling",
      price: 5.00,
      imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=delicious%20corned%20beef%20meat%20pie%20on%20a%20white%20plate&image_size=square_hd",
      category: "Pastry",
      ingredients: ["Flour", "Corned Beef", "Onions", "Spices"],
      available: true
    },
    {
      name: "Meat Pie (Egg Filling)",
      description: "Savory meat pie with egg filling",
      price: 4.50,
      imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=savory%20egg%20meat%20pie%20on%20a%20white%20plate&image_size=square_hd",
      category: "Pastry",
      ingredients: ["Flour", "Eggs", "Onions", "Spices"],
      available: true
    },
    {
      name: "Meat Pie (Vegetable Filling)",
      description: "Healthy vegetable-filled meat pie",
      price: 4.00,
      imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=healthy%20vegetable%20meat%20pie%20on%20a%20white%20plate&image_size=square_hd",
      category: "Pastry",
      ingredients: ["Flour", "Carrots", "Peas", "Onions", "Spices"],
      available: true
    },
    {
      name: "Meat Pie (Corned Beef & Sausage Filling)",
      description: "Hearty meat pie with corned beef and sausage",
      price: 5.50,
      imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=hearty%20corned%20beef%20and%20sausage%20meat%20pie&image_size=square_hd",
      category: "Pastry",
      ingredients: ["Flour", "Corned Beef", "Sausage", "Onions", "Spices"],
      available: true
    },
    {
      name: "Rock Buns",
      description: "Crunchy and delicious rock buns",
      price: 3.00,
      imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=crunchy%20rock%20buns%20on%20a%20white%20plate&image_size=square_hd",
      category: "Pastry",
      ingredients: ["Flour", "Sugar", "Butter", "Milk"],
      available: true
    },
    {
      name: "Cocoa Drink",
      description: "Rich and creamy cocoa drink",
      price: 2.50,
      imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=rich%20creamy%20cocoa%20drink%20in%20a%20glass&image_size=square_hd",
      category: "Drink",
      ingredients: ["Cocoa Powder", "Milk", "Sugar"],
      available: true
    },
    {
      name: "Vanilla Yoghurt",
      description: "Smooth vanilla yoghurt",
      price: 3.00,
      imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=smooth%20vanilla%20yoghurt%20in%20a%20bowl&image_size=square_hd",
      category: "Drink",
      ingredients: ["Yoghurt", "Vanilla Extract", "Sugar"],
      available: true
    },
    {
      name: "Strawberry Yoghurt",
      description: "Delicious strawberry yoghurt",
      price: 3.00,
      imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=delicious%20strawberry%20yoghurt%20in%20a%20bowl&image_size=square_hd",
      category: "Drink",
      ingredients: ["Yoghurt", "Strawberries", "Sugar"],
      available: true
    }
  ]

  const existingProducts = await prisma.product.count()
  if (existingProducts === 0) {
    for (const pastry of pastries) {
      await prisma.product.create({
        data: {
          ...pastry,
          ingredients: JSON.stringify(pastry.ingredients),
        }
      })
    }
  }

  // Fetch created products to attach to sample orders
  const createdProducts = await prisma.product.findMany()
  if (createdProducts.length > 0) {
    const p1 = createdProducts[0]
    const p2 = createdProducts[1] || p1
    const p3 = createdProducts[2] || p1
    const p4 = createdProducts[3] || p1
    const p5 = createdProducts[4] || p2

    // Helper to get date N days ago
    const daysAgo = (days: number, hoursOffset: number = 0) => {
      const d = new Date()
      d.setDate(d.getDate() - days)
      d.setHours(d.getHours() - hoursOffset)
      return d
    }

    const sampleOrders = [
      {
        customerName: 'Kofi Mensah',
        customerEmail: 'kofi.mensah@gmail.com',
        customerPhone: '+233 24 123 4567',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'House 14, Boundary Road, East Legon, Accra',
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 45.00,
        customerNote: 'Ring bell on gate, leave with security if unavailable.',
        createdAt: daysAgo(28, 2),
        items: [
          { productId: p1.id, quantity: 4, price: p1.price },
          { productId: p2.id, quantity: 2, price: p2.price },
        ]
      },
      {
        customerName: 'Ama Serwaa',
        customerEmail: 'ama.serwaa@yahoo.com',
        customerPhone: '+233 50 987 6543',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Plot 8 Cantonments Road, near US Embassy, Accra',
        status: 'DELIVERED' as const,
        orderType: 'WHOLESALE' as const,
        totalAmount: 120.00,
        customerNote: 'Corporate event order for 2 PM.',
        createdAt: daysAgo(27, 4),
        items: [
          { productId: p1.id, quantity: 15, price: p1.price },
          { productId: p3.id, quantity: 10, price: p3.price },
        ]
      },
      {
        customerName: 'Kwame Osei',
        customerEmail: 'kwame.osei@outlook.com',
        customerPhone: '+233 27 555 0192',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Airport Residential Area, 3rd Close, Accra',
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 35.50,
        customerNote: 'Please deliver warm before 11 AM.',
        createdAt: daysAgo(25, 1),
        items: [
          { productId: p2.id, quantity: 3, price: p2.price },
          { productId: p3.id, quantity: 2, price: p3.price },
        ]
      },
      {
        customerName: 'Abena Appiah',
        customerEmail: 'abena.a@gmail.com',
        customerPhone: '+233 20 444 8811',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: '12 Ring Road East, Osu Oxford Street, Accra',
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 28.00,
        customerNote: 'Call on arrival.',
        createdAt: daysAgo(24, 3),
        items: [
          { productId: p1.id, quantity: 2, price: p1.price },
        ]
      },
      {
        customerName: 'Yaw Boateng',
        customerEmail: 'yaw.b@hotmail.com',
        customerPhone: '+233 24 999 3322',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Spintex Road, opp. Palace Mall, Accra',
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 52.00,
        customerNote: 'Rider should contact reception.',
        createdAt: daysAgo(22, 5),
        items: [
          { productId: p2.id, quantity: 4, price: p2.price },
          { productId: p1.id, quantity: 4, price: p1.price },
        ]
      },
      {
        customerName: 'Esi Frimpong',
        customerEmail: 'esi.f@gmail.com',
        customerPhone: '+233 54 112 2334',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'JAS Villa, East Legon Extension, Accra',
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 64.00,
        customerNote: 'Close to East Legon cluster.',
        createdAt: daysAgo(21, 2),
        items: [
          { productId: p3.id, quantity: 6, price: p3.price },
        ]
      },
      {
        customerName: 'Samuel Mensah',
        customerEmail: 'samuel.m@gmail.com',
        customerPhone: '+233 24 888 1122',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Dzorwulu junction, Accra',
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 40.00,
        createdAt: daysAgo(19, 1),
        items: [{ productId: p1.id, quantity: 8, price: p1.price }]
      },
      {
        customerName: 'Naa Ashitey',
        customerEmail: 'naa.ashitey@yahoo.com',
        customerPhone: '+233 50 333 4455',
        deliveryType: 'PICKUP' as const,
        status: 'DELIVERED' as const,
        orderType: 'WHOLESALE' as const,
        totalAmount: 180.00,
        createdAt: daysAgo(18, 6),
        items: [
          { productId: p1.id, quantity: 20, price: p1.price },
          { productId: p2.id, quantity: 15, price: p2.price },
        ]
      },
      {
        customerName: 'Nana Yeboah',
        customerEmail: 'nana.y@gmail.com',
        customerPhone: '+233 26 112 3344',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Tema Community 6, Main St',
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 65.00,
        createdAt: daysAgo(17, 3),
        items: [{ productId: p4.id, quantity: 10, price: p4.price }]
      },
      {
        customerName: 'Grace Ansah',
        customerEmail: 'grace.ansah@gmail.com',
        customerPhone: '+233 24 555 7788',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Adenta Barrier, Accra',
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 38.00,
        createdAt: daysAgo(15, 2),
        items: [{ productId: p5.id, quantity: 5, price: p5.price }]
      },
      {
        customerName: 'David Addo',
        customerEmail: 'david.addo@gmail.com',
        customerPhone: '+233 55 443 2211',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Dansoman roundabout',
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 55.00,
        createdAt: daysAgo(14, 5),
        items: [
          { productId: p1.id, quantity: 5, price: p1.price },
          { productId: p2.id, quantity: 4, price: p2.price },
        ]
      },
      {
        customerName: 'Akosua Darko',
        customerEmail: 'akosua.d@outlook.com',
        customerPhone: '+233 27 667 8899',
        deliveryType: 'PICKUP' as const,
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 42.00,
        createdAt: daysAgo(13, 1),
        items: [{ productId: p3.id, quantity: 7, price: p3.price }]
      },
      {
        customerName: 'Joseph Kwarteng',
        customerEmail: 'j.kwarteng@gmail.com',
        customerPhone: '+233 24 990 1122',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Madina Zongo Junction',
        status: 'DELIVERED' as const,
        orderType: 'WHOLESALE' as const,
        totalAmount: 210.00,
        createdAt: daysAgo(12, 4),
        items: [
          { productId: p1.id, quantity: 25, price: p1.price },
          { productId: p3.id, quantity: 15, price: p3.price },
        ]
      },
      {
        customerName: 'Emelia Boadi',
        customerEmail: 'emelia.b@gmail.com',
        customerPhone: '+233 20 776 5544',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Labone Coffee Shop Road',
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 48.00,
        createdAt: daysAgo(11, 2),
        items: [{ productId: p2.id, quantity: 6, price: p2.price }]
      },
      {
        customerName: 'Francis Ofori',
        customerEmail: 'francis.o@gmail.com',
        customerPhone: '+233 54 887 6655',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Achimota Mile 7',
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 70.00,
        createdAt: daysAgo(10, 3),
        items: [
          { productId: p1.id, quantity: 8, price: p1.price },
          { productId: p4.id, quantity: 4, price: p4.price },
        ]
      },
      {
        customerName: 'Mercy Quaye',
        customerEmail: 'mercy.q@yahoo.com',
        customerPhone: '+233 24 332 1199',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Roman Ridge Shopping arcade',
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 58.00,
        createdAt: daysAgo(9, 2),
        items: [{ productId: p1.id, quantity: 6, price: p1.price }]
      },
      {
        customerName: 'Michael Arthur',
        customerEmail: 'michael.a@gmail.com',
        customerPhone: '+233 50 119 4433',
        deliveryType: 'PICKUP' as const,
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 36.00,
        createdAt: daysAgo(8, 4),
        items: [{ productId: p2.id, quantity: 4, price: p2.price }]
      },
      {
        customerName: 'Beatrice Agyeman',
        customerEmail: 'beatrice.a@gmail.com',
        customerPhone: '+233 27 889 0011',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'East Legon Hills, Phase 2',
        status: 'DELIVERED' as const,
        orderType: 'WHOLESALE' as const,
        totalAmount: 145.00,
        createdAt: daysAgo(7, 6),
        items: [
          { productId: p1.id, quantity: 15, price: p1.price },
          { productId: p5.id, quantity: 12, price: p5.price },
        ]
      },
      {
        customerName: 'Richmond Tetteh',
        customerEmail: 'richmond.t@outlook.com',
        customerPhone: '+233 26 554 3322',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Haatso Supermarket Rd',
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 44.00,
        createdAt: daysAgo(6, 1),
        items: [{ productId: p4.id, quantity: 6, price: p4.price }]
      },
      {
        customerName: 'Victoria Lamptey',
        customerEmail: 'victoria.l@gmail.com',
        customerPhone: '+233 24 667 9900',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Ridge Medical Center area',
        status: 'DELIVERED' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 50.00,
        createdAt: daysAgo(5, 5),
        items: [
          { productId: p2.id, quantity: 5, price: p2.price },
          { productId: p3.id, quantity: 3, price: p3.price },
        ]
      },
      {
        customerName: 'Patrick Asare',
        customerEmail: 'patrick.a@gmail.com',
        customerPhone: '+233 55 998 7766',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Osu Oxford Street Near Danquah Circle',
        status: 'READY' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 62.00,
        createdAt: daysAgo(4, 2),
        items: [
          { productId: p1.id, quantity: 6, price: p1.price },
          { productId: p2.id, quantity: 4, price: p2.price },
        ]
      },
      {
        customerName: 'Doris Badu',
        customerEmail: 'doris.badu@yahoo.com',
        customerPhone: '+233 20 112 4499',
        deliveryType: 'PICKUP' as const,
        status: 'READY' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 32.00,
        createdAt: daysAgo(3, 4),
        items: [{ productId: p3.id, quantity: 5, price: p3.price }]
      },
      {
        customerName: 'Gideon Baah',
        customerEmail: 'gideon.baah@gmail.com',
        customerPhone: '+233 24 445 6677',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'North Legon, close to Wisconsin',
        status: 'PREPARING' as const,
        orderType: 'WHOLESALE' as const,
        totalAmount: 160.00,
        createdAt: daysAgo(2, 3),
        items: [
          { productId: p1.id, quantity: 20, price: p1.price },
          { productId: p2.id, quantity: 10, price: p2.price },
        ]
      },
      {
        customerName: 'Gladys Owusu',
        customerEmail: 'gladys.o@gmail.com',
        customerPhone: '+233 54 332 5566',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Airport Hills Estate',
        status: 'PREPARING' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 75.00,
        createdAt: daysAgo(1, 1),
        items: [
          { productId: p1.id, quantity: 8, price: p1.price },
          { productId: p4.id, quantity: 5, price: p4.price },
        ]
      },
      {
        customerName: 'Cynthia Kusi',
        customerEmail: 'cynthia.k@gmail.com',
        customerPhone: '+233 27 990 4433',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Cantonments, 4th Circular Rd',
        status: 'PENDING' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 48.00,
        createdAt: daysAgo(0, 2),
        items: [
          { productId: p1.id, quantity: 4, price: p1.price },
          { productId: p3.id, quantity: 4, price: p3.price },
        ]
      },
      {
        customerName: 'Bright Agyei',
        customerEmail: 'bright.agyei@gmail.com',
        customerPhone: '+233 50 882 1144',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'Spintex Road, Batsonaa',
        status: 'PENDING' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 58.00,
        createdAt: daysAgo(0, 1),
        items: [
          { productId: p2.id, quantity: 6, price: p2.price },
          { productId: p5.id, quantity: 4, price: p5.price },
        ]
      }
    ]

    // Clear old sample orders so we don't duplicate on re-seed
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()

    for (const ord of sampleOrders) {
      const { items, ...orderData } = ord
      await prisma.order.create({
        data: {
          ...orderData,
          items: {
            create: items
          }
        }
      })
    }
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
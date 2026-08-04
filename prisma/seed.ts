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

  for (const pastry of pastries) {
    await prisma.product.create({
      data: {
        ...pastry,
        ingredients: JSON.stringify(pastry.ingredients),
      }
    })
  }

  // Fetch created products to attach to sample orders
  const createdProducts = await prisma.product.findMany()
  if (createdProducts.length > 0) {
    const p1 = createdProducts[0]
    const p2 = createdProducts[1] || p1
    const p3 = createdProducts[2] || p1

    const sampleOrders = [
      {
        customerName: 'Kofi Mensah',
        customerEmail: 'kofi.mensah@gmail.com',
        customerPhone: '+233 24 123 4567',
        deliveryType: 'DELIVERY' as const,
        deliveryAddress: 'House 14, Boundary Road, East Legon, Accra',
        status: 'PENDING' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 45.00,
        customerNote: 'Ring bell on gate, leave with security if unavailable.',
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
        status: 'PENDING' as const,
        orderType: 'WHOLESALE' as const,
        totalAmount: 120.00,
        customerNote: 'Corporate event order for 2 PM.',
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
        status: 'PREPARING' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 35.50,
        customerNote: 'Please deliver warm before 11 AM.',
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
        status: 'PENDING' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 28.00,
        customerNote: 'Call on arrival.',
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
        status: 'READY' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 52.00,
        customerNote: 'Rider should contact reception.',
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
        status: 'PENDING' as const,
        orderType: 'RETAIL' as const,
        totalAmount: 64.00,
        customerNote: 'Close to East Legon cluster.',
        items: [
          { productId: p3.id, quantity: 6, price: p3.price },
        ]
      }
    ]

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
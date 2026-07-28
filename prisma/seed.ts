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
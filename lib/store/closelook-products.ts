/**
 * Closelook Products Catalog
 * Local product data for chatbot recommendations and product access
 * This file is used by the chatbot to access product information for recommendations
 */

export interface Product {
  id: string;
  name: string;
  category: string;
  type: string;
  color: string;
  price: number; // in dollars
  sizes?: string[];
  images: string[];
  description: string;
}

export const demoProducts: Product[] = [
  {
    id: "nike-vomero-plus",
    name: "Nike Vomero Premium",
    category: "Footwear",
    type: "Running Shoes",
    color: "Multi-Color",
    price: 180,
    sizes: ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12"],
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/NIKE%2BVOMERO%2BPREMIUM-ZB4dAUa5vsWVxpkZk7kigzZ381RZyi.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/NIKE%2BVOMERO%2BPREMIUM%20%282%29-wGqpO6a7GpkH08l5NKfuIBMC3Ry6zG.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/NIKE%2BVOMERO%2BPREMIUM%20%281%29-DnKUwKB0rDOf3Tonu9tjOu5lsCP6DR.avif",
    ],
    description:
      "Elevate your running experience with the Nike Vomero Premium, a cutting-edge performance running shoe engineered for serious athletes and dedicated runners. These premium running sneakers feature revolutionary ZoomX foam technology that delivers exceptional energy return and responsive cushioning with every stride. The lightweight construction ensures you won't feel weighed down during long-distance runs, while the advanced midsole provides superior shock absorption to protect your joints during high-impact training sessions. Perfect for marathon training, daily jogs, and intense workout routines, these multi-color running shoes combine style with functionality. The breathable upper material keeps your feet cool and dry, while the durable outsole offers excellent traction on various surfaces. Whether you're training for your first 5K or preparing for an ultramarathon, the Nike Vomero Premium running shoes provide the comfort, support, and performance you need to achieve your fitness goals. Experience the perfect blend of Nike's innovative technology and premium craftsmanship in every step.",
  },
  {
    id: "nike-legend-cleats",
    name: "Nike Legend 10 Club FG/MG",
    category: "Footwear",
    type: "Soccer Cleats",
    color: "Black/White",
    price: 65,
    sizes: ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12"],
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LEGEND%2B10%2BCLUB%2BFG_MG-WJ9uOUlBlvDydtr3thUMG00qAPllAO.avif",
      "/placeholder.svg?height=800&width=800",
      "/placeholder.svg?height=800&width=800",
    ],
    description:
      "Dominate the pitch with the Nike Legend 10 Club FG/MG soccer cleats, expertly crafted for players who demand versatility and precision on the field. These professional-grade soccer cleats are designed to perform flawlessly on both firm ground (FG) and multi-ground (MG) surfaces, making them the perfect choice for players who train and compete on various field conditions. The innovative textured upper provides exceptional ball control, allowing you to trap, dribble, and pass with confidence and accuracy. The lightweight construction ensures quick movements and agile footwork, while the strategically placed studs offer optimal traction and stability during sharp cuts and sprints. The black and white colorway delivers a classic, timeless look that matches any team uniform. Whether you're playing in competitive leagues, training with your club, or practicing your skills, these Nike Legend cleats deliver the performance and durability serious soccer players need. Built with Nike's commitment to quality and innovation, these soccer cleats are engineered to help you elevate your game and perform at your best when it matters most.",
  },
  {
    id: "nike-winter-jacket",
    name: "Nike Club Seasonal Winter Jacket",
    category: "Clothing",
    type: "Jacket",
    color: "Black",
    price: 120,
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AS%2BM%2BNK%2BCLUB%2BSSNL%2BWINTER%2BJKT%2BM-Om57ijtIm8l3v5LItMGXeSWgxVB17R.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AS%2BM%2BNK%2BCLUB%2BSSNL%2BWINTER%2BJKT%2BM-ZI8CkhJd56G85Ju62GmvUkiln3TV93.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AS%2BM%2BNK%2BCLUB%2BSSNL%2BWINTER%2BJKT%2BM%20%281%29-vzJLXtOl9juFOE4mZiPp1jjRS6YPku.avif",
    ],
    description:
      "Conquer the coldest months with the Nike Club Seasonal Winter Jacket, your ultimate defense against harsh winter weather. This premium insulated winter jacket combines style and functionality to keep you warm, dry, and comfortable in even the most challenging conditions. The advanced insulation technology traps body heat while remaining breathable, ensuring you stay cozy without overheating during active pursuits. The water-resistant fabric construction provides reliable protection against rain, snow, and wind, making this jacket perfect for outdoor activities, winter sports, and everyday wear during the colder seasons. The adjustable hood offers customizable coverage and protection for your head and neck, while the full-zip front closure allows for easy layering and temperature regulation. Thoughtfully designed with multiple pockets for secure storage of your essentials, this black winter jacket seamlessly transitions from athletic training to casual wear. Whether you're hitting the slopes, going for a winter run, or simply navigating your daily routine in cold weather, the Nike Club Seasonal Winter Jacket delivers the warmth, protection, and performance you need to stay active and comfortable all season long.",
  },
  {
    id: "nike-challenger-shorts",
    name: "Nike Dri-FIT Challenger Shorts",
    category: "Clothing",
    type: "Shorts",
    color: "Black",
    price: 45,
    sizes: ["S", "M", "L", "XL"],
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AS%2BM%2BNK%2BDF%2BCHALLENGER%2B5BF%2BSHO-1LDQZwOnraiXjxNGfmmkmrjoLqElSH.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AS%2BM%2BNK%2BDF%2BCHALLENGER%2B5BF%2BSHO%20%281%29-BnzY6kD1eHtykI254qcR36D0EbvyIc.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AS%2BM%2BNK%2BDF%2BCHALLENGER%2B5BF%2BSHO-so5IiPV8iC2ZBsBq7JTtARMB9Ld6wt.avif",
    ],
    description:
      "Maximize your athletic performance with the Nike Dri-FIT Challenger Shorts, engineered for serious athletes who refuse to compromise on comfort and functionality. These premium running shorts feature Nike's revolutionary Dri-FIT technology, which actively wicks moisture away from your skin to keep you cool, dry, and comfortable throughout even the most intense workouts. The built-in compression brief provides essential support and eliminates the need for additional undergarments, while the lightweight, breathable fabric ensures unrestricted movement during sprints, jumps, and dynamic exercises. Perfect for running, training, cross-training, and high-intensity interval workouts, these black athletic shorts are designed to move with your body, not against it. The 5-inch inseam offers optimal coverage and freedom of movement, while the elastic waistband with drawstring ensures a secure, customized fit. Whether you're logging miles on the track, crushing a HIIT session, or pushing through a challenging strength training workout, the Nike Dri-FIT Challenger Shorts deliver the performance, comfort, and durability you need to perform at your peak. Experience the difference that premium athletic apparel makes in your training routine.",
  },
  {
    id: "brooklyn-hockey-jersey",
    name: "Brooklyn Collegiate Hockey Jersey",
    category: "Clothing",
    type: "Jersey",
    color: "White/Black",
    price: 85,
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/M%2BJ%2BBRK%2BCLGTE%2BHOCKEY%2BJSY-VkWGvUy7vtHhUmMhZs43hYxdTWramI.avif",
      "/placeholder.svg?height=800&width=800",
      "/placeholder.svg?height=800&width=800",
    ],
    description:
      "Show your team pride and represent Brooklyn Collegiate with this authentic hockey jersey, designed for both on-ice performance and passionate fan support. This premium hockey jersey features the official Brooklyn Collegiate branding and colors, making it the perfect choice for players, alumni, and dedicated fans who want to display their team spirit with style. The durable construction is built to withstand the rigors of competitive play, with reinforced stitching in high-stress areas and moisture-wicking fabric that keeps you comfortable during intense games. The classic white and black color scheme delivers a timeless, professional appearance that looks great both on the ice and in the stands. Whether you're lacing up your skates for a game, cheering from the bleachers, or collecting memorabilia, this authentic hockey jersey offers the quality and authenticity you expect from official team apparel. The breathable material ensures optimal comfort during physical activity, while the roomy fit allows for easy layering over protective equipment. Perfect for players, coaches, and fans alike, this Brooklyn Collegiate hockey jersey is a must-have for anyone who bleeds team colors.",
  },
  {
    id: "michael-kors-handbag",
    name: "Michael Kors Signature Tote",
    category: "Accessories",
    type: "Handbag",
    color: "Brown/Tan",
    price: 298,
    sizes: undefined,
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/30T0GNXT1B-1335_1-4Wn9F6XpKSZk4vJrW9QuHg8AK09TtR.jpeg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/30T0GNXT1B-1335_4-299m3DijXHdWEqFmuammarK35DUYE3.jpeg",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/30T0GNXT1B-1335_2-rnDiWjrWiyf7TZ9fNMCyR4LpVHRV5w.jpeg",
    ],
    description:
      "Make a sophisticated statement with the Michael Kors Signature Tote, an iconic handbag that embodies luxury, functionality, and timeless elegance. This exquisite tote bag showcases the legendary MK monogram pattern, instantly recognizable as a symbol of refined style and premium craftsmanship. Meticulously crafted with premium leather trim that adds durability and sophistication, this designer handbag features elegant gold-tone hardware that complements the rich brown and tan color palette. The removable tassel charm adds a touch of playful elegance, allowing you to customize your look while maintaining the bag's signature aesthetic. Inside, you'll discover a spacious interior with luxurious quilted lining that provides both protection for your belongings and an elevated sense of luxury. Perfect for the modern professional, busy mom, or fashion-forward individual, this Michael Kors tote effortlessly transitions from boardroom meetings to weekend brunches. The generous size accommodates all your everyday essentials, including laptops, tablets, makeup, documents, and more, while maintaining a sleek, polished appearance. Whether you're commuting to work, traveling, or running errands, this signature tote bag combines practicality with high-end fashion, making it an essential addition to any sophisticated wardrobe. Invest in a piece that will serve you for years to come while elevating every outfit with its unmistakable designer appeal.",
  },
  {
    id: "luxury-chronograph-watch",
    name: "Premium Chronograph Watch",
    category: "Accessories",
    type: "Watch",
    color: "Silver/Gold",
    price: 8500,
    sizes: undefined,
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-q5XsSMUCa0bEWJrnH4glY4baL0GWjF.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%20%282%29-rHpxAIVuLW7PUNSQeQ7IIk9fyc3hs8.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%20%281%29-h1FzrrbNrfhTR26R4EDqboxux52pLZ.avif",
    ],
    description:
      "Elevate your timepiece collection with this Premium Chronograph Watch, a masterpiece of horological engineering that combines Swiss precision with sophisticated design. This luxury automatic chronograph watch features a meticulously crafted Swiss movement that delivers exceptional accuracy and reliability, ensuring your watch keeps perfect time for years to come. The premium stainless steel case provides robust protection for the intricate mechanical movement within, while the scratch-resistant sapphire crystal offers crystal-clear visibility and superior durability compared to standard mineral glass. The elegant bracelet, also crafted from high-quality stainless steel, provides a comfortable, secure fit that complements both formal and casual attire. The sophisticated silver and gold color combination creates a versatile timepiece that transitions seamlessly from business meetings to evening events. The chronograph function allows you to measure elapsed time with precision, making it ideal for timing presentations, workouts, or any activity that requires accurate timekeeping. With its water-resistant design, this premium watch can handle everyday exposure to moisture, making it suitable for the active professional lifestyle. Whether you're closing important deals, attending formal events, or simply appreciating fine craftsmanship, this luxury chronograph watch makes a powerful statement about your appreciation for quality, precision, and timeless elegance. A true investment piece that will be treasured for generations.",
  },
  {
    id: "lv-clash-sunglasses",
    name: "Louis Vuitton LV Clash Square Sunglasses",
    category: "Accessories",
    type: "Sunglasses",
    color: "Black/Gold",
    price: 640,
    sizes: undefined,
    images: [
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/louis-vuitton-lv-clash-square-sunglasses--Z1579E_PM2_Front%20view-GutDaKLe7pS5NVHBlhIzP4WeA2D0VU.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/louis-vuitton-lv-clash-square-sunglasses--Z1579E_PM1_Worn%20view-PulpBx5hUV8fLnINukiMg8XxaGKQiN.avif",
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/louis-vuitton-lv-clash-square-sunglasses--Z1579E_PM1_Detail%20view-x4g4tvSeidGRY6bss3y3jyF8zvx8QN.avif",
    ],
    description:
      "Embrace bold, contemporary style with the Louis Vuitton LV Clash Square Sunglasses, a striking accessory from one of the world's most prestigious luxury fashion houses. These designer sunglasses from the exclusive LV Clash collection showcase Louis Vuitton's commitment to innovative design and uncompromising quality. The distinctive square frame shape delivers a modern, fashion-forward aesthetic that stands out from conventional eyewear, while the oversized silhouette provides maximum coverage and a dramatic, statement-making look. The iconic gold-tone LV monogram hardware elegantly adorns the temples, serving as a subtle yet unmistakable symbol of luxury and sophistication. The gradient lenses not only add visual depth and style but also provide essential 100% UV protection, shielding your eyes from harmful UVA and UVB rays that can cause long-term damage. Whether you're strolling through the city, enjoying a beach vacation, or attending high-profile events, these premium sunglasses combine eye protection with high-fashion appeal. The black and gold color combination creates a versatile, timeless look that complements a wide range of outfits and occasions. Crafted with the meticulous attention to detail that Louis Vuitton is renowned for, these luxury sunglasses represent an investment in both style and eye health. Perfect for fashion enthusiasts, celebrities, and anyone who appreciates the finest in designer accessories, the LV Clash Square Sunglasses are more than just eyewear—they're a statement piece that elevates your entire look.",
  },
];

export function getProductById(id: string): Product | undefined {
  return demoProducts.find((p) => p.id === id);
}

export function getProductsByCategory(category: string): Product[] {
  return demoProducts.filter((p) => p.category === category);
}

export function getAllProducts(): Product[] {
  return demoProducts;
}


export type DestinationInfo = {
  heroImage?: string;
  overviewDescription?: string;
  galleryTitle?: string;
  gallerySubtitle?: string;
  bestTime?: {
    label: string;
    text: string;
  }[];
  travelTips?: {
    label: string;
    text: string;
  }[];
  localKnowledge?: {
    label: string;
    text: string;
  }[];
  featuredRegions?: {
    label?: string;
    title?: string;
    name?: string;
    query: string;
    slug?: string;
    // Use only trusted local photos. Omit for premium text-only region cards.
    image?: string;
    description?: string;
    courseCount?: number;
    queryAliases?: string[];
    featuredCourseSelectors?: {
      query: string;
      badge?: string;
      reason?: string;
    }[];
  }[];
  featuredCourseSelectors?: {
    query: string;
    badge?: string;
    reason?: string;
    region?: string;
  }[];
  highlights?: {
    label: string;
    query: string;
  }[];
  galleryImages?: {
    src: string;
    alt: string;
    caption?: string;
  }[];
  communityTips?: {
    title: string;
    body: string;
    author?: string;
    category?: string;
  }[];
};

export const DESTINATION_INFO: Record<string, DestinationInfo> = {
  thailand: {
    // Local AI-generated destination-level visual; not assigned to a specific region or course.
    heroImage: "/destinations/thailand/thailand-golf-destination.jpg",
    overviewDescription:
      "Thailand blends tropical resort golf, city-access clubs, beach regions, mountain escapes, and warm hospitality into one of Asia's most complete golf travel experiences.",
    galleryTitle: "Thailand Gallery",
    gallerySubtitle:
      "A destination-level visual preview of tropical fairways, resort golf atmosphere, and warm-weather travel.",
    galleryImages: [
      {
        src: "/destinations/thailand/thailand-golf-destination.jpg",
        alt: "Thailand destination-level golf travel visual",
        caption: "Fairwayd destination visual - not a specific course.",
      },
    ],
    bestTime: [
      {
        label: "Nov – Feb",
        text: "Cool & dry season – best overall golf conditions",
      },
      {
        label: "Mar – May",
        text: "Hot season – very warm, early tee times recommended",
      },
      {
        label: "Jun – Oct",
        text: "Rainy season – tropical showers but still playable",
      },
      {
        label: "Year-round",
        text: "Thailand is a true year-round golf destination",
      },
    ],
    highlights: [
      {
        label: "Bangkok golf resorts and city access",
        query: "Bangkok",
      },
      {
        label: "Chon Buri / Pattaya premium golf region",
        query: "Pattaya",
      },
      {
        label: "Phuket island golf experience",
        query: "Phuket",
      },
      {
        label: "Hua Hin beach golf atmosphere",
        query: "Hua Hin",
      },
      {
        label: "Chiang Mai mountain scenery",
        query: "Chiang Mai",
      },
    ],
    travelTips: [
      {
        label: "Tee times",
        text: "Book morning rounds to avoid afternoon heat and traffic.",
      },
      {
        label: "Transfers",
        text: "Plan extra time between Bangkok, Pattaya, Hua Hin, and airport routes.",
      },
      {
        label: "Weather",
        text: "Carry light rain gear during green season; showers are often short.",
      },
    ],
    localKnowledge: [
      {
        label: "Caddies",
        text: "Caddies are common and are part of the golf experience.",
      },
      {
        label: "Hydration",
        text: "Humidity can be high, so hydrate before and during the round.",
      },
    ],
    featuredCourseSelectors: [
      {
        query: "Black Mountain Golf Club",
        badge: "Resort Pick",
        region: "Hua Hin",
        reason: "Iconic Thailand golf with mountain views and resort feel.",
      },
      {
        query: "Siam Country Club (Old Course)",
        badge: "Premium Club",
        region: "Pattaya",
        reason: "One of Thailand's most recognised golf destinations.",
      },
      {
        query: "Red Mountain Golf Club",
        badge: "Island Golf",
        region: "Phuket",
        reason: "Dramatic Phuket golf carved through former tin-mine terrain.",
      },
    ],
    featuredRegions: [
      {
        title: "Hua Hin",
        query: "Hua Hin",
        slug: "hua-hin",
        // Verified regional travel image: Hua Hin coastline and resort skyline.
        image: "/destinations/regions/thailand-hua-hin-hotels.jpg",
        description:
          "Beach golf destination with relaxed resort rhythm and easy multi-round stays.",
        queryAliases: [
          "Hua Hin",
          "Cha-am",
          "Phetchaburi",
          "Prachuap Khiri Khan",
        ],
        featuredCourseSelectors: [
          {
            query: "Black Mountain Golf Club",
            badge: "Resort Pick",
            reason: "Signature Hua Hin golf with mountain views and resort energy.",
          },
          {
            query: "Pineapple Valley Golf Club (ex Banyan)",
            badge: "Scenic Pick",
            reason: "Former Banyan hillside golf with a relaxed coastal-base feel.",
          },
        ],
      },
      {
        title: "Pattaya",
        query: "Pattaya",
        slug: "pattaya",
        image: "/destinations/regions/thailand-pattaya.jpg",
        description:
          "Thailand's golf capital, with dense course choice near the coast.",
        queryAliases: [
          "Pattaya",
          "Chonburi",
          "Bang Lamung",
          "Si Racha",
          "Sattahip",
          "Rayong",
        ],
        featuredCourseSelectors: [
          {
            query: "Siam Country Club (Old Course)",
            badge: "Premium Club",
            reason: "A recognised Pattaya flagship with major-event pedigree.",
          },
          {
            query: "Chee Chan Golf Resort",
            badge: "Signature Pick",
            reason: "A distinctive Pattaya-area course set below the Khao Chi Chan hillside.",
          },
          {
            query: "Laem Chabang International",
            badge: "Resort Pick",
            reason: "Large-scale Chonburi golf with a classic destination feel.",
          },
          {
            query: "Siam Country Club (Rolling Hills)",
            badge: "Premium Club",
            reason: "A newer Siam Country Club destination course in the Pattaya golf corridor.",
          },
        ],
      },
      {
        title: "Phuket",
        query: "Phuket",
        slug: "phuket",
        // Verified regional travel image: Phuket coast and Andaman Sea.
        image: "/destinations/regions/thailand-phuket-aerial.jpg",
        description:
          "Island golf experience pairing resort rounds with beach and sea air.",
        queryAliases: ["Phuket", "Phang Nga"],
        featuredCourseSelectors: [
          {
            query: "Red Mountain Golf Club",
            badge: "Island Golf",
            reason: "Dramatic Phuket golf carved through former tin-mine terrain.",
          },
          {
            query: "Blue Canyon Country Club (Canyon)",
            badge: "Classic Pick",
            reason: "One of Phuket's best-known club settings near the island gateway.",
          },
        ],
      },
      {
        title: "Chiang Mai",
        query: "Chiang Mai",
        slug: "chiang-mai",
        image: "/destinations/regions/thailand-chiang-mai.jpg",
        description:
          "Mountain golf with cooler mornings, northern culture, and scenic backdrops.",
        queryAliases: ["Chiang Mai", "Lamphun"],
        featuredCourseSelectors: [
          {
            query: "Alpine Golf Resort Chiang Mai",
            badge: "Resort Pick",
            reason: "Northern resort golf with mountain air and destination scale.",
          },
          {
            query: "Chiang Mai Highlands Golf Resort",
            badge: "Scenic Pick",
            reason: "A strong mountain-region pick for a dedicated Chiang Mai golf stay.",
          },
        ],
      },
      {
        title: "Bangkok",
        query: "Bangkok",
        slug: "bangkok",
        image: "/destinations/regions/thailand-bangkok.jpg",
        description:
          "City golf base with premium clubs, easy airport access, and strong nightlife.",
        queryAliases: [
          "Bangkok",
          "Pathum Thani",
          "Samut Prakan",
          "Nakhon Pathom",
          "Nonthaburi",
          "Ayutthaya",
        ],
        featuredCourseSelectors: [
          {
            query: "Thai Country Club",
            badge: "Premium Club",
            reason: "A benchmark Bangkok-area private club for premium golf trips.",
          },
          {
            query: "Alpine Golf & Sports Club",
            badge: "Championship Pick",
            reason: "One of the strongest city-access tests in the Bangkok area.",
          },
          {
            query: "Amata Spring Country Club",
            badge: "Premium Club",
            reason: "A high-profile Bangkok-area club with elite tournament feel.",
          },
          {
            query: "Nikanti Golf Club",
            badge: "Modern Pick",
            reason: "A polished visitor-friendly option with a distinctive routing concept.",
          },
        ],
      },
      {
        title: "Khao Yai",
        query: "Khao Yai",
        slug: "khao-yai",
        image: "/destinations/regions/thailand-khao-yai.jpg",
        description:
          "Mountain golf, national park scenery, and cooler resort stays.",
        queryAliases: ["Khao Yai", "Nakhon Ratchasima", "Pak Chong"],
        featuredCourseSelectors: [
          {
            query: "Toscana Valley Country Club",
            badge: "Resort Pick",
            reason: "A signature Khao Yai resort setting with mountain scenery.",
          },
          {
            query: "Rancho Charnvee Resort & Country Club",
            badge: "Resort Pick",
            reason: "A relaxed Pak Chong resort base for cooler Khao Yai golf.",
          },
        ],
      },
    ],
  },

  vietnam: {
    heroImage: "/destinations/vietnam/vietnam-hero.jpg",
    overviewDescription:
      "Vietnam pairs coastal resort golf, city bases, northern culture, and limestone-bay scenery into a fast-growing Southeast Asian golf trip.",
    galleryTitle: "Vietnam Gallery",
    gallerySubtitle:
      "A travel preview of Vietnam's coast, cities, lakes, and bay scenery.",
    galleryImages: [
      {
        src: "/destinations/vietnam/vietnam-hero.jpg",
        alt: "Ha Long Bay limestone islands in Vietnam",
        caption: "Ha Long Bay travel scenery - destination-level visual.",
      },
    ],
    bestTime: [
      {
        label: "Nov – Apr",
        text: "Dry season – best for central & southern regions",
      },
      {
        label: "May – Oct",
        text: "Rainy season – still playable, short heavy showers",
      },
      {
        label: "North (Hanoi)",
        text: "Cool winters, hot summers – seasonal variation",
      },
    ],
    highlights: [
      {
        label: "Da Nang luxury golf coast",
        query: "Da Nang",
      },
      {
        label: "Ho Chi Minh City golf access",
        query: "Ho Chi Minh",
      },
      {
        label: "Hanoi and northern golf mix",
        query: "Hanoi",
      },
      {
        label: "Fast-growing premium golf scene",
        query: "Vietnam",
      },
    ],
    travelTips: [
      {
        label: "Regions",
        text: "Da Nang and Ho Chi Minh City work well as separate golf bases.",
      },
      {
        label: "Timing",
        text: "Check regional weather because north, central, and south differ.",
      },
    ],
    localKnowledge: [
      {
        label: "Golf coast",
        text: "Central Vietnam has a strong resort-golf corridor near Da Nang.",
      },
      {
        label: "Transfers",
        text: "Use arranged transfers for easier course access outside cities.",
      },
    ],
    featuredRegions: [
      {
        title: "Da Nang",
        query: "Da Nang",
        slug: "da-nang",
        image: "/destinations/regions/vietnam-da-nang.jpg",
        description:
          "Central coast base with beaches, resort stays, and easy access to the golf corridor.",
        queryAliases: ["Da Nang", "Danang", "Hoi An", "Dien Ban", "Hue"],
      },
      {
        title: "Ho Chi Minh City",
        query: "Ho Chi Minh",
        slug: "ho-chi-minh-city",
        image: "/destinations/regions/vietnam-ho-chi-minh-city.jpg",
        description:
          "Urban golf access, skyline stays, and southern Vietnam energy between rounds.",
        queryAliases: [
          "Ho Chi Minh",
          "Saigon",
          "Binh Duong",
          "Nhon Trach",
          "Vung Tau",
        ],
      },
      {
        title: "Hanoi",
        query: "Hanoi",
        slug: "hanoi",
        image: "/destinations/regions/vietnam-hanoi.jpg",
        description:
          "Northern city culture, lake scenery, and golf trips with cooler seasonal contrast.",
        queryAliases: [
          "Hanoi",
          "Vinh Phuc",
          "Hai Duong",
          "Hoa Binh",
          "Ha Nam",
          "Bac Giang",
        ],
      },
      {
        title: "Ha Long Bay",
        query: "Ha Long",
        slug: "ha-long-bay",
        image: "/destinations/regions/vietnam-ha-long-bay.jpg",
        description:
          "Limestone bay scenery and coastal travel atmosphere for northern golf itineraries.",
        queryAliases: ["Ha Long", "Halong", "Quang Ninh"],
      },
    ],
  },

  portugal: {
    // Local AI-generated destination-level visual; not assigned to a specific region or course.
    heroImage: "/destinations/portugal/portugal-golf-destination.jpg",
    overviewDescription:
      "Portugal is a polished golf-travel classic, pairing Atlantic light, resort bases, coastal courses, city breaks, and year-round playability.",
    galleryTitle: "Portugal Gallery",
    gallerySubtitle:
      "A destination-level visual preview of Atlantic golf, coastal light, and resort-travel atmosphere.",
    galleryImages: [
      {
        src: "/destinations/portugal/portugal-golf-destination.jpg",
        alt: "Portugal destination-level golf travel visual",
        caption: "Fairwayd destination visual - not a specific course.",
      },
    ],
    bestTime: [
      {
        label: "Mar – Jun",
        text: "Perfect spring conditions – ideal golf weather",
      },
      {
        label: "Sep – Nov",
        text: "Best overall season – warm, less crowded",
      },
      {
        label: "Jul – Aug",
        text: "Hot & busy – peak tourist season",
      },
      {
        label: "Winter",
        text: "Still playable, especially Algarve",
      },
    ],
    highlights: [
      {
        label: "Algarve world-class resort golf",
        query: "Algarve",
      },
      {
        label: "Lisbon coast golf escapes",
        query: "Lisbon",
      },
      {
        label: "Mild winter golf climate",
        query: "Algarve",
      },
      {
        label: "Strong mix of resort and scenic courses",
        query: "Portugal",
      },
    ],
    travelTips: [
      {
        label: "Best base",
        text: "The Algarve is the easiest first golf base with many courses nearby.",
      },
      {
        label: "Car rental",
        text: "A rental car helps connect resort areas and inland courses.",
      },
    ],
    localKnowledge: [
      {
        label: "Shoulder season",
        text: "Spring and autumn offer strong conditions with calmer resort areas.",
      },
      {
        label: "Pace",
        text: "Popular resort courses can be busy, so early tee times help.",
      },
    ],
    featuredRegions: [
      {
        title: "Algarve",
        query: "Algarve",
        slug: "algarve",
        image: "/destinations/regions/portugal-algarve.jpg",
        description: "Portugal's classic golf coast with resort bases and year-round appeal.",
        queryAliases: [
          "Algarve",
          "Vilamoura",
          "Almancil",
          "Lagos",
          "Albufeira",
          "Tavira",
          "Portimão",
          "Portimao",
          "Carvoeiro",
          "Quinta do Lago",
        ],
      },
      {
        title: "Lisbon Coast",
        query: "Lisbon",
        slug: "lisbon-coast",
        // Verified regional travel image: Cabo da Roca coastline near Lisbon.
        image: "/destinations/regions/portugal-lisbon-cabo-da-roca.jpg",
        description: "City break and championship golf, with beaches and culture close by.",
        queryAliases: [
          "Lisbon",
          "Lisboa",
          "Cascais",
          "Estoril",
          "Sintra",
          "Belas",
          "Charneca da Caparica",
          "Turcifal",
          "Obidos",
          "Óbidos",
        ],
      },
      {
        title: "Porto & North",
        query: "Porto",
        slug: "porto-north",
        // Verified regional travel image: Douro valley wine landscape.
        image: "/destinations/regions/portugal-porto-north-douro.jpg",
        description: "Wine country, northern scenery, and quieter golf-trip rhythm.",
        queryAliases: [
          "Porto",
          "Norte",
          "Povoa de Varzim",
          "Póvoa de Varzim",
          "Ponte de Lima",
          "Vila Nova de Gaia",
          "Espinho",
          "Vidago",
        ],
      },
      {
        title: "Madeira",
        query: "Madeira",
        slug: "madeira",
        image: "/destinations/regions/portugal-madeira.jpg",
        description: "Atlantic island golf with dramatic views and resort-style stays.",
        queryAliases: ["Madeira", "Funchal", "Porto Santo", "Machico"],
      },
    ],
  },

  spain: {
    heroImage: "/destinations/spain/spain-hero.jpg",
    overviewDescription:
      "Spain blends winter-sun golf, Mediterranean coasts, city breaks, island escapes, and relaxed resort travel across several strong golf regions.",
    galleryTitle: "Spain Gallery",
    gallerySubtitle:
      "A visual preview of Spanish coast, culture, cities, and island travel.",
    galleryImages: [
      {
        src: "/destinations/spain/spain-hero.jpg",
        alt: "Sagrada Familia in Barcelona, Spain",
        caption: "Barcelona cultural travel scenery - destination-level visual.",
      },
    ],
    bestTime: [
      {
        label: "Spring",
        text: "Excellent golf weather across most regions",
      },
      {
        label: "Autumn",
        text: "Top conditions with fewer tourists",
      },
      {
        label: "Summer",
        text: "Very hot inland, better on coast",
      },
      {
        label: "Winter",
        text: "Best in southern regions like Costa del Sol",
      },
    ],
    highlights: [
      {
        label: "Costa del Sol golf concentration",
        query: "Costa del Sol",
      },
      {
        label: "Barcelona region golf trips",
        query: "Barcelona",
      },
      {
        label: "South coast winter golf",
        query: "Costa del Sol",
      },
      {
        label: "Great resort and city-break mix",
        query: "Spain",
      },
    ],
    travelTips: [
      {
        label: "Heat",
        text: "In summer, choose coastal courses or early tee times.",
      },
      {
        label: "Regions",
        text: "Costa del Sol is the simplest high-density golf base.",
      },
    ],
    localKnowledge: [
      {
        label: "South coast",
        text: "Southern Spain is a strong winter golf option.",
      },
      {
        label: "City breaks",
        text: "Barcelona and Madrid can pair golf with short urban stays.",
      },
    ],
    featuredRegions: [
      {
        title: "Costa del Sol",
        query: "Costa del Sol",
        slug: "costa-del-sol",
        image: "/destinations/regions/spain-costa-del-sol.jpg",
        description:
          "Spain's classic winter-sun golf coast with resort towns and marina energy.",
        queryAliases: [
          "Costa del Sol",
          "Marbella",
          "Estepona",
          "Mijas",
          "Málaga",
          "Malaga",
          "Sotogrande",
          "San Roque",
          "Benahavís",
          "Benalmádena",
          "Casares",
        ],
      },
      {
        title: "Barcelona & Catalonia",
        query: "Barcelona",
        slug: "barcelona-catalonia",
        image: "/destinations/regions/spain-barcelona.jpg",
        description:
          "City culture, Mediterranean stays, and golf access around Catalonia.",
        queryAliases: [
          "Barcelona",
          "Catalonia",
          "Catalunya",
          "Katalonien",
          "Girona",
          "Tarragona",
          "Platja d'Aro",
        ],
      },
      {
        title: "Madrid",
        query: "Madrid",
        slug: "madrid",
        image: "/destinations/regions/spain-madrid.jpg",
        description:
          "Capital-city golf base with urban energy, history, and inland course variety.",
        queryAliases: ["Madrid", "Alcobendas", "Algete"],
      },
      {
        title: "Mallorca",
        query: "Mallorca",
        slug: "mallorca",
        image: "/destinations/regions/spain-mallorca.jpg",
        description:
          "Island golf rhythm with coves, coast roads, resort stays, and sea air.",
        queryAliases: [
          "Mallorca",
          "Balearen",
          "Balearic",
          "Palma",
          "Llucmajor",
          "Santa Ponsa",
          "Pollença",
        ],
      },
    ],
  },

  turkey: {
    heroImage: "/destinations/turkey/turkey-hero.jpg",
    overviewDescription:
      "Turkey combines Belek resort golf, Mediterranean coastline, Istanbul culture, and dramatic interior landscapes into a strong value golf-travel destination.",
    galleryTitle: "Turkey Gallery",
    gallerySubtitle:
      "A visual preview of Turkish coast, culture, resort travel, and landscapes.",
    galleryImages: [
      {
        src: "/destinations/turkey/turkey-hero.jpg",
        alt: "Cappadocia landscape in Turkey",
        caption: "Cappadocia travel scenery - destination-level visual.",
      },
    ],
    bestTime: [
      {
        label: "Mar – May",
        text: "Perfect spring golf weather",
      },
      {
        label: "Sep – Nov",
        text: "Best season – warm & ideal conditions",
      },
      {
        label: "Summer",
        text: "Very hot – mostly early/late rounds",
      },
      {
        label: "Winter",
        text: "Playable in Belek region",
      },
    ],
    highlights: [
      {
        label: "Belek all-in-one golf resorts",
        query: "Belek",
      },
      {
        label: "Strong value for golf holidays",
        query: "Turkey",
      },
      {
        label: "Mediterranean climate and easy resort transfers",
        query: "Belek",
      },
      {
        label: "Popular training and group-trip destination",
        query: "Turkey",
      },
    ],
    travelTips: [
      {
        label: "Base",
        text: "Belek is the main golf hub with short resort transfers.",
      },
      {
        label: "Season",
        text: "Avoid peak summer heat unless you prefer very early rounds.",
      },
    ],
    localKnowledge: [
      {
        label: "Packages",
        text: "Many trips are built around resort and golf package stays.",
      },
      {
        label: "Groups",
        text: "Turkey works well for training camps and larger golf groups.",
      },
    ],
    featuredRegions: [
      {
        title: "Belek",
        query: "Belek",
        slug: "belek",
        image: "/destinations/regions/turkey-belek.jpg",
        description:
          "All-in-one Mediterranean resort golf with short transfers and warm-season stays.",
        queryAliases: ["Belek", "Antalya", "Serik", "Kadriye"],
      },
      {
        title: "Istanbul",
        query: "Istanbul",
        slug: "istanbul",
        image: "/destinations/regions/turkey-istanbul.jpg",
        description:
          "Culture-first city break with Bosphorus scenery and golf reachable from the city.",
      },
      {
        title: "Cappadocia",
        query: "Cappadocia",
        slug: "cappadocia",
        image: "/destinations/regions/turkey-cappadocia.jpg",
        description:
          "Iconic inland landscapes for pairing golf travel with a memorable add-on stay.",
      },
      {
        title: "Aegean Coast",
        query: "Izmir",
        slug: "aegean-coast",
        image: "/destinations/regions/turkey-aegean-coast.jpg",
        description:
          "Sea views, relaxed coastal towns, and a softer resort rhythm around Izmir.",
      },
    ],
  },

  "united-arab-emirates": {
    heroImage: "/destinations/united-arab-emirates/united-arab-emirates-hero.jpg",
    overviewDescription:
      "The United Arab Emirates offers polished winter golf, luxury city stays, desert scenery, championship venues, and easy high-service transfers.",
    galleryTitle: "United Arab Emirates Gallery",
    gallerySubtitle:
      "A visual preview of skyline stays, desert mountains, mosques, and oasis travel.",
    galleryImages: [
      {
        src: "/destinations/united-arab-emirates/united-arab-emirates-hero.jpg",
        alt: "Dubai skyline in the United Arab Emirates",
        caption: "Dubai skyline travel scenery - destination-level visual.",
      },
    ],
    bestTime: [
      {
        label: "Nov – Mar",
        text: "Perfect golf weather – peak season",
      },
      {
        label: "Apr – May",
        text: "Getting hot but still playable",
      },
      {
        label: "Jun – Sep",
        text: "Extremely hot – limited play",
      },
      {
        label: "Oct",
        text: "Season starts again",
      },
    ],
    highlights: [
      {
        label: "Dubai luxury golf experience",
        query: "Dubai",
      },
      {
        label: "Abu Dhabi championship venues",
        query: "Abu Dhabi",
      },
      {
        label: "Desert golf scenery",
        query: "Dubai",
      },
      {
        label: "High-end golf travel destination",
        query: "United Arab Emirates",
      },
    ],
    travelTips: [
      {
        label: "Heat",
        text: "Winter is peak golf season; summer rounds are limited by heat.",
      },
      {
        label: "Transport",
        text: "Taxis and ride services are usually the easiest course transfer option.",
      },
    ],
    localKnowledge: [
      {
        label: "Night golf",
        text: "Some venues offer evening or floodlit golf experiences.",
      },
      {
        label: "Premium venues",
        text: "Dubai and Abu Dhabi focus on high-service championship golf.",
      },
    ],
    featuredRegions: [
      {
        title: "Dubai",
        query: "Dubai",
        slug: "dubai",
        image: "/destinations/regions/united-arab-emirates-dubai.jpg",
        description:
          "Luxury skyline base with championship golf, resort hotels, and winter sun.",
      },
      {
        title: "Abu Dhabi",
        query: "Abu Dhabi",
        slug: "abu-dhabi",
        image: "/destinations/regions/united-arab-emirates-abu-dhabi.jpg",
        description:
          "Capital golf stays with cultural landmarks, premium service, and island resorts.",
      },
      {
        title: "Ras Al Khaimah",
        query: "Ras Al Khaimah",
        slug: "ras-al-khaimah",
        image: "/destinations/regions/united-arab-emirates-ras-al-khaimah.jpg",
        description:
          "Mountain and desert scenery with resort stays beyond the Dubai corridor.",
      },
      {
        title: "Al Ain",
        query: "Al Ain",
        slug: "al-ain",
        image: "/destinations/regions/united-arab-emirates-al-ain.jpg",
        description:
          "Oasis atmosphere, inland heritage, and a quieter contrast to the coast.",
      },
    ],
  },

  switzerland: {
    // Verified local golf photo from Crans-Montana, used at destination level and for Valais.
    heroImage: "/destinations/switzerland-crans-montana.jpg",
    overviewDescription:
      "Switzerland turns golf into a scenic alpine travel experience, with mountain air, lake regions, premium clubs, and a short but memorable summer season.",
    galleryTitle: "Switzerland Gallery",
    gallerySubtitle:
      "A verified local golf visual preview of alpine fairways and mountain scenery.",
    galleryImages: [
      {
        src: "/destinations/switzerland-crans-montana.jpg",
        alt: "Crans-Montana golf course in Valais, Switzerland",
        caption: "Verified local golf photo from Crans-Montana, Valais.",
      },
      {
        src: "/destinations/switzerland-crans-montana.png",
        alt: "Crans-Montana golf course in Valais, Switzerland",
        caption: "Verified local golf photo from Crans-Montana, Valais.",
      },
    ],
    bestTime: [
      {
        label: "May – Sep",
        text: "Main golf season – alpine courses open",
      },
      {
        label: "Jun – Aug",
        text: "Peak conditions – best weather",
      },
      {
        label: "Apr / Oct",
        text: "Limited play depending on region",
      },
      {
        label: "Winter",
        text: "Most courses closed - freezy",
      },
    ],
    highlights: [
      {
        label: "Alpine mountain golf scenery",
        query: "Switzerland",
      },
      {
        label: "High-quality but short peak season",
        query: "Switzerland",
      },
      {
        label: "Lake-region golf experiences",
        query: "Lake",
      },
      {
        label: "Premium courses with strong views",
        query: "Switzerland",
      },
    ],
    travelTips: [
      {
        label: "Season",
        text: "Check opening dates for alpine courses before planning a trip.",
      },
      {
        label: "Travel",
        text: "Public transport is strong, but a car helps for mountain courses.",
      },
    ],
    localKnowledge: [
      {
        label: "Altitude",
        text: "Mountain golf can mean cooler air and dramatic weather changes.",
      },
      {
        label: "Views",
        text: "Many Swiss rounds are as much about scenery as score.",
      },
    ],
    featuredRegions: [
      {
        title: "Valais",
        query: "Valais",
        slug: "valais",
        // Verified local asset: Crans-Montana golf is in Valais.
        image: "/destinations/switzerland-crans-montana.jpg",
        description: "Alpine golf with mountain views, sunny valleys, and resort stays.",
        queryAliases: [
          "Valais",
          "Wallis",
          "VS",
          "Crans-Montana",
          "Leuk",
          "Randa",
          "Sierre",
          "Sion",
        ],
      },
      {
        title: "Graubünden",
        query: "Graubünden",
        slug: "graubuenden",
        image: "/destinations/regions/switzerland-graubuenden.jpg",
        description: "Resort golf in the Alps with fresh air and high-country scenery.",
        queryAliases: [
          "Graubünden",
          "Graubuenden",
          "GraubÃ¼nden",
          "Grisons",
          "GR",
          "Engadin",
          "St. Moritz",
          "Davos",
          "Arosa",
          "Klosters",
          "Alvaneu",
          "Domat/Ems",
        ],
      },
      {
        title: "Lake Geneva",
        query: "Lake Geneva",
        slug: "lake-geneva",
        image: "/destinations/regions/switzerland-lake-geneva.jpg",
        description: "Classic Swiss golf with lakeside stays, vineyards, and polished clubs.",
        queryAliases: [
          "Lake Geneva",
          "Geneva",
          "Genève",
          "Vaud",
          "VD",
          "GE",
          "Lausanne",
          "Montreux",
          "Chéserex",
          "Epalinges",
        ],
      },
      {
        title: "Ticino",
        query: "Ticino",
        slug: "ticino",
        image: "/destinations/regions/switzerland-ticino.jpg",
        description: "Mediterranean golf feeling with palm-lined towns and mild southern air.",
        queryAliases: ["Ticino", "TI", "Lugano", "Locarno", "Ascona", "Magliaso"],
      },
    ],
  },

  germany: {
    heroImage: "/destinations/germany/germany-hero.jpg",
    overviewDescription:
      "Germany offers city-access golf, forest and parkland variety, polished club culture, and easy regional travel through strong transport links.",
    galleryTitle: "Germany Gallery",
    gallerySubtitle:
      "A visual preview of German cities, forests, northern waterways, and regional travel.",
    galleryImages: [
      {
        src: "/destinations/germany/germany-hero.jpg",
        alt: "Brandenburg Gate in Berlin, Germany",
        caption: "Berlin cultural travel scenery - destination-level visual.",
      },
    ],
    bestTime: [
      {
        label: "Apr – Jun",
        text: "Great spring golf conditions",
      },
      {
        label: "Sep – Oct",
        text: "Excellent autumn golf weather",
      },
      {
        label: "Summer",
        text: "Good but can be hot",
      },
      {
        label: "Winter",
        text: "Limited play",
      },
    ],
    highlights: [
      {
        label: "Large variety of parkland courses",
        query: "Germany",
      },
      {
        label: "Strong golf around Munich and Hamburg",
        query: "Munich",
      },
      {
        label: "Good domestic golf travel network",
        query: "Germany",
      },
      {
        label: "Solid value across many regions",
        query: "Germany",
      },
    ],
    travelTips: [
      {
        label: "Distances",
        text: "Plan by region because courses are spread across the country.",
      },
      {
        label: "Season",
        text: "Spring and autumn are often comfortable and less crowded.",
      },
    ],
    localKnowledge: [
      {
        label: "Club culture",
        text: "Many courses are traditional clubs with a local membership feel.",
      },
      {
        label: "Variety",
        text: "Expect parkland, forest, and resort layouts depending on region.",
      },
    ],
    featuredRegions: [
      {
        title: "Munich & Bavaria",
        query: "Munich",
        slug: "munich-bavaria",
        image: "/destinations/regions/germany-munich-bavaria.jpg",
        description:
          "Southern city base with alpine day-trip energy, traditional clubs, and resort access.",
        queryAliases: [
          "Munich",
          "München",
          "Bavaria",
          "Bayern",
          "Bad Griesbach",
          "Oberstaufen",
          "Bad Kissingen",
          "Dachau",
          "Wolfratshausen",
        ],
      },
      {
        title: "Hamburg & North",
        query: "Hamburg",
        slug: "hamburg-north",
        image: "/destinations/regions/germany-hamburg-north.jpg",
        description:
          "Northern waterways, port-city stays, and parkland golf with a polished club feel.",
        queryAliases: [
          "Hamburg",
          "HH",
          "Schleswig-Holstein",
          "Niedersachsen",
          "Lower Saxony",
          "SH",
          "NI",
          "Mecklenburg",
          "MV",
        ],
      },
      {
        title: "Black Forest",
        query: "Black Forest",
        slug: "black-forest",
        image: "/destinations/regions/germany-black-forest.jpg",
        description:
          "Forest scenery, spa towns, and quieter golf-trip pacing in southwest Germany.",
        queryAliases: [
          "Black Forest",
          "Schwarzwald",
          "Freiburg",
          "Baden-Baden",
          "Bad Bellingen",
          "Bad Liebenzell",
          "Kirchzarten",
        ],
      },
      {
        title: "Berlin & Brandenburg",
        query: "Berlin",
        slug: "berlin-brandenburg",
        image: "/destinations/regions/germany-berlin-brandenburg.jpg",
        description:
          "Capital culture, lakeside escapes, and golf access across Brandenburg.",
        queryAliases: ["Berlin", "Brandenburg", "BB", "Bad Saarow", "Potsdam"],
      },
    ],
  },

  austria: {
    heroImage: "/destinations/austria/austria-hero.jpg",
    overviewDescription:
      "Austria is a warm-season golf destination built around alpine valleys, lake regions, city culture, wellness stays, and compact scenic routes.",
    galleryTitle: "Austria Gallery",
    gallerySubtitle:
      "A visual preview of Austrian cities, lakes, mountains, and alpine travel.",
    galleryImages: [
      {
        src: "/destinations/austria/austria-hero.jpg",
        alt: "Vienna skyline across the Danube in Austria",
        caption: "Vienna city travel scenery - destination-level visual.",
      },
    ],
    bestTime: [
      {
        label: "May – Sep",
        text: "Best golf season, especially alpine regions",
      },
      {
        label: "Summer",
        text: "Peak conditions",
      },
      {
        label: "Spring / Autumn",
        text: "Shorter but nice seasons",
      },
      {
        label: "Winter",
        text: "Mostly closed",
      },
    ],
    highlights: [
      {
        label: "Alpine resort golf",
        query: "Austria",
      },
      {
        label: "Scenic mountain backdrops",
        query: "Austria",
      },
      {
        label: "Compact premium golf regions",
        query: "Austria",
      },
      {
        label: "Great summer golf escapes",
        query: "Austria",
      },
    ],
    travelTips: [
      {
        label: "Summer focus",
        text: "Austria works best as a warm-season mountain golf trip.",
      },
      {
        label: "Routes",
        text: "Combine courses by valley or resort region to keep transfers short.",
      },
    ],
    localKnowledge: [
      {
        label: "Alpine weather",
        text: "Mountain forecasts can shift quickly, especially late in the day.",
      },
      {
        label: "Resort golf",
        text: "Many courses pair well with wellness and outdoor travel.",
      },
    ],
    featuredRegions: [
      {
        title: "Tyrol",
        query: "Tyrol",
        slug: "tyrol",
        image: "/destinations/regions/austria-tyrol.jpg",
        description:
          "Alpine golf, mountain air, wellness stays, and high-scenery summer routes.",
        queryAliases: [
          "Tyrol",
          "Tirol",
          "Kitzbühel",
          "KitzbÃ¼hel",
          "Mieming",
          "Seefeld",
          "Pertisau",
          "Kössen",
          "KÃ¶ssen",
          "Innsbruck",
        ],
      },
      {
        title: "Salzburg",
        query: "Salzburg",
        slug: "salzburg",
        image: "/destinations/regions/austria-salzburg.jpg",
        description:
          "Historic city culture, nearby lakes, and alpine golf within easy touring distance.",
        queryAliases: ["Salzburg", "Salzburgerland", "Wals", "Mittersill", "Zell am See"],
      },
      {
        title: "Vienna",
        query: "Vienna",
        slug: "vienna",
        image: "/destinations/regions/austria-vienna.jpg",
        description:
          "Capital-city golf access with Danube views, culture, dining, and short-break appeal.",
        queryAliases: [
          "Vienna",
          "Wien",
          "NÖ",
          "NÃ–",
          "Lower Austria",
          "Niederösterreich",
          "NiederÃ¶sterreich",
          "Atzenbrugg",
          "Himberg",
          "Hainburg",
          "Oberwaltersdorf",
          "Schönborn",
        ],
      },
      {
        title: "Carinthia",
        query: "Carinthia",
        slug: "carinthia",
        image: "/destinations/regions/austria-carinthia.jpg",
        description:
          "Lake golf, southern Austrian warmth, and mountain backdrops for resort stays.",
        queryAliases: [
          "Carinthia",
          "Kärnten",
          "KÃ¤rnten",
          "Klagenfurt",
          "Wörthersee",
          "WÃ¶rthersee",
          "Moosburg",
          "Feldkirchen",
          "Bad Kleinkirchheim",
          "Eberndorf",
        ],
      },
    ],
  },

  france: {
    heroImage: "/destinations/france/france-hero.jpg",
    overviewDescription:
      "France pairs classic clubs and resort golf with Paris access, Riviera sun, wine regions, chateaux, and strong food-led travel.",
    galleryTitle: "France Gallery",
    gallerySubtitle:
      "A visual preview of French city, coast, wine, and chateau travel.",
    galleryImages: [
      {
        src: "/destinations/france/france-hero.jpg",
        alt: "Eiffel Tower in Paris, France",
        caption: "Paris travel scenery - destination-level visual.",
      },
    ],
    bestTime: [
      {
        label: "Apr – Jun",
        text: "Perfect spring golf conditions",
      },
      {
        label: "Sep – Oct",
        text: "Great autumn golf",
      },
      {
        label: "Summer",
        text: "Good but can be busy",
      },
      {
        label: "Winter",
        text: "Playable in south",
      },
    ],
    highlights: [
      {
        label: "Paris region golf access",
        query: "Paris",
      },
      {
        label: "South of France golf travel",
        query: "Nice",
      },
      {
        label: "Strong mix of classic and resort courses",
        query: "France",
      },
      {
        label: "Good variety across regions",
        query: "France",
      },
    ],
    travelTips: [
      {
        label: "Regions",
        text: "Plan around one region at a time because golf areas are spread out.",
      },
      {
        label: "South",
        text: "Southern France can extend the playable season.",
      },
    ],
    localKnowledge: [
      {
        label: "Classic golf",
        text: "France mixes historic clubs with modern resort golf.",
      },
      {
        label: "Food and golf",
        text: "Golf trips often pair naturally with regional food and wine.",
      },
    ],
    featuredRegions: [
      {
        title: "Paris Region",
        query: "Paris",
        slug: "paris-region",
        image: "/destinations/regions/france-paris-region.jpg",
        description:
          "Classic city-break golf with culture, dining, and historic clubs nearby.",
        queryAliases: [
          "Paris",
          "Île-de-France",
          "Ile-de-France",
          "Guyancourt",
          "Chantilly",
          "L'Isle-Adam",
          "Lamorlaye",
          "Courson",
          "Bondoufle",
        ],
      },
      {
        title: "French Riviera",
        query: "Nice",
        slug: "french-riviera",
        image: "/destinations/regions/france-french-riviera.jpg",
        description:
          "Mediterranean golf, resort towns, blue-water views, and longer playable seasons.",
        queryAliases: [
          "Nice",
          "Côte d'Azur",
          "Cote d'Azur",
          "Provence",
          "Cannes",
          "Mougins",
          "Tourrettes",
          "Saint-Tropez",
        ],
      },
      {
        title: "Bordeaux",
        query: "Bordeaux",
        slug: "bordeaux",
        image: "/destinations/regions/france-bordeaux.jpg",
        description:
          "Wine-region travel, countryside stays, and golf paired with food and vineyards.",
        queryAliases: ["Bordeaux", "Médoc", "Medoc", "Le Pian-Médoc", "Le Pian-MÃ©doc"],
      },
      {
        title: "Loire Valley",
        query: "Loire",
        slug: "loire-valley",
        image: "/destinations/regions/france-loire-valley.jpg",
        description:
          "Chateau scenery, soft countryside routes, and relaxed multi-stop golf travel.",
        queryAliases: ["Loire", "Centre-Val de Loire", "Pays de la Loire", "Tours", "Nantes"],
      },
    ],
  },

  italy: {
    heroImage: "/destinations/italy/italy-hero.jpg",
    overviewDescription:
      "Italy turns golf trips into touring experiences, with lake scenery, Rome access, Tuscan countryside, island coastlines, and food-led travel.",
    galleryTitle: "Italy Gallery",
    gallerySubtitle:
      "A visual preview of Italian lakes, cities, countryside, and coastal travel.",
    galleryImages: [
      {
        src: "/destinations/italy/italy-hero.jpg",
        alt: "Lake Como in Italy",
        caption: "Northern Italian lake scenery - destination-level visual.",
      },
    ],
    bestTime: [
      {
        label: "Apr – Jun",
        text: "Ideal golf season",
      },
      {
        label: "Sep – Oct",
        text: "Best conditions & fewer tourists",
      },
      {
        label: "Summer",
        text: "Hot – early tee times recommended",
      },
      {
        label: "Winter",
        text: "Playable in southern regions",
      },
    ],
    highlights: [
      {
        label: "Lake region golf scenery",
        query: "Lake",
      },
      {
        label: "Rome and north Italy golf trips",
        query: "Rome",
      },
      {
        label: "Strong food + golf travel mix",
        query: "Italy",
      },
      {
        label: "Elegant resort and countryside golf",
        query: "Italy",
      },
    ],
    travelTips: [
      {
        label: "Heat",
        text: "In summer, book early rounds and consider northern or lake regions.",
      },
      {
        label: "Trip style",
        text: "Italy works well when golf is paired with food, culture, and touring.",
      },
    ],
    localKnowledge: [
      {
        label: "Lake regions",
        text: "Northern lake areas offer some of the most scenic golf settings.",
      },
      {
        label: "Variety",
        text: "Expect a mix of resort, countryside, and city-access courses.",
      },
    ],
    featuredRegions: [
      {
        title: "Lake Como & Northern Lakes",
        query: "Lake",
        slug: "lake-como-northern-lakes",
        image: "/destinations/regions/italy-lake-como.jpg",
        description:
          "Lake scenery, elegant towns, and northern golf with mountain backdrops.",
        queryAliases: [
          "Lake",
          "Lake Como",
          "Como",
          "Lombardei",
          "Lombardy",
          "Brescia",
          "Bergamo",
          "Varese",
          "Milano",
        ],
      },
      {
        title: "Rome & Lazio",
        query: "Rome",
        slug: "rome-lazio",
        image: "/destinations/regions/italy-rome-lazio.jpg",
        description:
          "Ancient-city culture, countryside courses, and easy short-break golf access.",
        queryAliases: ["Rome", "Rom", "Lazio", "Latium", "Castel Gandolfo"],
      },
      {
        title: "Tuscany",
        query: "Tuscany",
        slug: "tuscany",
        image: "/destinations/regions/italy-tuscany.jpg",
        description:
          "Rolling hills, wine country, resort stays, and slow-travel golf atmosphere.",
        queryAliases: [
          "Tuscany",
          "Toscana",
          "Toskana",
          "Firenze",
          "Florence",
          "Siena",
          "Pisa",
          "Saturnia",
          "Porto Ercole",
          "Tirrenia",
        ],
      },
      {
        title: "Sicily",
        query: "Sicily",
        slug: "sicily",
        image: "/destinations/regions/italy-sicily.jpg",
        description:
          "Island coast, warm-weather travel, vineyards, and Mediterranean resort rhythm.",
        queryAliases: [
          "Sicily",
          "Sicilia",
          "Sizilien",
          "Palermo",
          "Catania",
          "Sciacca",
          "Ragusa",
          "Syrakus",
          "Syracuse",
        ],
      },
    ],
  },

  japan: {
    // Local AI-generated destination-level visual; not assigned to a specific region or course.
    heroImage: "/destinations/japan/japan-golf-destination.jpg",
    overviewDescription:
      "Japan offers refined golf travel with seasonal contrast, precise service, mountain and forest courses, city escapes, and resort stays.",
    galleryTitle: "Japan Gallery",
    gallerySubtitle:
      "A destination-level visual preview of Japanese golf atmosphere, seasonal landscapes, and refined travel rhythm.",
    galleryImages: [
      {
        src: "/destinations/japan/japan-golf-destination.jpg",
        alt: "Japan destination-level golf travel visual",
        caption: "Fairwayd destination visual - not a specific course.",
      },
    ],
    bestTime: [
      {
        label: "Mar - May",
        text: "Spring brings mild temperatures and premium golf conditions.",
      },
      {
        label: "Jun - Jul",
        text: "Rainy season varies by region, so keep plans flexible.",
      },
      {
        label: "Sep - Nov",
        text: "Autumn is one of the best windows for comfortable rounds.",
      },
      {
        label: "Winter",
        text: "Southern regions and Okinawa stay more playable than northern areas.",
      },
    ],
    highlights: [
      {
        label: "Tokyo area premium golf access",
        query: "Tokyo",
      },
      {
        label: "Osaka / Kobe city golf trips",
        query: "Osaka",
      },
      {
        label: "Hokkaido summer golf escapes",
        query: "Hokkaido",
      },
      {
        label: "Okinawa warm-weather island golf",
        query: "Okinawa",
      },
    ],
    travelTips: [
      {
        label: "Seasonal differences",
        text: "Japan changes strongly by season; Hokkaido, Honshu, and Okinawa can feel like different golf trips.",
      },
      {
        label: "Public transport",
        text: "Rail access is excellent, but many courses still need a taxi, shuttle, or arranged transfer for the final leg.",
      },
      {
        label: "Tee time etiquette",
        text: "Arrive early, confirm dress rules, and expect a more structured club routine than casual resort golf.",
      },
      {
        label: "Onsen + golf",
        text: "Golf and hot-spring stays pair naturally in many resort and mountain regions.",
      },
    ],
    localKnowledge: [
      {
        label: "Etiquette",
        text: "Quiet pace, respect for club rules, and careful care of the course matter a lot.",
      },
      {
        label: "Caddie or self-play",
        text: "Both formats exist; premium and traditional clubs may still lean toward caddie-supported rounds.",
      },
      {
        label: "Hidden mountain courses",
        text: "Some of Japan's most memorable golf sits outside major cities in forest and mountain settings.",
      },
    ],
    featuredRegions: [
      {
        title: "Hokkaido",
        query: "Hokkaido",
        slug: "hokkaido",
        image: "/destinations/regions/japan-hokkaido.jpg",
        description: "Summer golf and wide open fairways with cooler northern air.",
        queryAliases: ["Hokkaido", "Sapporo", "Niseko"],
      },
      {
        title: "Kanto",
        query: "Tokyo",
        slug: "kanto",
        image: "/destinations/regions/japan-kanto.jpg",
        description: "Tokyo area golf escapes for city trips, premium clubs, and short breaks.",
        queryAliases: [
          "Kanto",
          "Tokyo",
          "Chiba",
          "Saitama",
          "Kanagawa",
          "Ibaraki",
          "Tochigi",
          "Gunma",
        ],
      },
      {
        title: "Kansai",
        query: "Osaka",
        slug: "kansai",
        image: "/destinations/regions/japan-kansai.jpg",
        description: "Culture, city trips, and golf around Osaka, Kyoto, Kobe, and Nara.",
        queryAliases: [
          "Kansai",
          "Osaka",
          "Kyoto",
          "Kobe",
          "Hyogo",
          "Nara",
          "Shiga",
          "Wakayama",
        ],
      },
      {
        title: "Okinawa",
        query: "Okinawa",
        slug: "okinawa",
        image: "/destinations/regions/japan-okinawa.jpg",
        description: "Island golf experience with warmer weather and resort-style travel.",
        queryAliases: ["Okinawa", "Naha"],
      },
    ],
  },

  philippines: {
    heroImage: "/destinations/philippines/ph-hero.jpg",
    overviewDescription:
      "The Philippines combines city-club golf, resort courses, island scenery, and warm hospitality across Manila, Clark, Cebu, Boracay, Davao, and other regional golf bases.",
    galleryTitle: "Philippines Gallery",
    gallerySubtitle:
      "A visual preview of island golf, resort settings, and travel scenery in the Philippines.",
    galleryImages: [
      {
        src: "/destinations/philippines/ph-1.jpg",
        alt: "Philippines golf 2",
      },
      {
        src: "/destinations/philippines/ph-2.jpg",
        alt: "Philippines golf 2",
      },
      {
        src: "/destinations/philippines/ph-3.jpg",
        alt: "Philippines golf 3",
      },
    ],
    bestTime: [
      {
        label: "Dec - Feb",
        text: "Cooler dry-season weather makes this the most comfortable window for Manila, Clark, and Luzon rounds.",
      },
      {
        label: "Mar - May",
        text: "Hotter days are common, so early tee times and shaded resort courses work best.",
      },
      {
        label: "Jun - Oct",
        text: "Rainy season can still be playable, but build flexibility around afternoon storms and course drainage.",
      },
      {
        label: "Year-round",
        text: "Island and resort golf stays attractive when travel plans match local weather patterns.",
      },
    ],
    highlights: [
      {
        label: "Metro Manila classic club golf",
        query: "Metro Manila",
      },
      {
        label: "Clark / Pampanga golf weekends",
        query: "Pampanga",
      },
      {
        label: "Cebu city and island golf",
        query: "Cebu",
      },
      {
        label: "Boracay resort golf",
        query: "Aklan",
      },
      {
        label: "Davao southern golf escapes",
        query: "Davao",
      },
    ],
    travelTips: [
      {
        label: "Manila traffic",
        text: "Plan generous transfer time around Metro Manila; early starts help protect the rest of the day.",
      },
      {
        label: "Clark access",
        text: "Clark and nearby Luzon courses work well as a focused golf base with airport and expressway access.",
      },
      {
        label: "Island logistics",
        text: "Cebu and Boracay golf can involve ferries, short flights, or resort transfers, so confirm timing before booking tee times.",
      },
      {
        label: "Heat and rain",
        text: "Hydration, sun protection, and flexible tee times matter across both dry and rainy seasons.",
      },
    ],
    communityTips: [
      {
        title: "Book tee times early around Manila",
        body: "Popular city and private-adjacent clubs can fill prime morning slots quickly, especially before weekends and holidays.",
        category: "Tee times",
      },
      {
        title: "Plan extra travel time between islands",
        body: "Island golf days work best when flights, ferries, resort transfers, and tee times are not packed too tightly.",
        category: "Transfers",
      },
      {
        title: "Rain showers can be short but intense",
        body: "Keep plans flexible in rainy season; a heavy shower may pass quickly, but drainage and traffic can still affect timing.",
        category: "Weather",
      },
      {
        title: "Resort courses are best early morning",
        body: "Early rounds usually bring cooler air, calmer conditions, and more time for beach or city plans after golf.",
        category: "Local rhythm",
      },
    ],
    localKnowledge: [
      {
        label: "Caddie culture",
        text: "Many Philippine rounds are caddie-supported; local course knowledge can make unfamiliar layouts much easier.",
      },
      {
        label: "Club access",
        text: "Some well-known city clubs are private or member-led, while resort and public-access options are easier for visitors.",
      },
      {
        label: "Luzon variety",
        text: "Metro Manila, Cavite, Batangas, Pampanga, and Baguio can feel like very different golf trips within the same island.",
      },
    ],
    featuredRegions: [
      {
        title: "Manila & Tagaytay",
        query: "Metro Manila",
        slug: "manila-tagaytay",
        image: "/destinations/regions/philippines-manila-tagaytay.jpg",
        description: "City access and cooler highland golf for flexible Luzon trips.",
        queryAliases: [
          "Metro Manila",
          "Manila",
          "Tagaytay",
          "Cavite",
          "Laguna",
          "Rizal",
          "Batangas",
          "Antipolo",
          "Calamba",
          "Silang",
          "Laurel",
          "Lipa",
          "Binangonan",
        ],
      },
      {
        title: "Cebu",
        query: "Cebu",
        slug: "cebu",
        image: "/destinations/regions/philippines-cebu.jpg",
        description: "Island golf and resort stays with easy links to beach travel.",
        queryAliases: ["Cebu", "Cebu City", "Lapu-Lapu", "Mactan", "Danao"],
      },
      {
        title: "Clark & Subic",
        query: "Pampanga",
        slug: "clark-subic",
        image: "/destinations/regions/philippines-clark-subic.jpg",
        description: "Easy golf getaway north of Manila with airport and expressway access.",
        queryAliases: [
          "Pampanga",
          "Clark",
          "Subic",
          "Zambales",
          "Bataan",
          "Tarlac",
          "Lubao",
        ],
      },
      {
        title: "Davao",
        query: "Davao",
        slug: "davao",
        image: "/destinations/regions/philippines-davao.jpg",
        description: "Warm southern golf destination with a slower tropical pace.",
        queryAliases: ["Davao", "Davao City", "Bukidnon"],
      },
    ],
  },

  "south-africa": {
    heroImage: "/destinations/south-africa/south-africa-hero.jpg",
    overviewDescription:
      "South Africa combines Cape Town and Winelands golf, Garden Route road trips, inland championship courses, warm coastal regions, safari add-ons, and resort escapes.",
    galleryTitle: "South Africa Gallery",
    gallerySubtitle:
      "A visual preview of Cape scenery, wine regions, coast, safari-country landscapes, and resort travel.",
    galleryImages: [
      {
        src: "/destinations/south-africa/south-africa-hero.jpg",
        alt: "Cape Town and Table Mountain scenery in South Africa",
        caption: "Cape Town travel scenery - destination-level visual.",
      },
    ],
    bestTime: [
      {
        label: "Mar - May",
        text: "Autumn brings warm days, calmer winds, and excellent conditions across Cape Town, the Garden Route, and inland regions.",
      },
      {
        label: "Sep - Nov",
        text: "Spring is one of the strongest golf windows, with comfortable weather and fresh course conditions.",
      },
      {
        label: "Dec - Feb",
        text: "Summer works well for coastal and resort golf, but book early tee times around heat, wind, and holiday demand.",
      },
      {
        label: "Jun - Aug",
        text: "Winter can be wet in the Western Cape, while Gauteng, Sun City, and Mpumalanga often stay drier and playable.",
      },
    ],
    highlights: [
      {
        label: "Cape Town and Winelands golf",
        query: "Cape Town",
      },
      {
        label: "Western Cape resort and estate golf",
        query: "Western Cape",
      },
      {
        label: "Garden Route golf road trips",
        query: "Garden Route",
      },
      {
        label: "Gauteng championship courses",
        query: "Gauteng",
      },
      {
        label: "KwaZulu-Natal coastal golf",
        query: "KwaZulu-Natal",
      },
      {
        label: "Safari and golf near Kruger",
        query: "Mpumalanga",
      },
      {
        label: "Sun City resort golf",
        query: "Sun City",
      },
      {
        label: "Eastern Cape links-style layouts",
        query: "Eastern Cape",
      },
    ],
    travelTips: [
      {
        label: "Plan by region",
        text: "South Africa works best as a focused regional trip: Cape Town and the Winelands, the Garden Route, Gauteng, KwaZulu-Natal, or safari country.",
      },
      {
        label: "Driving routes",
        text: "A rental car is useful for the Garden Route, Winelands, and resort corridors, while city transfers can be arranged in Cape Town, Durban, and Johannesburg.",
      },
      {
        label: "Safari add-ons",
        text: "Mpumalanga golf pairs naturally with Kruger-area lodges, but allow enough travel time between airports, reserves, and tee times.",
      },
      {
        label: "Coastal weather",
        text: "Wind can shape rounds in Cape Town, the Garden Route, KwaZulu-Natal, and Eastern Cape, so keep one flexible day in the plan.",
      },
    ],
    localKnowledge: [
      {
        label: "Course variety",
        text: "Few destinations shift so quickly between Winelands estates, coastal links-style golf, bushveld resort golf, and inland championship clubs.",
      },
      {
        label: "Private access",
        text: "Many top clubs are private or estate-based; visitor tee times are usually possible but should be confirmed before building the itinerary.",
      },
      {
        label: "Road trip rhythm",
        text: "The Garden Route is strongest when played as a multi-stop route rather than a single out-and-back golf day.",
      },
      {
        label: "Big-event pedigree",
        text: "Gauteng, Sun City, Durban, and Mpumalanga include several layouts with major tournament or tour history.",
      },
    ],
    featuredRegions: [
      {
        label: "Cape Town",
        query: "Cape Town",
        image: "/destinations/regions/south-africa-cape-town.jpg",
        description:
          "Iconic mountain-and-ocean base with Winelands access, city stays, and coastal golf energy.",
      },
      {
        label: "Western Cape",
        query: "Western Cape",
        image: "/destinations/regions/south-africa-western-cape.jpg",
        description:
          "Wine estates, mountain scenery, and resort-style golf routes beyond Cape Town.",
      },
      {
        label: "Garden Route",
        query: "Garden Route",
        image: "/destinations/regions/south-africa-garden-route.jpg",
        description:
          "Road-trip golf corridor with lagoons, coastal towns, forests, and premium resort stops.",
      },
      {
        label: "Gauteng",
        query: "Gauteng",
        image: "/destinations/regions/south-africa-gauteng.jpg",
        description:
          "Johannesburg and Pretoria access with inland championship golf and easy business-trip add-ons.",
      },
      {
        label: "KwaZulu-Natal",
        query: "KwaZulu-Natal",
        image: "/destinations/regions/south-africa-kwazulu-natal.jpg",
        description:
          "Warm Indian Ocean coast, Durban energy, and subtropical golf-trip pacing.",
      },
      {
        label: "Mpumalanga",
        query: "Mpumalanga",
        image: "/destinations/regions/south-africa-mpumalanga.jpg",
        description:
          "Escarpment scenery, safari proximity, and dramatic landscapes near Kruger itineraries.",
      },
      {
        label: "Sun City",
        query: "Sun City",
        image: "/destinations/regions/south-africa-sun-city.jpg",
        description:
          "All-in-one resort golf with leisure facilities, tournament pedigree, and bushveld setting.",
      },
      {
        label: "Eastern Cape",
        query: "Eastern Cape",
        image: "/destinations/regions/south-africa-eastern-cape.jpg",
        description:
          "Rugged coast, quieter travel rhythm, and links-style atmosphere for adventurous golf trips.",
      },
    ],
  },

  "united-states": {
    heroImage: "/destinations/united-states/united-states-hero.jpg",
    overviewDescription:
      "The United States offers huge golf variety across winter-sun states, desert regions, California coastline, Carolinas golf corridors, and bucket-list resort destinations.",
    galleryTitle: "United States Gallery",
    gallerySubtitle:
      "A visual preview of American coast, desert, resort, and regional travel.",
    galleryImages: [
      {
        src: "/destinations/united-states/united-states-hero.jpg",
        alt: "Big Sur coastline in California, United States",
        caption: "California coastal travel scenery - destination-level visual.",
      },
    ],
    bestTime: [
      {
        label: "Winter",
        text: "Best in Florida, Arizona, California",
      },
      {
        label: "Spring",
        text: "Great across most regions",
      },
      {
        label: "Summer",
        text: "Best in northern states",
      },
      {
        label: "Autumn",
        text: "Excellent nationwide",
      },
    ],
    highlights: [
      {
        label: "Huge variety by region",
        query: "United States",
      },
      {
        label: "Florida and Arizona winter golf",
        query: "Florida",
      },
      {
        label: "California premium golf travel",
        query: "California",
      },
      {
        label: "Bucket-list golf destinations nationwide",
        query: "United States",
      },
    ],
    travelTips: [
      {
        label: "Pick a region",
        text: "Choose one state or golf corridor first; distances are large.",
      },
      {
        label: "Season",
        text: "Winter favors the south and desert regions; summer favors the north.",
      },
    ],
    localKnowledge: [
      {
        label: "Course styles",
        text: "The U.S. offers resort, desert, parkland, links-style, and private-club golf.",
      },
      {
        label: "Bookings",
        text: "Popular destination courses can require advance booking.",
      },
    ],
    featuredRegions: [
      {
        title: "Florida",
        query: "Florida",
        slug: "florida",
        image: "/destinations/regions/united-states-florida.jpg",
        description:
          "Winter-sun golf, beach resorts, easy flights, and warm-weather short breaks.",
      },
      {
        title: "Arizona & Scottsdale",
        query: "Arizona",
        slug: "arizona-scottsdale",
        image: "/destinations/regions/united-states-arizona.jpg",
        description:
          "Desert golf, dry winter weather, spa resorts, and dramatic Sonoran scenery.",
      },
      {
        title: "California",
        query: "California",
        slug: "california",
        image: "/destinations/regions/united-states-california.jpg",
        description:
          "Pacific coastline, premium resort golf, wine country, and city-to-coast itineraries.",
      },
      {
        title: "Carolinas",
        query: "Myrtle Beach",
        slug: "carolinas",
        image: "/destinations/regions/united-states-carolinas.jpg",
        description:
          "High-density golf corridors, Atlantic beaches, and relaxed group-trip energy.",
      },
    ],
  },
};

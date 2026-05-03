export type DestinationInfo = {
  heroImage?: string;
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
    label: string;
    query: string;
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
};

export const DESTINATION_INFO: Record<string, DestinationInfo> = {
  thailand: {
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
    featuredRegions: [
      {
        label: "Hua Hin",
        query: "Hua Hin",
      },
      {
        label: "Phuket",
        query: "Phuket",
      },
      {
        label: "Pattaya",
        query: "Pattaya",
      },
      {
        label: "Chiang Mai",
        query: "Chiang Mai",
      },
    ],
  },

  vietnam: {
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
  },

  portugal: {
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
  },

  spain: {
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
  },

  turkey: {
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
  },

  "united-arab-emirates": {
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
  },

  switzerland: {
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
  },

  germany: {
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
  },

  austria: {
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
  },

  france: {
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
  },

  italy: {
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
  },

  japan: {
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
        label: "Tokyo",
        query: "Tokyo",
      },
      {
        label: "Osaka / Kobe",
        query: "Osaka",
      },
      {
        label: "Hokkaido",
        query: "Hokkaido",
      },
      {
        label: "Okinawa",
        query: "Okinawa",
      },
    ],
  },

  philippines: {
    heroImage: "/destinations/philippines/ph-1.jpg",
    galleryImages: [
      {
        src: "/destinations/philippines/ph-1.jpg",
        alt: "Philippines golf 1",
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
        label: "Manila",
        query: "Metro Manila",
      },
      {
        label: "Clark / Luzon",
        query: "Pampanga",
      },
      {
        label: "Cebu",
        query: "Cebu",
      },
      {
        label: "Boracay",
        query: "Aklan",
      },
      {
        label: "Davao",
        query: "Davao",
      },
    ],
  },

  "south-africa": {
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
      },
      {
        label: "Western Cape",
        query: "Western Cape",
      },
      {
        label: "Garden Route",
        query: "Garden Route",
      },
      {
        label: "Gauteng",
        query: "Gauteng",
      },
      {
        label: "KwaZulu-Natal",
        query: "KwaZulu-Natal",
      },
      {
        label: "Mpumalanga",
        query: "Mpumalanga",
      },
      {
        label: "Sun City",
        query: "Sun City",
      },
      {
        label: "Eastern Cape",
        query: "Eastern Cape",
      },
    ],
  },

  "united-states": {
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
  },
};

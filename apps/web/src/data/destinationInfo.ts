export type DestinationInfo = {
  bestTime?: {
    label: string;
    text: string;
  }[];
  highlights?: {
    label: string;
    query: string;
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
  },
};

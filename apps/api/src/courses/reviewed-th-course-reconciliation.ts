export type ReviewedThCourseUpdate = {
  id: string;
  expectedName: string;
  newName: string;
  oldLat: number;
  oldLon: number;
  lat: number;
  lon: number;
  evidence: string;
};

export type ReviewedThCourseDeactivation = {
  id: string;
  expectedName: string;
  canonicalId: string | null;
  reason: string;
};

export type ReviewedThCourseAddition = {
  name: string;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  holes: number;
  website: string | null;
  lat: number;
  lon: number;
  coordinateSource: string;
  evidenceUrl: string;
  googlePlaceId: string;
};

export const REVIEWED_TH_COURSE_UPDATES: ReviewedThCourseUpdate[] = [
  {
    "id": "cmlsg0a380108bkuwylpfulug",
    "expectedName": "Alpine Golf Resort Chiang Mai",
    "newName": "Alpine Golf Resort Chiangmai",
    "oldLat": 18.7027766,
    "oldLon": 99.1772637,
    "lat": 18.691928,
    "lon": 99.1732458,
    "evidence": "Google Places verified course marker"
  },
  {
    "id": "cmlsg09p800zvbkuww2w27o1a",
    "expectedName": "Amata Spring Country Club",
    "newName": "Amata Spring Country Club",
    "oldLat": 13.4210427,
    "oldLon": 101.011683,
    "lat": 13.4183749,
    "lon": 101.0140053,
    "evidence": "Google Places verified course marker"
  },
  {
    "id": "cmoybno310003a8uw16zmwtu7",
    "expectedName": "Barcelona Valley Golf Club",
    "newName": "Barcelona Valley Golf Club",
    "oldLat": 12.8095597,
    "oldLon": 101.0593819,
    "lat": 12.8136587,
    "lon": 101.0681114,
    "evidence": "Current Barcelona Valley facility marker"
  },
  {
    "id": "cmlsg0afs010nbkuw5cdb4s3x",
    "expectedName": "Cascata Golf Club",
    "newName": "Cascata Golf Club",
    "oldLat": 13.9889651,
    "oldLon": 100.9477811,
    "lat": 13.9689183,
    "lon": 100.9485992,
    "evidence": "Google Places verified course marker"
  },
  {
    "id": "cmoybnofg000ia8uwar2ja8qs",
    "expectedName": "Hermes Golf Club",
    "newName": "Hermes Golf Club",
    "oldLat": 12.9395402,
    "oldLon": 101.0414049,
    "lat": 12.9352624,
    "lon": 101.050577,
    "evidence": "Current Hermes Golf Club marker"
  },
  {
    "id": "cmlsg0cfv0135bkuw98ovi0a0",
    "expectedName": "Sea Pines Golf Course",
    "newName": "Suan Son Pradipat Golf Course",
    "oldLat": 12.4977273,
    "oldLon": 99.9717726,
    "lat": 12.5057475,
    "lon": 99.9740732,
    "evidence": "Course marker selected instead of driving range"
  },
  {
    "id": "cmlsg0cqh013ibkuw79fcyaf1",
    "expectedName": "Stonehill",
    "newName": "Stonehill",
    "oldLat": 14.0912361,
    "oldLon": 100.5631402,
    "lat": 14.0931459,
    "lon": 100.5701758,
    "evidence": "Google Places verified course marker"
  },
  {
    "id": "cmlsg0d6c0143bkuw8d4ofia3",
    "expectedName": "Toscana Valley Country Club",
    "newName": "Toscana Valley Country Club",
    "oldLat": 14.5071083,
    "oldLon": 101.5034697,
    "lat": 14.506661,
    "lon": 101.501418,
    "evidence": "Google Places verified facility marker"
  },
  {
    "id": "cmlsg0ar20111bkuwevyspmhu",
    "expectedName": "Friendship Meadows Country Club",
    "newName": "Sir James Country Club",
    "oldLat": 14.5988176,
    "oldLon": 101.1983105,
    "lat": 14.5980474,
    "lon": 101.1982083,
    "evidence": "Current facility identity from Google Places inventory"
  },
  {
    "id": "cmlsg0bjo0120bkuwmw7vkqve",
    "expectedName": "Muang Ake Vista Golf Course",
    "newName": "RSU Vista Golf Course",
    "oldLat": 13.9660802,
    "oldLon": 100.5782908,
    "lat": 13.9660802,
    "lon": 100.5782908,
    "evidence": "Current facility name"
  },
  {
    "id": "cmlsg0auh0115bkuwb0u911w3",
    "expectedName": "Golf Course at 1st Infantry Regiment",
    "newName": "Royal Thai Army Golf Course",
    "oldLat": 13.8689202,
    "oldLon": 100.6052613,
    "lat": 13.8689202,
    "lon": 100.6052613,
    "evidence": "Canonical marker for the Ramindra army golf facility"
  },
  {
    "id": "cmlsg0blu0123bkuwd6b6rvny",
    "expectedName": "Nichigo Resort & Country Club",
    "newName": "Artitaya Kanchanaburi Golf & Resort",
    "oldLat": 14.1250592,
    "oldLon": 99.349031,
    "lat": 14.1250592,
    "lon": 99.349031,
    "evidence": "Current Google Places facility identity"
  },
  {
    "id": "cmlsg0cyg013sbkuwzxx13c1g",
    "expectedName": "The Gassan Panorama",
    "newName": "Gassan Panorama Golf Club",
    "oldLat": 18.6418625,
    "oldLon": 99.0848906,
    "lat": 18.6418625,
    "lon": 99.0848906,
    "evidence": "Current facility name; former Gassan Marina"
  },
  {
    "id": "cmlsg0d9k0148bkuwzsqeoi09",
    "expectedName": "Voyage Panorama Resort",
    "newName": "Panorama Golf and Country Club",
    "oldLat": 14.913409,
    "oldLon": 101.616899,
    "lat": 14.913409,
    "lon": 101.616899,
    "evidence": "Current Google Places facility identity"
  },
  {
    "id": "cmlsg09z90105bkuw6e7guab2",
    "expectedName": "Adisorn Golf Course",
    "newName": "Adisorn Golf Club",
    "oldLat": 14.519648,
    "oldLon": 100.928854,
    "lat": 14.519648,
    "lon": 100.928854,
    "evidence": "Current facility name"
  }
];

export const REVIEWED_TH_COURSE_DEACTIVATIONS: ReviewedThCourseDeactivation[] = [
  {
    "id": "cmlsg09yn0104bkuwn9zsljga",
    "expectedName": "Adana Golf Club",
    "canonicalId": "cmlsg0cwd013pbkuwhijtpk6q",
    "reason": "alias of Thana City Country Club"
  },
  {
    "id": "cmlsg0a6x010cbkuwqezy0a6a",
    "expectedName": "Ballyshear Golf Links (Ban Rakat)",
    "canonicalId": "cmlsg09r700zwbkuwuwovzguo",
    "reason": "duplicate Ballyshear marker"
  },
  {
    "id": "cmlsg0a7w010dbkuwgv435qpo",
    "expectedName": "Bangkok Golf Club (Night Golf)",
    "canonicalId": "cmlsg09s400zxbkuwm6rhqc9o",
    "reason": "same physical facility"
  },
  {
    "id": "cmlsg0aco010jbkuwrs5qdkgw",
    "expectedName": "Blue Canyon Country Club (Lakes)",
    "canonicalId": "cmlsg0abt010ibkuwrws342yx",
    "reason": "one marker per Blue Canyon facility"
  },
  {
    "id": "cmlsg0aiu010rbkuwnswul2ir",
    "expectedName": "Chiang Rai Country Club",
    "canonicalId": "cmlsg0cdt0132bkuwswqvkd8y",
    "reason": "duplicate Santiburi Chiang Rai marker"
  },
  {
    "id": "cmlsg0ath0114bkuw1mvenn4y",
    "expectedName": "Gassan Marina Golf Club",
    "canonicalId": "cmlsg0cyg013sbkuwzxx13c1g",
    "reason": "former name of Gassan Panorama"
  },
  {
    "id": "cmlsg0b62011ibkuwc8cc7h08",
    "expectedName": "Korean Golf Club (Dragon Hills)",
    "canonicalId": "cmlsg0als010vbkuwb8fbwdjw",
    "reason": "duplicate Dragon Hills marker"
  },
  {
    "id": "cmlsg0bs80129bkuwtpcprhf9",
    "expectedName": "Panya Indra Golf Club",
    "canonicalId": "cmlsg0br40128bkuwxvsngqbc",
    "reason": "duplicate Panya Indra facility"
  },
  {
    "id": "cmlsg0bt1012abkuwhhsjo5wg",
    "expectedName": "Parichat International Golf",
    "canonicalId": "cmoybnofg000ia8uwar2ja8qs",
    "reason": "former Hermes identity with incorrect coordinate"
  },
  {
    "id": "cmlsg0bzp012jbkuw2bqssx4w",
    "expectedName": "Rajjaprabha Dam Golf",
    "canonicalId": "cmlsg0c0b012kbkuwzggqyrxp",
    "reason": "duplicate dam course marker"
  },
  {
    "id": "cmlsg0c1w012mbkuwu7874pfl",
    "expectedName": "Rayong Century Country Club",
    "canonicalId": "cmlsg0cxs013rbkuw8u62aucs",
    "reason": "former name of The Emerald"
  },
  {
    "id": "cmlsg0c2k012nbkuw1x425hni",
    "expectedName": "Rayong Green Valley",
    "canonicalId": "cmoybno310003a8uw16zmwtu7",
    "reason": "layout at Barcelona Valley facility"
  },
  {
    "id": "cmlsg0cp5013gbkuwd9t37q0y",
    "expectedName": "St. Andrews 2000 Golf Club",
    "canonicalId": "cmoybno310003a8uw16zmwtu7",
    "reason": "layout at Barcelona Valley facility"
  },
  {
    "id": "cmoybnp5m001ia8uwnrf3ntyq",
    "expectedName": "Silky Oak Country Club",
    "canonicalId": "cmoybno310003a8uw16zmwtu7",
    "reason": "layout at Barcelona Valley facility"
  },
  {
    "id": "cmlsg0c40012pbkuwax91dke9",
    "expectedName": "Riverside Golf Club",
    "canonicalId": "cmlsg0a8r010ebkuw6w8gocgb",
    "reason": "duplicate Bangpakong Riverside marker"
  },
  {
    "id": "cmlsg0cce0130bkuwu504wenu",
    "expectedName": "Royal Thai Army Golf Club (New)",
    "canonicalId": "cmlsg0auh0115bkuwb0u911w3",
    "reason": "same Ramindra army facility"
  },
  {
    "id": "cmlsg0cd30131bkuw7zg4qpbk",
    "expectedName": "Royal Thai Army Golf Club (Old)",
    "canonicalId": "cmlsg0auh0115bkuwb0u911w3",
    "reason": "same Ramindra army facility"
  },
  {
    "id": "cmlsg0c7t012ubkuw8m4mauk3",
    "expectedName": "Royal Gems Golf City (Dream Arena)",
    "canonicalId": "cmlsg0c72012tbkuwm98ngmup",
    "reason": "duplicate RG City facility"
  },
  {
    "id": "cmlsg0d23013xbkuwt8c81s3y",
    "expectedName": "The RG City Golf (Dream Arena)",
    "canonicalId": "cmlsg0c72012tbkuwm98ngmup",
    "reason": "duplicate RG City facility"
  },
  {
    "id": "cmlsg0d3i013zbkuwdf334e8u",
    "expectedName": "The Royal Gems Golf City (Augusta 11-13)",
    "canonicalId": "cmlsg0c72012tbkuwm98ngmup",
    "reason": "layout at RG City facility"
  },
  {
    "id": "cmlsg0czx013ubkuwsr2wpado",
    "expectedName": "The Little Duck",
    "canonicalId": "cmlsg09s400zxbkuwm6rhqc9o",
    "reason": "alias at Bangkok Golf Club"
  },
  {
    "id": "cmlsg0d1e013wbkuw9kg406t3",
    "expectedName": "The Pinehurst (The West)",
    "canonicalId": "cmlsg0byf012hbkuwj0vs32v4",
    "reason": "layout at Pinehurst facility"
  },
  {
    "id": "cmlsg0cx0013qbkuw9uu17jn2",
    "expectedName": "Thanyacity Golf (Old)",
    "canonicalId": "cmlsg0cwd013pbkuwhijtpk6q",
    "reason": "former Thana City name"
  },
  {
    "id": "cmlsg0da70149bkuwaygdex6w",
    "expectedName": "Wang Noi Precious Golf",
    "canonicalId": "cmlsg0d5p0142bkuwggr373my",
    "reason": "duplicate Wangnoi marker"
  },
  {
    "id": "cmoybnoqb000xa8uwghrkp83q",
    "expectedName": "My Ozone Golf Club House",
    "canonicalId": "cmoybnp8h001ma8uwksh8o2jg",
    "reason": "clubhouse alias for Starry Valley"
  },
  {
    "id": "cmoybnozp001aa8uw4ijlz8ru",
    "expectedName": "Rose Garden Golf Club",
    "canonicalId": "cmoybnpe3001ua8uwrniwmw72",
    "reason": "same Sampran facility"
  },
  {
    "id": "cmlsg0ba4011nbkuwmhtt8mgm",
    "expectedName": "Lakchai City Golf",
    "canonicalId": "cmlsg0cgj0136bkuwufn38woq",
    "reason": "incorrect alias at Siam Country Club Bangkok"
  },
  {
    "id": "cmlsg0ckw013bbkuw6mn34yj2",
    "expectedName": "Siam Forest Golf Club",
    "canonicalId": "cmlsg0cgj0136bkuwufn38woq",
    "reason": "incorrect alias at Siam Country Club Bangkok"
  },
  {
    "id": "cmlsg0cuo013nbkuwojmilq61",
    "expectedName": "Suwinthawong Golf Club",
    "canonicalId": null,
    "reason": "unsupported record sharing Bangpakong coordinates"
  },
  {
    "id": "cmoybnocc000ea8uwpvjr8o1x",
    "expectedName": "Greenworld Hotspring Hotel Resort and Golf Club",
    "canonicalId": "cmoybnoak000da8uwy8kyxe1j",
    "reason": "duplicate hotel marker for same golf facility"
  },
  {
    "id": "cmoybnpoj0028a8uw4tblqddr",
    "expectedName": "สนามกอล์ฟ กองบิน 21",
    "canonicalId": "cmoybnpjx0022a8uwmg44rjoe",
    "reason": "duplicate Wing 21 marker"
  },
  {
    "id": "cmoybnpuv002ea8uw1rye0t56",
    "expectedName": "สโมสรกอล์ฟค่ายวิภาวดี รังสิต",
    "canonicalId": "cmoybnpic0020a8uwa2ph58m2",
    "reason": "duplicate Vibhavadi-Rangsit marker"
  },
  {
    "id": "cmoybnpme0025a8uwo1c3o8mk",
    "expectedName": "บริษัท รอยัล สมุยกอล์ฟ แอนด ์คันทรี่คลับ จำกัด",
    "canonicalId": "cmlsg0cbn012zbkuwhnp8ipy0",
    "reason": "company marker, not separate course"
  },
  {
    "id": "cmoybnp3j001fa8uwpxdmbhj0",
    "expectedName": "Santiburi Golf Club House",
    "canonicalId": "cmlsg0cdt0132bkuwswqvkd8y",
    "reason": "clubhouse marker for same facility"
  },
  {
    "id": "cmlsg0b3z011gbkuwwvmmx6s7",
    "expectedName": "Kiarti Thanee Country Club",
    "canonicalId": "cmlsg09r700zwbkuwuwovzguo",
    "reason": "former course at current Ban Rakat/Ballyshear site"
  },
  {
    "id": "cmoybno3r0004a8uwarzna7pd",
    "expectedName": "CCK Golf Improvement Center",
    "canonicalId": null,
    "reason": "training center, not a golf course"
  },
  {
    "id": "cmoybno4h0005a8uwse6abkqk",
    "expectedName": "Chiang Mai Golf Course Bookings",
    "canonicalId": null,
    "reason": "booking business, not a golf course"
  },
  {
    "id": "cmoybno550006a8uw5gqxpif0",
    "expectedName": "Chiang Mai Golfing",
    "canonicalId": null,
    "reason": "booking business, not a golf course"
  },
  {
    "id": "cmoybno80000aa8uweky7g01z",
    "expectedName": "Golf Bungalows Resort Co. Ltd.",
    "canonicalId": null,
    "reason": "lodging business, not a golf course"
  },
  {
    "id": "cmoybno8o000ba8uw3e2zvw2t",
    "expectedName": "Golf Club Holidays",
    "canonicalId": null,
    "reason": "travel business, not a golf course"
  },
  {
    "id": "cmoybno9e000ca8uwznhpz1qz",
    "expectedName": "Golf Fitting Khon Kaen",
    "canonicalId": null,
    "reason": "golf fitting business"
  },
  {
    "id": "cmoybnog5000ja8uwyhnu6lmo",
    "expectedName": "Hole 19 Golf Sim",
    "canonicalId": null,
    "reason": "indoor simulator"
  },
  {
    "id": "cmoybnom0000ra8uwkxnwjn0z",
    "expectedName": "LENGOLF",
    "canonicalId": null,
    "reason": "indoor golf venue"
  },
  {
    "id": "cmoybnoj4000na8uw8c0fcv2b",
    "expectedName": "Laem Sor Beach Disc Golf & Acoustic Cafe",
    "canonicalId": null,
    "reason": "disc golf and cafe"
  },
  {
    "id": "cmoybnola000qa8uw6uflgemc",
    "expectedName": "Large Villa on golf course, gym, pool",
    "canonicalId": null,
    "reason": "lodging listing"
  },
  {
    "id": "cmoybnomn000sa8uwmyj794c6",
    "expectedName": "Limitless Golf Studio",
    "canonicalId": null,
    "reason": "indoor golf studio"
  },
  {
    "id": "cmoybnoo5000ua8uwib2beu6y",
    "expectedName": "Mayfair Golf Club TH",
    "canonicalId": null,
    "reason": "indoor venue, not a golf course"
  },
  {
    "id": "cmoybnoow000va8uwmokf52hj",
    "expectedName": "Minigolf International",
    "canonicalId": null,
    "reason": "minigolf venue"
  },
  {
    "id": "cmoybnopn000wa8uwpjbars0m",
    "expectedName": "Mixed Golf Sim",
    "canonicalId": null,
    "reason": "indoor simulator"
  },
  {
    "id": "cmoybnou00012a8uwhj6u23ky",
    "expectedName": "Oneputt Golf School Khon Kaen",
    "canonicalId": null,
    "reason": "golf school, not a course"
  },
  {
    "id": "cmlsg0bws012fbkuwvn4aouje",
    "expectedName": "Phunaka Golf Club",
    "canonicalId": null,
    "reason": "driving range only"
  },
  {
    "id": "cmoybnowt0016a8uwrg1vq0ng",
    "expectedName": "RATCHARAK GOLF SIM",
    "canonicalId": null,
    "reason": "indoor simulator"
  },
  {
    "id": "cmoybnp19001ca8uwa0k7u6n4",
    "expectedName": "Samui Disc Golf & Football Golf",
    "canonicalId": null,
    "reason": "disc and football golf"
  },
  {
    "id": "cmoybnp20001da8uwds6p6tu8",
    "expectedName": "Samui Football Golf",
    "canonicalId": null,
    "reason": "football golf"
  },
  {
    "id": "cmoybnp6b001ja8uwgtjou9nh",
    "expectedName": "SkyGolf Club",
    "canonicalId": null,
    "reason": "indoor golf venue"
  },
  {
    "id": "cmoybnpg7001xa8uwc3jg4jp9",
    "expectedName": "TRUSTGOLF",
    "canonicalId": null,
    "reason": "training facility, not a golf course"
  },
  {
    "id": "cmoybnoho000la8uwjlqn7l83",
    "expectedName": "khonkaengolfshop ขายไม้กอล์ฟญี่ปุ่นมือสอง และอุปกรณ์กอล์ฟ",
    "canonicalId": null,
    "reason": "golf equipment shop"
  },
  {
    "id": "cmoybnpsp002ba8uw586dxbib",
    "expectedName": "สนามไดรฟ์กอล์ฟ บี-ไบรท์ ขอนแก่น",
    "canonicalId": null,
    "reason": "driving range"
  },
  {
    "id": "cmoybnptg002ca8uww8l4kmcs",
    "expectedName": "สนามไดร์ฟกอล์ฟ มณฑลทหารบกที่ 17",
    "canonicalId": null,
    "reason": "driving range"
  },
  {
    "id": "cmoybnpu5002da8uwfgy2xdhn",
    "expectedName": "สนามไดร์ฟกอล์ฟทุ่งทอง",
    "canonicalId": null,
    "reason": "driving range"
  },
  {
    "id": "cmoybnpcp001sa8uwxxqrbe3r",
    "expectedName": "The PITCH Golf And Yoga",
    "canonicalId": null,
    "reason": "practice venue, not a course"
  },
  {
    "id": "cmoybnpj40021a8uwvxxunuqt",
    "expectedName": "Well Golf",
    "canonicalId": null,
    "reason": "practice venue, not a course"
  },
  {
    "id": "cmoybnosf0010a8uwlpuixyz5",
    "expectedName": "O.B. Golf",
    "canonicalId": null,
    "reason": "practice venue, not a course"
  }
];

export const REVIEWED_TH_COURSE_ADDITIONS: ReviewedThCourseAddition[] = [
  {
    "name": "Artitaya Country Club",
    "city": null,
    "region": null,
    "postalCode": "26120",
    "holes": 18,
    "website": null,
    "lat": 14.170145999999999,
    "lon": 100.92274169999999,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=3997992638163851029&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJNTA96wiZHTERFRdiRB-5ezc"
  },
  {
    "name": "Asia Pattaya Hotel Golf Course",
    "city": null,
    "region": null,
    "postalCode": "20150",
    "holes": 9,
    "website": null,
    "lat": 12.914019399999999,
    "lon": 100.8589805,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=7031988842009865801&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJ1UKBHEWWAjERSS6CQJiklmE"
  },
  {
    "name": "Bangna Navy Golf Course",
    "city": null,
    "region": null,
    "postalCode": "10260",
    "holes": 18,
    "website": null,
    "lat": 13.6648108,
    "lon": 100.6095331,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=12663710397674684502&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJ3dAoFACh4jARVgDS74KJvq8"
  },
  {
    "name": "Bangpakong Golf Club",
    "city": null,
    "region": null,
    "postalCode": "24130",
    "holes": 9,
    "website": null,
    "lat": 13.5052545,
    "lon": 101.03236760000001,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=13840122190474319279&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJ90vX68s5HTERrxU52839EcA"
  },
  {
    "name": "Bhumibol Dam Golf Club",
    "city": null,
    "region": null,
    "postalCode": "63130",
    "holes": 18,
    "website": null,
    "lat": 17.2388786,
    "lon": 98.9993708,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=1081786155368920640&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJoYBozDMw3DARQDaz2cZGAw8"
  },
  {
    "name": "Bodindecha Golf Club",
    "city": null,
    "region": null,
    "postalCode": "35000",
    "holes": 9,
    "website": null,
    "lat": 15.9054487,
    "lon": 104.05649249999999,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=3376783784599756278&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJyTh1feDaFzER9h1eDPa-3C4"
  },
  {
    "name": "Chaophraya Dam Golf Course",
    "city": null,
    "region": null,
    "postalCode": "17150",
    "holes": 9,
    "website": null,
    "lat": 15.160615499999999,
    "lon": 100.1777118,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=1082266155368920224&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJPY3x1OSV4TARoDQxj1X7BA8"
  },
  {
    "name": "Chiangmai Gymkhana Club Golf Course",
    "city": null,
    "region": null,
    "postalCode": "50000",
    "holes": 9,
    "website": null,
    "lat": 18.7749497,
    "lon": 99.0090013,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=13052131296884350397&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJg5xtJgIw2jARvd2M6EJ8IrU"
  },
  {
    "name": "Dongpukurd Golf Course",
    "city": null,
    "region": null,
    "postalCode": "65000",
    "holes": 18,
    "website": null,
    "lat": 16.797619,
    "lon": 100.27774699999999,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=1082266155368920352&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJozb1n7WX3zARIDUxj1X7BA8"
  },
  {
    "name": "Hillside Country Home Golf & Resort",
    "city": null,
    "region": null,
    "postalCode": "25110",
    "holes": 18,
    "website": null,
    "lat": 14.103640299999999,
    "lon": 101.6602647,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=8567709334401662544&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJb2cM1gZgHDERUD7P9z6e5nY"
  },
  {
    "name": "Iyara Park Golf Course",
    "city": null,
    "region": null,
    "postalCode": "61000",
    "holes": 18,
    "website": null,
    "lat": 15.413636,
    "lon": 100.077038,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=11515262048482616540&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJsejNESuu4TAR3ORXl9Jtzp8"
  },
  {
    "name": "Jiraprawat Golf Course",
    "city": null,
    "region": null,
    "postalCode": "60000",
    "holes": 18,
    "website": null,
    "lat": 15.6625053,
    "lon": 100.12477580000001,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=12247546618295719737&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJ9U9kP4pO4DAROZeNUcIG-Kk"
  },
  {
    "name": "Field Marshal Plaek Phibunsongkhram Golf Course",
    "city": null,
    "region": null,
    "postalCode": "15000",
    "holes": 18,
    "website": null,
    "lat": 14.804934599999998,
    "lon": 100.6468148,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=6389388323673108237&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJs5ZlzGsAHjERDW-Q9NOqq1g"
  },
  {
    "name": "Kamphaeng Phet Akarayothin Golf Course",
    "city": null,
    "region": null,
    "postalCode": "10150",
    "holes": 9,
    "website": null,
    "lat": 13.6569182,
    "lon": 100.2922868,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=3125451082766732888&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJM-TaKq-_4jARWM4rTzPVXys"
  },
  {
    "name": "Killien Golf Club",
    "city": null,
    "region": null,
    "postalCode": "73190",
    "holes": 18,
    "website": null,
    "lat": 14.1452972,
    "lon": 100.12852819999999,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=9583253858742776254&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJc8u8xfJZ4jARvjHBOpyO_oQ"
  },
  {
    "name": "Kumlung-Ake Golf Course",
    "city": null,
    "region": null,
    "postalCode": "42100",
    "holes": 9,
    "website": null,
    "lat": 17.6187746,
    "lon": 101.7078363,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=1082106155368920048&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJTVeN2wlKITER8DMHqNBpBA8"
  },
  {
    "name": "Khun Chueang Golf Club",
    "city": null,
    "region": null,
    "postalCode": "56000",
    "holes": 9,
    "website": null,
    "lat": 19.197022999999998,
    "lon": 99.921683,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=3721889729073877413&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJE2YiMqIs2DARpZGfOv3OpjM"
  },
  {
    "name": "Mae Kok Golf Course",
    "city": null,
    "region": null,
    "postalCode": "57000",
    "holes": 9,
    "website": null,
    "lat": 19.915316999999998,
    "lon": 99.81360099999999,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=2027330819317971287&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJ32_Dd4AG1zARVzmmj6OGIhw"
  },
  {
    "name": "Naraihill Golf & Country Club",
    "city": null,
    "region": null,
    "postalCode": "15120",
    "holes": 18,
    "website": null,
    "lat": 15.007655399999999,
    "lon": 100.84956770000001,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=1082266155368920320&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJBbot1gARHjERADUxj1X7BA8"
  },
  {
    "name": "Nong Samrong Golf Course",
    "city": null,
    "region": null,
    "postalCode": "41000",
    "holes": 9,
    "website": null,
    "lat": 17.4496361,
    "lon": 102.7820405,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=410161785234212319&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJvyJOk8mCIzER30VTdfgvsQU"
  },
  {
    "name": "Phetchabun Golf Club",
    "city": null,
    "region": null,
    "postalCode": "67000",
    "holes": 9,
    "website": null,
    "lat": 16.4355129,
    "lon": 101.1480856,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=1082266155368920288&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJwQ_tMbA6IDER4DQxj1X7BA8"
  },
  {
    "name": "Phu Kra Tae Golf Club",
    "city": null,
    "region": null,
    "postalCode": "48000",
    "holes": 9,
    "website": null,
    "lat": 17.392010199999998,
    "lon": 104.7530014,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=4709193739645216552&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJ4wHw0qsOPDERKOcLfsFqWkE"
  },
  {
    "name": "Roi Et Golf Club",
    "city": null,
    "region": null,
    "postalCode": "45000",
    "holes": 9,
    "website": null,
    "lat": 16.065876,
    "lon": 103.6388549,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=2052180994980777778&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJjXXhVHT-FzERMg-j9L3Pehw"
  },
  {
    "name": "Prime City Golf Club",
    "city": null,
    "region": null,
    "postalCode": "26120",
    "holes": 18,
    "website": null,
    "lat": 14.1358095,
    "lon": 100.9414194,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=17355795693378868525&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJ3RO4wsWYHTERLRUaajos3PA"
  },
  {
    "name": "Rajpruek Club",
    "city": null,
    "region": null,
    "postalCode": "10210",
    "holes": 18,
    "website": null,
    "lat": 13.8777685,
    "lon": 100.5667386,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=11481867649125930510&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJy10QGy2D4jARDlYzGMvJV58"
  },
  {
    "name": "Royal Bangkok Sports Club",
    "city": null,
    "region": null,
    "postalCode": "10330",
    "holes": 18,
    "website": null,
    "lat": 13.7398192,
    "lon": 100.5358699,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=2373246865224531625&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJKc4Jstae4jARqX4ELnN37yA"
  },
  {
    "name": "Sand Creek Golf Course",
    "city": null,
    "region": null,
    "postalCode": "50130",
    "holes": 9,
    "website": null,
    "lat": 18.7737487,
    "lon": 99.1561753,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=4150986064195951538&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJ3xPdEnUo2jARshv_H9VDmzk"
  },
  {
    "name": "Southern Hills Golf & Country Club",
    "city": null,
    "region": null,
    "postalCode": "90250",
    "holes": 18,
    "website": null,
    "lat": 6.8983115999999995,
    "lon": 100.5034713,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=9462692303837333439&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJQVLI8tPQTDARvwcMzYM8UoM"
  },
  {
    "name": "Sri Trang Golf Club",
    "city": null,
    "region": null,
    "postalCode": "92190",
    "holes": 18,
    "website": null,
    "lat": 7.707731,
    "lon": 99.59686599999999,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=17828013061775233189&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJ6wjyuaV1UjARpRAjPmzTafc"
  },
  {
    "name": "Phoenix Gold Golf Bangkok",
    "city": null,
    "region": null,
    "postalCode": "10530",
    "holes": 36,
    "website": null,
    "lat": 13.7863832,
    "lon": 100.8915476,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=16950803079248447878&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJpwLbqGJuHTERhokzZJdZPes"
  },
  {
    "name": "Thanya Golf Club",
    "city": null,
    "region": null,
    "postalCode": "12150",
    "holes": 18,
    "website": null,
    "lat": 13.9528091,
    "lon": 100.6962942,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=18126321940968198012&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJEzQC5Rx8HTERfE_Hl8Shjfs"
  },
  {
    "name": "Thanont Golf View & Sport Club",
    "city": null,
    "region": null,
    "postalCode": "10510",
    "holes": 18,
    "website": null,
    "lat": 13.8504656,
    "lon": 100.7577929,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=4511392622981086219&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJ06K0-SBlHTERC_waL7Cvmz4"
  },
  {
    "name": "Tublamu Royal Navy Golf Course",
    "city": null,
    "region": null,
    "postalCode": "82210",
    "holes": 18,
    "website": null,
    "lat": 8.5893997,
    "lon": 98.24099269999999,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=10251230231804195&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJweDV20XvUDARIzl6iHBrJAA"
  },
  {
    "name": "Udon Golf Club & Resort",
    "city": null,
    "region": null,
    "postalCode": "41000",
    "holes": 9,
    "website": null,
    "lat": 17.2956119,
    "lon": 102.66001969999999,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=2868186986319033570&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJuzqxlVuYIzER4rTxJN7YzSc"
  },
  {
    "name": "Watermill Golf & Gardens",
    "city": null,
    "region": null,
    "postalCode": "26120",
    "holes": 18,
    "website": null,
    "lat": 14.2204158,
    "lon": 100.92794649999999,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=3519420646778900880&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJCfhNI9aZHTERkJFuem5-1zA"
  },
  {
    "name": "Wiang Ko Sai Golf Club",
    "city": null,
    "region": null,
    "postalCode": "54110",
    "holes": 9,
    "website": null,
    "lat": 17.977131,
    "lon": 100.03433,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=15141102376922060181&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJp5h4h3_a2DARlRVDDGQAINI"
  },
  {
    "name": "Wing 23 Golf Course",
    "city": null,
    "region": null,
    "postalCode": "41000",
    "holes": 9,
    "website": null,
    "lat": 17.375341499999998,
    "lon": 102.7846487,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=15643812965868704898&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJ8yoIoeqdIzERghRBCwL9Gdk"
  },
  {
    "name": "Surin Army Golf Course",
    "city": null,
    "region": null,
    "postalCode": "32000",
    "holes": 9,
    "website": null,
    "lat": 14.8713556,
    "lon": 103.4839914,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=13993326002027993328&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJJXLk35_jGTER8Jgd6dtHMsI"
  },
  {
    "name": "Ket Udomsak Golf Club",
    "city": null,
    "region": null,
    "postalCode": "86190",
    "holes": 9,
    "website": null,
    "lat": 10.506320299999999,
    "lon": 99.08717469999999,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=7356599984024852551&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJ51tfKeyp-DARRxhyYrXkF2Y"
  },
  {
    "name": "Thep Satri Si Sunthon Golf Course",
    "city": null,
    "region": null,
    "postalCode": "80310",
    "holes": 9,
    "website": null,
    "lat": 8.0357414,
    "lon": 99.6515546,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=13061400528604083247&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJ_daONxJCUjARL7SLGJRqQ7U"
  },
  {
    "name": "Promyothi Golf Course",
    "city": null,
    "region": null,
    "postalCode": "25230",
    "holes": 18,
    "website": null,
    "lat": 14.138954199999999,
    "lon": 101.37832519999999,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=7013061617053114784&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJx8ybDhJTHDERoKFgSGJmU2E"
  },
  {
    "name": "Sunrise Lagoon Country Club",
    "city": null,
    "region": null,
    "postalCode": "24110",
    "holes": 18,
    "website": null,
    "lat": 13.673405899999999,
    "lon": 101.2397473,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=18039817038142207035&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJt-KX2LAYHTERO3SBYwROWvo"
  },
  {
    "name": "Royal Creek Golf Club & Resort",
    "city": null,
    "region": null,
    "postalCode": "41150",
    "holes": 18,
    "website": null,
    "lat": 17.470156799999998,
    "lon": 102.96449860000001,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=2028356219875437802&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJZRM7flN7IzER6iyhOzwrJhw"
  },
  {
    "name": "Ban Kaeo Golf Course",
    "city": null,
    "region": null,
    "postalCode": "22000",
    "holes": 9,
    "website": null,
    "lat": 12.6605531,
    "lon": 102.09404529999999,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=4334679639174473963&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJM-LdqGCCBDER6-gcbCrgJzw"
  },
  {
    "name": "Sukhothai Golf Club",
    "city": null,
    "region": null,
    "postalCode": "64110",
    "holes": 9,
    "website": null,
    "lat": 17.284136,
    "lon": 99.860316,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=13138803390191411849&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJn-roGFbi3jARiaIOLhJoVrY"
  },
  {
    "name": "Khao Kradong Golf Club",
    "city": null,
    "region": null,
    "postalCode": "31000",
    "holes": 9,
    "website": null,
    "lat": 14.9276097,
    "lon": 103.08530209999999,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=7724722119590104097&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJ____7_uTGTERIUzFJte5M2s"
  },
  {
    "name": "Thai Air Force Takhli Golf Club",
    "city": null,
    "region": null,
    "postalCode": "60140",
    "holes": 9,
    "website": null,
    "lat": 15.278937500000001,
    "lon": 100.3048125,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=15887860031885811565&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJ6fRsYCfH4TARbR-ugYUEfdw"
  },
  {
    "name": "Pha Sing Air Force Golf Course",
    "city": null,
    "region": null,
    "postalCode": "55000",
    "holes": 9,
    "website": null,
    "lat": 18.8057652,
    "lon": 100.780874,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=4846877281581591152&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJn4VdP5WNJzERcOqULjWRQ0M"
  },
  {
    "name": "Mukdahan Golf Course",
    "city": null,
    "region": null,
    "postalCode": "49000",
    "holes": 9,
    "website": null,
    "lat": 16.5633306,
    "lon": 104.6971301,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=8061251508642539163&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJH_JvnVnHPTERm2a4aYlR328"
  },
  {
    "name": "Kaosai Country Club",
    "city": null,
    "region": null,
    "postalCode": "66230",
    "holes": 18,
    "website": null,
    "lat": 16.1441758,
    "lon": 100.6262146,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=17048484290285662246&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJu8z8OY79HzERJvBNoSJimOw"
  },
  {
    "name": "Sri Poonsap Golf Course",
    "city": null,
    "region": null,
    "postalCode": "62000",
    "holes": 9,
    "website": null,
    "lat": 16.4673385,
    "lon": 99.4966329,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=13579162373238851116&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJGYG38ZwZ3jARLIZApDvgcrw"
  },
  {
    "name": "Chulabhorn Camp Golf Course",
    "city": null,
    "region": null,
    "postalCode": "96000",
    "holes": 9,
    "website": null,
    "lat": 6.5530184,
    "lon": 101.7320127,
    "coordinateSource": "Google Places one-pass Thailand inventory review",
    "evidenceUrl": "https://maps.google.com/?cid=9806493868898039959&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
    "googlePlaceId": "ChIJBVHgdgrrszERl7i2ezeqF4g"
  }
];

export function validateReviewedThCourseReconciliation(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();

  for (const item of REVIEWED_TH_COURSE_UPDATES) {
    if (ids.has(item.id)) errors.push(`duplicate reviewed id: ${item.id}`);
    ids.add(item.id);
    if (!item.expectedName.trim() || !item.newName.trim()) errors.push(`missing update name: ${item.id}`);
    if (![item.oldLat, item.oldLon, item.lat, item.lon].every(Number.isFinite)) errors.push(`invalid update coordinates: ${item.id}`);
    if (!item.evidence.trim()) errors.push(`missing update evidence: ${item.id}`);
  }

  for (const item of REVIEWED_TH_COURSE_DEACTIVATIONS) {
    if (ids.has(item.id)) errors.push(`duplicate reviewed id: ${item.id}`);
    ids.add(item.id);
    if (!item.expectedName.trim() || !item.reason.trim()) errors.push(`invalid deactivation: ${item.id}`);
    if (item.canonicalId === item.id) errors.push(`self-referencing canonical id: ${item.id}`);
  }

  for (const item of REVIEWED_TH_COURSE_ADDITIONS) {
    const key = item.name.toLocaleLowerCase();
    if (names.has(key)) errors.push(`duplicate addition name: ${item.name}`);
    names.add(key);
    if (!Number.isFinite(item.lat) || !Number.isFinite(item.lon) || item.lat < -90 || item.lat > 90 || item.lon < -180 || item.lon > 180) errors.push(`invalid addition coordinates: ${item.name}`);
    if (!Number.isInteger(item.holes) || item.holes < 1 || item.holes > 72) errors.push(`invalid holes: ${item.name}`);
    if (!item.coordinateSource.trim() || !item.evidenceUrl.startsWith('https://') || !item.googlePlaceId.trim()) errors.push(`missing addition evidence: ${item.name}`);
  }

  return errors;
}

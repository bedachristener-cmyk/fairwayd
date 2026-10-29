export type ReviewedThCourseInventoryTarget = {
  name: string;
  query: string;
  expectedHoles: 9 | 13 | 18 | 27 | 36;
};

export const REVIEWED_TH_COURSE_INVENTORY_TARGETS: ReviewedThCourseInventoryTarget[] = [
  { name: 'Artitaya Country Club', query: 'Artitaya Country Club Bangkok Thailand golf course', expectedHoles: 18 },
  { name: 'Asia Pattaya Hotel Golf Course', query: 'Asia Pattaya Hotel Golf Course Thailand', expectedHoles: 9 },
  { name: 'Bangna Navy Golf Course', query: 'Bangna Navy Golf Course Bangkok Thailand', expectedHoles: 18 },
  { name: 'Bangpakong Golf Club', query: 'Bangpakong Golf Club Chachoengsao Thailand', expectedHoles: 9 },
  { name: 'Bhumibol Dam Golf Club', query: 'Bhumibol Dam Golf Club Tak Thailand', expectedHoles: 18 },
  { name: 'Bodindecha Golf Club', query: 'Bodindecha Golf Club Yasothon Thailand', expectedHoles: 9 },
  { name: 'Chaophraya Dam Golf Course', query: 'Chaophraya Dam Golf Course Chainat Thailand', expectedHoles: 9 },
  { name: 'Chiangmai Gymkhana Club Golf Course', query: 'Chiangmai Gymkhana Club Golf Course Thailand', expectedHoles: 9 },
  { name: 'Dongpukurd Golf Course', query: 'Dongpukurd Golf Course Phitsanulok Thailand', expectedHoles: 18 },
  { name: 'Forest Hills Country Club', query: 'Forest Hills Country Club Sir James Saraburi Thailand', expectedHoles: 18 },
  { name: 'Hillside Country Home Golf & Resort', query: 'Hillside Country Home Golf Resort Prachin Buri Thailand', expectedHoles: 18 },
  { name: 'Iyara Park Golf Course', query: 'Iyara Park Golf Course Uthai Thani Thailand', expectedHoles: 18 },
  { name: 'Jiraprawat Golf Course', query: 'Jiraprawat Golf Course Nakhon Sawan Thailand', expectedHoles: 18 },
  { name: 'Jompol Por Golf Course', query: 'Jompol Por Golf Course Lopburi Thailand', expectedHoles: 18 },
  { name: 'Kamphaeng Phet Akarayothin Golf Course', query: 'Kamphaeng Phet Akarayothin Golf Course Samut Sakhon Thailand', expectedHoles: 9 },
  { name: 'Killien Golf Club', query: 'Killien Golf Club Thailand golf course', expectedHoles: 18 },
  { name: 'Krisda City Golf Hills', query: 'Krisda City Golf Hills Nakhon Pathom Thailand', expectedHoles: 18 },
  { name: 'Kumlung-Ake Golf Course', query: 'Kumlung Ake Golf Course Loei Thailand', expectedHoles: 9 },
  { name: 'Kwan Phayao Golf Course', query: 'Kwan Phayao Golf Course Thailand', expectedHoles: 9 },
  { name: 'Life Privilege Country Club', query: 'Life Privilege Country Club Mission Hills Khao Yai Thailand', expectedHoles: 18 },
  { name: 'Mae Kok Golf Course', query: 'Mae Kok Golf Course Chiang Rai Thailand', expectedHoles: 9 },
  { name: 'Naraihill Golf & Country Club', query: 'Naraihill Golf Country Club Lopburi Thailand', expectedHoles: 18 },
  { name: 'Nong Samrong Golf Course', query: 'Nong Samrong Golf Course Udon Thani Thailand', expectedHoles: 9 },
  { name: 'Phetchabun Golf Club', query: 'Phetchabun Golf Club Thailand', expectedHoles: 9 },
  { name: 'Phrae Golf Course', query: 'Phrae Golf Course Thailand', expectedHoles: 9 },
  { name: 'Phu Kra Tae Golf Club', query: 'Phu Kra Tae Golf Club Nakhon Phanom Thailand', expectedHoles: 9 },
  { name: 'Pi Chai Dap Huk Golf Club', query: 'Pi Chai Dap Huk Golf Club Uttaradit Thailand', expectedHoles: 18 },
  { name: 'Prapasri Golf Course', query: 'Prapasri Golf Course Sakon Nakhon Thailand', expectedHoles: 9 },
  { name: 'Prasert Songkram Golf Course', query: 'Prasert Songkram Golf Course Roi Et Thailand', expectedHoles: 9 },
  { name: 'Prime City Golf Club', query: 'Prime City Golf Club Nakhon Nayok Thailand', expectedHoles: 18 },
  { name: 'Rajpruek Club', query: 'Rajpruek Club golf course Bangkok Thailand', expectedHoles: 18 },
  { name: 'Rangsit Sports Club', query: 'Rangsit Sports Club golf course Pathum Thani Thailand', expectedHoles: 9 },
  { name: 'Royal Bangkok Sports Club', query: 'Royal Bangkok Sports Club golf course Thailand', expectedHoles: 18 },
  { name: 'Royal Dusit Golf Club', query: 'Royal Dusit Golf Club Bangkok Thailand', expectedHoles: 18 },
  { name: 'Royal Thai Army Sports Center', query: 'Royal Thai Army Sports Center golf course Bangkok Thailand', expectedHoles: 18 },
  { name: 'RSU Vista Golf Course', query: 'RSU Vista Golf Course Pathum Thani Thailand', expectedHoles: 18 },
  { name: 'Sand Creek Golf Course', query: 'Sand Creek Golf Course Chiang Mai Thailand', expectedHoles: 9 },
  { name: 'Southern Hills Golf & Country Club', query: 'Southern Hills Golf Country Club Hat Yai Thailand', expectedHoles: 18 },
  { name: 'Sri Trang Golf Club', query: 'Sri Trang Golf Club Trang Thailand', expectedHoles: 18 },
  { name: 'Suvarnabhumi Golf & Country Club', query: 'Phoenix Gold Golf Bangkok former Suvarnabhumi Golf Country Club Thailand', expectedHoles: 36 },
  { name: 'Tanyatanee Country Club', query: 'Tanyatanee Country Club Pathum Thani Thailand', expectedHoles: 18 },
  { name: 'Thanont Golf View & Sport Club', query: 'Thanont Golf View Sport Club Bangkok Thailand', expectedHoles: 18 },
  { name: 'Tublamu Royal Navy Golf Course', query: 'Tublamu Royal Navy Golf Course Phang Nga Thailand', expectedHoles: 18 },
  { name: 'Udon Golf Club & Resort', query: 'Udon Golf Club Resort Thailand', expectedHoles: 9 },
  { name: 'Watermill Golf & Gardens', query: 'Watermill Golf Gardens Nakhon Nayok Thailand', expectedHoles: 18 },
  { name: 'Wiang Ko Sai Golf Club', query: 'Wiang Ko Sai Golf Club Phrae Thailand', expectedHoles: 9 },
  { name: 'Wing 23 Golf Course', query: 'Wing 23 Golf Course Udon Thani Thailand', expectedHoles: 9 },
  { name: 'Surin Army Golf Course', query: 'Surin Army Golf Course Fort Weerawatyothin Thailand', expectedHoles: 9 },
  { name: 'Ket Udomsak Golf Club', query: 'Ket Udomsak Golf Club Chumphon Thailand', expectedHoles: 9 },
  { name: 'Tungsong Golf Course', query: 'Tungsong Golf Course Thep Satri Si Sunthon Thailand', expectedHoles: 9 },
  { name: 'Promyothi Golf Course', query: 'Promyothi Golf Course Prachin Buri Thailand', expectedHoles: 18 },
  { name: 'Sunrise Lagoon Country Club', query: 'Sunrise Lagoon Country Club Chachoengsao Thailand', expectedHoles: 18 },
  { name: 'Royal Creek Golf Club & Resort', query: 'Royal Creek Golf Club Resort Udon Thani Thailand', expectedHoles: 18 },
  { name: 'Ban Kaeo Golf Course', query: 'Ban Kaeo Golf Course Rambhaibarni Chanthaburi Thailand', expectedHoles: 9 },
  { name: 'Sukhothai Golf Club', query: 'Sukhothai Golf Club STCAT Thailand', expectedHoles: 9 },
  { name: 'Khao Kradong Golf Club', query: 'Khao Kradong Golf Club Buriram Thailand', expectedHoles: 9 },
  { name: 'Thai Air Force Takhli Golf Club', query: 'Thai Air Force Takhli Golf Club Nakhon Sawan Thailand', expectedHoles: 9 },
  { name: 'Pha Sing Air Force Golf Course', query: 'Pha Sing Air Force Golf Course Nan Thailand', expectedHoles: 9 },
  { name: 'Mukdahan Golf Course', query: 'Mukdahan Golf Course Thailand', expectedHoles: 9 },
  { name: 'Kaosai Country Club', query: 'Kaosai Country Club Phichit Thailand', expectedHoles: 18 },
  { name: 'Sri Poonsap Golf Course', query: 'Sri Poonsap Golf Course Kamphaeng Phet Thailand', expectedHoles: 9 },
  { name: 'Ingkhayut Borihan Camp Golf Course', query: 'Ingkhayut Borihan Camp Golf Course Pattani Thailand', expectedHoles: 9 },
  { name: 'Chulabhorn Camp Golf Course', query: 'Chulabhorn Camp Golf Course Narathiwat Thailand', expectedHoles: 9 },
];

export function validateReviewedThCourseInventoryTargets(): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const queries = new Set<string>();

  for (const target of REVIEWED_TH_COURSE_INVENTORY_TARGETS) {
    if (!target.name.trim()) errors.push('target name is required');
    if (names.has(target.name)) errors.push(`duplicate target name: ${target.name}`);
    names.add(target.name);

    if (!target.query.toLowerCase().includes('thailand')) {
      errors.push(`query must be country-qualified: ${target.name}`);
    }
    if (queries.has(target.query)) errors.push(`duplicate query: ${target.query}`);
    queries.add(target.query);
  }

  return errors;
}

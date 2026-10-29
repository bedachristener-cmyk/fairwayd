import { test, expect } from '@playwright/test';
import { directTripReimbursements } from '../src/utils/directTripReimbursements';
import { highPerPersonCostWarning } from '../src/utils/tripCostAccounting';
import type {TripCostRow} from '../src/api/tripCosts';
const members=['Beda','Cecille','Kurt','Adi'].map(name=>({id:name,displayName:name}));
const row=(id:string,payer:string,amount:number,people:string[],costMode:'TOTAL'|'PER_PERSON'='TOTAL'):TripCostRow=>({tripItemId:id,tripItemTitle:id,tripItemType:'COURSE',category:'Golf',date:'2026-11-20',costId:id,label:'Cost',currency:'CHF',amount,baseAmount:amount,totalBaseAmount:costMode==='PER_PERSON'?amount*people.length:amount,costMode,paymentMode:'PAID_BY_ONE',paidByMemberId:payer,paidBy:members.find(m=>m.id===payer)!,participants:members.filter(m=>people.includes(m.id)),participantCount:people.length,personalShare:0,paidAmount:0,missingConversion:false});
const costs=[row('Golf','Kurt',200,members.map(m=>m.id),'PER_PERSON'),row('Hotel','Beda',1000,['Beda','Cecille']),row('Car','Adi',100,members.map(m=>m.id))];
test('direct reimbursements retain provenance instead of routing unrelated group balances',()=>{
 const rows=directTripReimbursements(costs);expect(rows.find(r=>r.from.id==='Adi'&&r.to.id==='Beda')).toBeUndefined();
 expect(rows.find(r=>r.from.id==='Beda'&&r.to.id==='Kurt')).toMatchObject({amount:200,costs:[{title:'Golf',amount:200}]});
 expect(rows.find(r=>r.from.id==='Cecille'&&r.to.id==='Beda')).toMatchObject({amount:500});
 expect(directTripReimbursements([{...costs[0],paymentMode:'EACH_PAYS_OWN'},{...costs[1],missingConversion:true}])).toEqual([]);
});
test('high-per-person warning uses CHF equivalent and needs a complete conversion',()=>{
 const cost={amount:2850,currency:'THB',baseAmount:69.57,costMode:'PER_PERSON' as const,paymentMode:'EACH_PAYS_OWN',participantCount:4};
 expect(highPerPersonCostWarning(cost,'CHF')).toBe(false);expect(highPerPersonCostWarning({...cost,baseAmount:null},'CHF')).toBe(false);
 expect(highPerPersonCostWarning({...cost,baseAmount:1200},'CHF')).toBe(true);expect(highPerPersonCostWarning({...cost,baseAmount:1200},'EUR')).toBe(false);
});
for(const width of [390,1280])test(`trip explains direct costs and optional group netting at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(()=>{localStorage.setItem('fairwayd_token','test');localStorage.setItem('fairwayd_lang','en');});
 await page.route('**/*',route=>{
  const path=new URL(route.request().url()).pathname;const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  const user={id:'owner',name:'Beda',handle:'beda',avatarUrl:'/logo.png',termsAcceptedAt:'2026-01-01'};
  if(path.endsWith('/users/me'))return json(user);
  if(path==='/api/trips/cost-test')return json({id:'cost-test',title:'Golf trip',baseCurrency:'CHF',viewerRole:'OWNER',members:members.map(m=>({...m,userId:m.id==='Beda'?'owner':m.id,role:m.id==='Beda'?'OWNER':'MEMBER',user:{id:m.id==='Beda'?'owner':m.id,name:m.id}})),items:[],documents:[]});
  if(path==='/api/trips/cost-test/organizer-costs')return json({tripId:'cost-test',baseCurrency:'CHF',costs,summary:{totalTripCost:1900,missingConversionCount:0,paidBySummary:[],memberShareSummary:[],balancePreview:[{member:members[0],paid:1000,expectedShare:725,balance:275},{member:members[1],paid:0,expectedShare:725,balance:-725},{member:members[2],paid:800,expectedShare:225,balance:575},{member:members[3],paid:100,expectedShare:225,balance:-125}]}});
  if(path==='/api/trips/cost-test/my-costs')return json({baseCurrency:'CHF',costs:[],summary:{totalPersonalShare:0,totalPaidByMe:0,balancePreview:0,groupedByCategory:{},missingConversionCount:0}});
  if(path.startsWith('/api/'))return json([]);return route.continue();
 });
 await page.goto('/trips/cost-test');await page.getByRole('button',{name:/Trip Cost Sheet/}).click();
 const direct=page.getByRole('region',{name:'Direct reimbursements'});await expect(direct).toBeVisible();
 await expect(direct.locator('summary').filter({hasText:'Beda → Kurt'})).toContainText('200');
 await expect(direct.locator('summary').filter({hasText:'Cecille → Kurt'})).toContainText('200');
 await expect(direct.locator('summary').filter({hasText:'Adi → Beda'})).toHaveCount(0);
 await direct.locator('summary').filter({hasText:'Beda → Kurt'}).click();await expect(direct.locator('details[open]')).toContainText('Golf');
 await page.getByText('Optional group netting',{exact:true}).click();await expect(page.getByText('Adi -> Beda',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`/tmp/direct-costs-${width}.png`,fullPage:false});
});

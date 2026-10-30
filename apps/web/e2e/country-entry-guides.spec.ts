import {test,expect,type Page} from '@playwright/test';
import { readFileSync } from 'node:fs';
const seedGuides = JSON.parse(readFileSync(new URL('./fixtures/entry-guides.json', import.meta.url), 'utf8'));
async function setup(page:Page,admin=false){
 let guides=JSON.parse(JSON.stringify(seedGuides));const writes:any[]=[];let selected:string[]=[];
 await page.addInitScript(()=>{localStorage.setItem('fairwayd_token','test-token');localStorage.setItem('fairwayd_lang','en');});
 await page.route('**/*',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  if(path.endsWith('/users/me'))return json({id:'owner',name:'Owner',handle:'owner',avatarUrl:'/logo.png',termsAcceptedAt:'2026-01-01'});
  if(path.endsWith('/users/me/admin-status'))return json({isAdmin:admin});
  if(path==='/api/entry-guides')return json(guides.filter((g:any)=>g.published));
  if(path==='/api/entry-guides/TH/admin')return json(guides[0]);
  if(path==='/api/entry-guides/TH'&&req.method()==='PATCH'){const body=req.postDataJSON();writes.push(body);guides[0]={...body,countryCode:'TH',version:body.version+1};return json(guides[0]);}
  if(path==='/api/destinations/thailand')return json({code:'TH',name:'Thailand',slug:'thailand',courseCount:0});
  if(path==='/api/courses/by-country/TH')return json({items:[]});
  if(path==='/api/trips'&&req.method()==='POST'){const body=req.postDataJSON();writes.push(body);selected=body.entryRequirementCountries;return json({id:'country-trip'});}
  if(path==='/api/trips/country-trip'&&req.method()==='PATCH'){const body=req.postDataJSON();writes.push(body);selected=body.entryRequirementCountries;return json({id:'country-trip'});}
  if(path==='/api/trips/country-trip')return json({id:'country-trip',title:'Travel group',destination:'Asia',entryRequirementCountries:selected,viewerRole:'OWNER',members:[{id:'member',userId:'owner',role:'OWNER',user:{id:'owner',name:'Owner'}}],items:[],documents:[]});
  if(path.endsWith('/my-costs'))return json({baseCurrency:'CHF',costs:[],summary:{totalPersonalShare:0,totalPaidByMe:0,balancePreview:0,groupedByCategory:{},missingConversionCount:0}});
  if(path.endsWith('/organizer-costs'))return json({baseCurrency:'CHF',costs:[],summary:{totalTripCost:0,missingConversionCount:0,paidBySummary:[],memberShareSummary:[],balancePreview:[]}});
  if(path.startsWith('/api/'))return json({items:[],count:0});
  return route.continue();
 });
 return {writes,updateGuide(){guides[0].entries[0].text.en='Updated centrally in Explore';},selection:()=>selected};
}
for(const width of [390,1280]){
 test(`new and existing trips link multiple Explore countries at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});const api=await setup(page);
  await page.goto('/trips/new');await page.getByLabel('Title',{exact:true}).fill('Travel group');
  await page.getByRole('checkbox',{name:'Include entry requirements?',exact:true}).check();
  await expect(page.getByRole('checkbox',{name:'Malaysia',exact:true})).toHaveCount(0);
  await page.getByRole('checkbox',{name:'Thailand',exact:true}).check();await page.getByRole('checkbox',{name:'Philippines',exact:true}).check();
  await page.getByRole('main').getByRole('button',{name:'Create',exact:true}).click();await expect(page).toHaveURL(/\/trips\/country-trip$/);
  await expect(page.locator('[data-trip-entry-requirements]')).toHaveCount(2);expect(api.selection()).toEqual(['TH','PH']);
  await page.reload();await expect(page.locator('[data-trip-entry-requirements]')).toHaveCount(2);
  api.updateGuide();await page.reload();await expect(page.getByText('Updated centrally in Explore',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:/^Edit trip$/i}).click();await page.getByRole('checkbox',{name:'Philippines',exact:true}).uncheck();await page.getByRole('checkbox',{name:'Vietnam',exact:true}).check();
  await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.locator('[data-trip-entry-requirements]')).toHaveCount(2);expect(api.selection()).toEqual(['TH','VN']);
  await expect(page.getByText('Pre-Arrival Information · Pilot',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#before-you-go').screenshot({path:`/tmp/trip-spectator-country-selection-${width}.png`});
  await page.getByRole('button',{name:/^Edit trip$/i}).click();await page.getByRole('checkbox',{name:'Include entry requirements?',exact:true}).uncheck();await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.locator('[data-trip-entry-requirements]')).toHaveCount(0);await page.reload();await expect(page.locator('[data-trip-entry-requirements]')).toHaveCount(0);expect(api.selection()).toEqual([]);
 });
 test(`admin maintains shared country information in Explore at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});const api=await setup(page,true);
  await page.goto('/destinations/thailand');const panel=page.locator('#entry-requirements');await expect(panel).toContainText('TDAC');
  await panel.getByRole('button',{name:'Edit entry information',exact:true}).click();await panel.getByRole('textbox',{name:'Text',exact:true}).first().fill('Updated official travel information');
  await panel.getByRole('button',{name:'Save',exact:true}).click();await expect(panel.getByText('Updated official travel information',{exact:true})).toBeVisible();
  expect(api.writes[0]).toMatchObject({version:1,published:true,checkedOn:'2026-10-30'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await panel.screenshot({path:`/tmp/trip-spectator-country-explore-${width}.png`});
 });
}
test('ordinary members can read Explore guides but have no editor',async({page})=>{
 await setup(page);await page.goto('/destinations/thailand');await expect(page.locator('#entry-requirements')).toContainText('TDAC');await expect(page.getByRole('button',{name:'Edit entry information',exact:true})).toHaveCount(0);
});

import { test, expect } from '@playwright/test';
for (const width of [390,1280]) {
 test(`profile held for review keeps the editor and shows a clear notice at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.addInitScript(()=>{localStorage.setItem('fairwayd_token','author');localStorage.setItem('fairwayd_lang','en');});
  let submissions=0;
  await page.route('**/*',route=>{
   const req=route.request(),path=new URL(req.url()).pathname;
   const json=(body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(path.endsWith('/users/me'))return json({id:'author',handle:'author',name:'Author',avatarUrl:'/logo.png',termsAcceptedAt:'2026-01-01'});
   if(path==='/api/users/me/profile'&&req.method()==='POST'){submissions++;return json({status:'PENDING_REVIEW',reviewId:'profile-review-reference'},202);}
   if(path.includes('handle'))return json({available:true});
   if(path.startsWith('/api/'))return json([]);
   return route.continue();
  });
  await page.goto('/onboarding/profile');
  await page.getByRole('button',{name:'Save & Continue',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'profile-review-reference'})).toContainText('applied automatically');
  await expect(page.getByRole('status').filter({hasText:'profile-review-reference'})).toContainText('do not need to submit it again');
  await expect(page).toHaveURL(/\/onboarding\/profile$/);
  expect(submissions).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`/tmp/pending-profile-${width}.png`,fullPage:false});
 });
}

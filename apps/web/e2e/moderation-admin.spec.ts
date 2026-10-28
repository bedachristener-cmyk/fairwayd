import { test, expect } from '@playwright/test';
for (const width of [390,1280]) {
  test(`admin reviews private quarantined content at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.addInitScript(()=>localStorage.setItem('fairwayd_token','test-admin'));
    const decisions: unknown[]=[];let status='PENDING';const previewHeaders: string[]=[];
    await page.route('**/*',async route=>{
      const path=new URL(route.request().url()).pathname;
      const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
      if(path.endsWith('/users/me'))return json({id:'admin',handle:'admin',name:'Admin',avatarUrl:'/logo.png',termsAcceptedAt:'2026-01-01'});
      if(path==='/api/safety/admin/moderation/status')return json({enabled:true,configured:true});
      if(path==='/api/safety/admin/moderation')return json([{id:'case-image',userId:'user',scope:'POST_IMAGE',status,categories:['violence'],mimeType:'image/png',expiresAt:'2026-11-01'},{id:'case-blocked',userId:'user',scope:'POST_IMAGE',status:'BLOCKED',categories:['sexual/minors'],expiresAt:'2026-11-01'}]);
      if(path==='/api/safety/admin/moderation/case-image/image'){
        previewHeaders.push(route.request().headers().authorization);
        return route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64')});
      }
      if(path==='/api/safety/admin/moderation/case-image'&&route.request().method()==='PATCH'){decisions.push(route.request().postDataJSON());status='APPROVED';return json({ok:true});}
      if(path.startsWith('/api/'))return json({items:[],count:0});return route.continue();
    });
    await page.goto('/admin/moderation');
    await expect(page.getByRole('heading',{name:'Automatic content checks'})).toBeVisible();
    await expect(page.getByRole('img',{name:'Quarantined image for moderation'})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Approve unchanged resubmission'})).toHaveCount(1);
    await page.getByRole('button',{name:'Show potentially disturbing image'}).click();
    await expect(page.getByRole('img',{name:'Quarantined image for moderation'})).toBeVisible();
    expect(previewHeaders).toEqual(['Bearer test-admin']);
    await page.getByRole('button',{name:'Approve unchanged resubmission'}).click();
    await expect.poll(()=>decisions).toEqual([{decision:'APPROVED'}]);
    await expect(page.getByRole('button',{name:'Approve unchanged resubmission'})).toHaveCount(0);
    await expect(page.getByRole('img',{name:'Quarantined image for moderation'})).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`/tmp/moderation-admin-${width}.png`,fullPage:true});
  });
}
test('non-admin cannot load private reviews or previews',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('fairwayd_token','member'));
  let previewRequested=false;
  await page.route('**/*',async route=>{
    const path=new URL(route.request().url()).pathname;const json=(body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path.endsWith('/users/me'))return json({id:'member',handle:'member',avatarUrl:'/logo.png',termsAcceptedAt:'2026-01-01'});
    if(path==='/api/safety/admin/moderation')return json({message:'Forbidden'},403);
    if(path.endsWith('/image'))previewRequested=true;
    if(path.startsWith('/api/'))return json({items:[],count:0});return route.continue();
  });
  await page.goto('/admin/moderation');await expect(page.getByRole('alert')).toHaveText('Admin access required.');expect(previewRequested).toBe(false);
});

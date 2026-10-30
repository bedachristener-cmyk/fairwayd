import { test, expect } from '@playwright/test';
test.use({ timezoneId: 'Europe/Zurich', locale: 'en-GB' });
for (const width of [390,1280]) {
  test(`admin reviews private quarantined content at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.addInitScript(()=>localStorage.setItem('fairwayd_token','test-admin'));
    const decisions: unknown[]=[];let status='PENDING';const previewHeaders: string[]=[];
    await page.route('**/*',async route=>{
      const path=new URL(route.request().url()).pathname;
      const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
      if(path.endsWith('/users/me'))return json({id:'admin',handle:'admin',name:'Admin',avatarUrl:'/logo.png',termsAcceptedAt:'2026-01-01'});
      if(path==='/api/safety/admin/pending-posts')return json([{id:'yesterday',state:'APPROVED',content:'',courseId:'course',visibility:'PRIVATE',categories:[],createdAt:'2026-10-29T18:18:48Z',decidedAt:'2026-10-29T18:30:55Z',expiresAt:'2026-10-30T18:30:55Z',user:{name:'Old author'},images:[]}]);
      if(path==='/api/safety/admin/pending-changes')return json([{id:'change-avatar',action:'AVATAR',targetId:'user',payload:{},state:status,categories:['violence'],createdAt:'2026-10-30T14:17:55Z',expiresAt:'2026-11-01',user:{name:'Golfer'},images:status==='PENDING'?[{id:'picture'}]:[]}]);
      if(path==='/api/safety/admin/moderation/status')return json({enabled:true,configured:true});
      if(path==='/api/safety/admin/moderation')return json([{id:'case-blocked',userId:'user',scope:'POST_IMAGE',status:'BLOCKED',categories:['sexual/minors'],expiresAt:'2026-11-01'}]);
      if(path==='/api/safety/admin/pending-changes/change-avatar/images/picture'){
        previewHeaders.push(route.request().headers().authorization);
        return route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64')});
      }
      if(path==='/api/safety/admin/pending-changes/change-avatar'&&route.request().method()==='PATCH'){decisions.push(route.request().postDataJSON());status='APPROVED';return json({ok:true});}
      if(path.startsWith('/api/'))return json({items:[],count:0});return route.continue();
    });
    await page.goto('/admin/moderation#change-avatar');
    await expect(page.locator('#change-avatar')).toBeVisible();
    await expect(page.locator('#change-avatar')).toContainText('Submitted:');
    await expect(page.locator('#change-avatar')).toContainText('15:17');
    await expect(page.locator('#yesterday')).not.toBeVisible();
    await expect(page.getByRole('heading',{name:'Automatic content checks'})).toBeVisible();
    await expect(page.getByRole('img',{name:'Quarantined image for moderation'})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Approve and apply'})).toHaveCount(1);
    await expect(page.locator('#change-avatar')).toBeInViewport({ ratio: 0.5 });
    await page.getByRole('button',{name:'Show all images for review'}).click();
    await expect(page.getByRole('img',{name:'Quarantined image for moderation'})).toBeVisible();
    expect(previewHeaders.length).toBeGreaterThan(0);
    expect(previewHeaders.every(value => value === 'Bearer test-admin')).toBe(true);
    await page.getByRole('button',{name:'Approve and apply'}).click();
    await expect.poll(()=>decisions).toEqual([{decision:'APPROVED'}]);
    await expect(page.getByRole('button',{name:'Approve and apply'})).toHaveCount(0);
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

for (const isAdmin of [true, false]) {
  test(`mobile menu exposes content review only for admins: ${isAdmin}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.setItem('fairwayd_token', 'menu-user'));
    await page.route('**/*', async route => {
      const path = new URL(route.request().url()).pathname;
      const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      if (path.endsWith('/users/me')) return json({ id: 'menu-user', handle: 'menu-user', name: 'Menu User', avatarUrl: '/logo.png', termsAcceptedAt: '2026-01-01' });
      if (path.endsWith('/users/me/admin-status')) return json({ isAdmin });
      if (path === '/api/safety/admin/pending-changes' || path === '/api/safety/admin/pending-posts' || path === '/api/safety/admin/moderation') return json([]);
      if (path === '/api/safety/admin/moderation/status') return json({ enabled: true, configured: true });
      if (path.startsWith('/api/')) return json({ items: [], count: 0 });
      return route.continue();
    });
    await page.goto('/privacy-security');
    await page.getByRole('button', { name: 'Open main menu', exact: true }).click();
    const admin = page.getByRole('button', { name: /^Admin/ });
    if (!isAdmin) {
      await expect(admin).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Content Reports/ })).toHaveCount(0);
      return;
    }
    await admin.click();
    await page.getByRole('button', { name: /^Content Reports/ }).click();
    await expect(page).toHaveURL(/\/admin\/reports$/);
    await page.getByRole('link', { name: 'Automatic content checks', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Automatic content checks' })).toBeVisible();
    await page.getByRole('button', { name: 'Open main menu', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Content Reports/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

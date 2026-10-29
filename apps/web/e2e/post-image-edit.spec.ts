import { test, expect } from '@playwright/test';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64');
for(const width of [390,1280])test(`owner edits images without losing the post at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(()=>{localStorage.setItem('fairwayd_token','test');localStorage.setItem('fairwayd_lang','en');});
 const user={id:'owner',handle:'owner',name:'Owner',avatarUrl:'/logo.png',termsAcceptedAt:'2026-01-01'};
 let post={id:'post',content:'A golf round',createdAt:'2026-10-27T12:00:00Z',updatedAt:'2026-10-29T10:00:00Z',visibility:'PUBLIC',course:{id:'course',name:'Golf Course',lat:47,lon:8},user,images:[{id:'first',url:'/first.png'},{id:'duplicate',url:'/duplicate.png'}],likes:[{userId:'someone'}],_count:{likes:1,comments:2}};
 const mutations:{type:string,body:any}[]=[];
 await page.route('**/*',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/first.png'||path==='/duplicate.png'||path==='/new.png')return route.fulfill({status:200,contentType:'image/png',body:png});
  if(path.endsWith('/users/me'))return json(user);
  if(path==='/api/posts/feed')return json({items:[post]});
  if(path==='/api/posts/post'&&req.method()==='PATCH'){
   const type=req.headers()['content-type'];mutations.push({type,body:type.includes('json')?req.postDataJSON():req.postData()});
   if(type.includes('json')){const body=req.postDataJSON();post={...post,...body,images:post.images.filter(i=>body.retainedImageIds?.includes(i.id)),updatedAt:'2026-10-29T11:00:00Z'};}
   else post={...post,images:[{id:'replacement',url:'/new.png'}],updatedAt:'2026-10-29T12:00:00Z'};
   return json(post);
  }
  if(path==='/api/courses')return json([post.course]);
  if(path.startsWith('/api/ratings/'))return json({overall:4.4,count:1});
  if(path.startsWith('/api/'))return json({items:[],count:0});return route.continue();
 });
 await page.goto('/feed');
 const actions=()=>page.getByRole('button',{name:'Post actions',exact:true});
 await actions().click();await page.getByRole('button',{name:'Edit post',exact:true}).click();
 await expect(page.locator('fieldset img')).toHaveCount(2);
 await page.getByRole('button',{name:'Remove image 2',exact:true}).click();
 await expect(page.locator('fieldset img')).toHaveCount(1);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 expect(mutations).toHaveLength(0);
 await actions().click();await page.getByRole('button',{name:'Edit post',exact:true}).click();
 await expect(page.locator('fieldset img')).toHaveCount(2);
 await page.getByRole('button',{name:'Remove image 2',exact:true}).click();await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>mutations.length).toBe(1);expect(mutations[0].body.retainedImageIds).toEqual(['first']);
 await expect(page.locator('fieldset')).toHaveCount(0);
 await actions().click();await page.getByRole('button',{name:'Edit post',exact:true}).click();await expect(page.locator('fieldset img')).toHaveCount(1);
 await page.getByRole('button',{name:'Remove image 1',exact:true}).click();
 await page.locator('fieldset input[type=file]').setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:png});
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>mutations.length).toBe(2);expect(mutations[1].type).toContain('multipart/form-data');expect(mutations[1].body).toContain('replacement.png');expect(mutations[1].body).toContain('retainedImageIds');
 await expect(page.locator('fieldset')).toHaveCount(0);await page.reload();
 await actions().click();await page.getByRole('button',{name:'Edit post',exact:true}).click();await expect(page.locator('fieldset img')).toHaveCount(1);
 await expect(page.locator('fieldset img')).toHaveAttribute('src','/new.png');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`/tmp/post-images-${width}.png`,fullPage:false});
});

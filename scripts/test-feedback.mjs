import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import worker from '../cloudflare/src/index.js';

const root=path.join(import.meta.dirname,'..');
const sqlite=new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(path.join(root,'cloudflare/migrations/0001_init.sql'),'utf8'));
sqlite.exec(fs.readFileSync(path.join(root,'cloudflare/migrations/0002_seed_plants.sql'),'utf8'));
sqlite.exec(fs.readFileSync(path.join(root,'cloudflare/migrations/0003_complete_editorial_catalog.sql'),'utf8'));
sqlite.exec(fs.readFileSync(path.join(root,'cloudflare/migrations/0004_user_feedback.sql'),'utf8'));
sqlite.exec(fs.readFileSync(path.join(root,'cloudflare/migrations/0005_plant_provenance.sql'),'utf8'));
sqlite.exec(fs.readFileSync(path.join(root,'cloudflare/migrations/0006_remove_unverified_cultivation.sql'),'utf8'));
sqlite.exec(fs.readFileSync(path.join(root,'cloudflare/migrations/0007_kew_taxonomy_review.sql'),'utf8'));
sqlite.exec(fs.readFileSync(path.join(root,'cloudflare/migrations/0008_remove_editorial_plant_claims.sql'),'utf8'));
sqlite.exec(fs.readFileSync(path.join(root,'cloudflare/migrations/0009_official_cultivation_source_candidates.sql'),'utf8'));
sqlite.exec(fs.readFileSync(path.join(root,'cloudflare/migrations/0010_gbif_verified_common_home_garden_taxa.sql'),'utf8'));
const batch=fs.readFileSync(path.join(root,'cloudflare/migrations/0011_home_garden_catalog.sql'),'utf8');
sqlite.exec(batch);
sqlite.exec(batch);
sqlite.exec(fs.readFileSync(path.join(root,'cloudflare/migrations/0012_plant_photo_corrections.sql'),'utf8'));
sqlite.exec(fs.readFileSync(path.join(root,'cloudflare/migrations/0013_admin_console.sql'),'utf8'));
const DB={
  async batch(statements){
    sqlite.exec('BEGIN');
    try{
      const results=[];
      for(const statement of statements)results.push(await statement.run());
      sqlite.exec('COMMIT');
      return results;
    }catch(error){
      sqlite.exec('ROLLBACK');
      throw error;
    }
  },
  prepare(sql){
    const statement=sqlite.prepare(sql);
    return {bind(...values){
      assert.ok(values.length<=100,'D1 allows at most 100 bound parameters');
      return {
        first:async()=>statement.get(...values)||null,
        all:async()=>({results:statement.all(...values)}),
        run:async()=>({meta:{changes:statement.run(...values).changes}})
      };
    }};
  }
};
const env={DB,SESSION_SECRET:'local-test-only'};
const base='https://example.test';
async function call(route,{method='GET',data,token,ip='203.0.113.10'}={}){const headers={'CF-Connecting-IP':ip};if(data)headers['Content-Type']='application/json';if(token)headers.Authorization='Bearer '+token;const response=await worker.fetch(new Request(base+route,{method,headers,body:data?JSON.stringify(data):undefined}),env);return{status:response.status,body:await response.json()};}
let catalog=await call('/v1/plants');assert.equal(catalog.status,200);assert.equal(catalog.body.items.length,167);assert.equal(catalog.body.catalog.dataStatus,'分类与养护资料按内部审核状态发布');assert.equal(catalog.body.items.find(item=>item.id==='tomato').taxonomyVerified,true);assert.equal(catalog.body.items.find(item=>item.id==='radish').taxonomyVerified,true);assert.equal(catalog.body.items.find(item=>item.id==='tomato').cultivationVerified,false);assert.equal(catalog.body.items.find(item=>item.id==='blueberry').taxonomyVerified,false);assert.equal(catalog.body.items.find(item=>item.id==='tomato').sourceUrl,undefined);assert.equal(catalog.body.items.find(item=>item.id==='tomato').evidence,undefined);
assert.equal(catalog.body.items.filter(item=>item.taxonomyVerified).length,164);
assert.ok(catalog.body.items.every(item=>!item.cultivationVerified&&item.light===null&&item.temp===null&&item.container===null));
assert.equal((await call('/v1/plants?query='+encodeURIComponent('土豆'))).body.items[0].id,'potato');
assert.equal((await call('/v1/plants?category='+encodeURIComponent('树木'))).body.items.length,6);
const valid={category:'suggestion',content:'希望增加每周播种提醒和照片对比'};
let result=await call('/v1/feedback',{method:'POST',data:{...valid,content:'太短'}});assert.equal(result.status,400);
result=await call('/v1/feedback',{method:'POST',data:valid});assert.equal(result.status,201);assert.equal(result.body.status,'open');const feedbackId=result.body.id;
for(let i=0;i<4;i++)assert.equal((await call('/v1/feedback',{method:'POST',data:valid})).status,201);
assert.equal((await call('/v1/feedback',{method:'POST',data:valid})).status,429);
assert.equal((await call('/v1/admin/feedback')).status,403);
const rawToken='test-admin-session';const userId='test-admin';const tokenHash=createHash('sha256').update(env.SESSION_SECRET+':'+rawToken).digest('hex');
sqlite.prepare("INSERT INTO users (id,openid,role) VALUES (?,?,?)").run(userId,'test-openid','admin');
sqlite.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').run(tokenHash,userId,'2099-01-01T00:00:00.000Z');
assert.equal((await call('/v1/auth/me',{token:rawToken})).body.user.isAdmin,true);
result=await call('/v1/admin/feedback?status=open',{token:rawToken});assert.equal(result.status,200);assert.equal(result.body.items.length,5);assert.equal(result.body.items[0].ip_hash,undefined);
result=await call('/v1/admin/feedback/'+feedbackId,{method:'PATCH',data:{status:'reviewing'},token:rawToken});assert.equal(result.status,200);
assert.equal((await call('/v1/admin/feedback?status=reviewing',{token:rawToken})).body.items.length,1);
console.log('PASS catalog provenance, feedback validation, persistence, rate limit, admin access, and status changes');

const corrections='/v1/plant-photo-corrections';
const adminCorrections='/v1/admin/plant-photo-corrections';
const jpeg=fs.readFileSync(path.join(root,'scripts/fixtures/guava.jpg')).toString('base64');
const correction={plantId:'guava',note:'果实和叶片实拍',photo:jpeg,authorized:true};
const submitCorrection=data=>call(corrections,{method:'POST',data});
assert.equal((await submitCorrection({...correction,authorized:false})).status,400);
assert.equal((await submitCorrection({...correction,photo:'not-a-photo'})).status,400);
assert.equal((await submitCorrection({...correction,photo:'A'.repeat(250000)})).status,400);
assert.equal((await submitCorrection({...correction,plantId:'unknown-taxon'})).status,404);
result=await submitCorrection(correction);
assert.equal(result.status,201);
const correctionId=result.body.id;
assert.equal(result.body.status,'pending');
assert.equal((await call(adminCorrections)).status,403);
assert.equal((await call(adminCorrections+'/'+correctionId)).status,403);
result=await call(adminCorrections,{token:rawToken});
assert.equal(result.body.items[0].plantName,'番石榴');
assert.equal(result.body.items[0].scientificName,'Psidium guajava');
assert.equal(result.body.items[0].photo,undefined);
assert.equal((await call(adminCorrections+'/'+correctionId,{token:rawToken})).body.photo,jpeg);
const reviewCorrection=status=>call(adminCorrections+'/'+correctionId,{method:'PATCH',token:rawToken,data:{status}});
assert.equal((await reviewCorrection('published')).status,400);
assert.equal((await reviewCorrection('reviewed')).status,200);
assert.equal((await reviewCorrection('rejected')).status,409);
assert.equal((await call(adminCorrections,{token:rawToken})).body.items.length,0);
assert.equal((await call(adminCorrections+'?status=reviewed',{token:rawToken})).body.items[0].id,correctionId);
assert.equal((await submitCorrection(correction)).status,201);
assert.equal((await submitCorrection(correction)).status,201);
assert.equal((await submitCorrection(correction)).status,429);
assert.deepEqual((await call('/v1/plants')).body,catalog.body);
console.log('PASS photo submission, size and rights validation, private moderation, quota, and catalogue isolation');

const adminName='test-console';
const adminPass='only-for-local-fixture';
const salt='test-random-salt';
const verifier=createHash('sha256').update(salt+':'+adminPass).digest('hex');
sqlite.prepare('INSERT INTO web_admin_accounts (username,password_salt,password_verifier) VALUES (?,?,?)').run(adminName,salt,verifier);
async function consoleCall(route,{method='GET',body,cookie,origin=base}={}){
  const headers={'CF-Connecting-IP':'203.0.113.12'};
  if(method!=='GET')headers.Origin=origin;
  if(cookie)headers.Cookie=cookie;
  if(body)headers['Content-Type']='application/json';
  return worker.fetch(new Request(base+route,{method,headers,body:body?JSON.stringify(body):undefined}),env);
}
const signInPath='/manage/api/session';
assert.match(await (await consoleCall('/manage')).text(),/管理后台/);
assert.equal((await consoleCall('/manage/api/users')).status,401);
assert.equal((await consoleCall(signInPath,{method:'POST',body:{username:adminName,password:'wrong'}})).status,401);
const session=await consoleCall(signInPath,{method:'POST',body:{username:adminName,password:adminPass}});
assert.equal(session.status,200);
assert.match(session.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=Strict/);
const cookie=session.headers.get('set-cookie').split(';')[0];
assert.equal((await consoleCall('/manage/api/overview',{cookie})).status,200);
const people=await (await consoleCall('/manage/api/users',{cookie})).json();
assert.equal(people.items[0].userRef,userId);
assert.equal(people.items[0].openid,undefined);
const approvedImage='/v1/catalog/photos/guava';
assert.equal((await consoleCall(approvedImage)).status,404);
const edit='/manage/api/corrections/'+correctionId;
const candidate=await consoleCall(edit,{cookie});
assert.equal(candidate.headers.get('content-type'),'image/jpeg');
assert.equal(Buffer.from(await candidate.arrayBuffer()).toString('base64'),jpeg);
assert.equal((await consoleCall(edit,{method:'PATCH',cookie,origin:'https://elsewhere.test',body:{action:'publish',taxonChecked:true,rightsChecked:true}})).status,403);
assert.equal((await consoleCall(edit,{method:'PATCH',cookie,body:{action:'publish',taxonChecked:true}})).status,400);
assert.equal((await consoleCall(edit,{method:'PATCH',cookie,body:{action:'publish',taxonChecked:true,rightsChecked:true}})).status,200);
const publishedPhoto=await consoleCall(approvedImage);
assert.equal(publishedPhoto.status,200);
assert.equal(Buffer.from(await publishedPhoto.arrayBuffer()).toString('base64'),jpeg);
assert.deepEqual((await call('/v1/catalog/photo-overrides')).body.items,[{id:'guava',revision:correctionId}]);
assert.equal((await consoleCall(signInPath,{method:'DELETE',cookie})).status,200);
assert.equal((await consoleCall('/manage/api/feedback',{cookie})).status,401);
console.log('PASS web admin login, session revocation, CSRF protection, masked users and reviewed photo publication');

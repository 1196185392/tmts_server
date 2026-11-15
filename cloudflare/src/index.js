import {handleAdmin, publicPhotoOverrides, publicCatalogPhoto} from './admin.js';

const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const now=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
const token=()=>{const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return [...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');};
async function hash(value,secret=''){const data=new TextEncoder().encode(`${secret}:${value}`);const digest=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');}
function cors(request){const origin=request.headers.get('origin');return origin?{'access-control-allow-origin':origin,'vary':'Origin','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'}:{};}
function weatherKind(text=''){if(/雪|冰雹/.test(text))return'snow';if(/雨|雷/.test(text))return'rain';if(/晴/.test(text))return'sunny';return'cloudy';}
function openMeteoCondition(code){const value=Number(code);if([71,73,75,77,85,86].includes(value))return {kind:'snow',text:'降雪'};if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(value))return {kind:'rain',text:'降雨'};if([95,96,99].includes(value))return {kind:'rain',text:'雷暴'};if(value===0)return {kind:'sunny',text:'晴朗'};if([1,2].includes(value))return {kind:'sunny',text:'少云'};if(value===3)return {kind:'cloudy',text:'阴天'};if([45,48].includes(value))return {kind:'cloudy',text:'有雾'};return {kind:'cloudy',text:'多云'};}
async function body(request){try{return await request.json();}catch{return null;}}
async function boundedJson(request,maxBytes=4096){const reader=request.body?.getReader();if(!reader)return null;const decoder=new TextDecoder();let size=0,text='';try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();return null;}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}catch{return null;}finally{reader.releaseLock();}}
async function currentUser(request,env){const value=request.headers.get('authorization')||'';const raw=value.startsWith('Bearer ')?value.slice(7):'';if(!raw)return null;const row=await env.DB.prepare('SELECT u.id,u.openid,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(raw,env.SESSION_SECRET),now()).first();return row||null;}
function requireUser(user,headers){return user?null:json({code:'UNAUTHORIZED'},401,headers);}
function requireAdmin(user,env,headers){const list=(env.ADMIN_OPENIDS||'').split(',').map(v=>v.trim()).filter(Boolean);return user&&(user.role==='admin'||list.includes(user.openid))?null:json({code:'FORBIDDEN'},403,headers);}

async function login(request,env,headers){
  if(!env.WECHAT_APP_ID||!env.WECHAT_APP_SECRET||!env.SESSION_SECRET)return json({code:'AUTH_NOT_CONFIGURED'},503,headers);
  const data=await body(request);if(!data||typeof data.code!=='string'||!data.code)return json({code:'INVALID_CODE'},400,headers);
  const target=new URL('https://api.weixin.qq.com/sns/jscode2session');target.search=new URLSearchParams({appid:env.WECHAT_APP_ID,secret:env.WECHAT_APP_SECRET,js_code:data.code,grant_type:'authorization_code'}).toString();
  const upstream=await fetch(target);const session=await upstream.json();if(!session.openid)return json({code:'WECHAT_LOGIN_FAILED',message:session.errmsg||'微信登录失败'},401,headers);
  const userId=await hash(session.openid);await env.DB.prepare("INSERT INTO users (id,openid) VALUES (?,?) ON CONFLICT(openid) DO UPDATE SET updated_at=CURRENT_TIMESTAMP").bind(userId,session.openid).run();
  const accessToken=token();const expires=new Date(Date.now()+7*86400000).toISOString();await env.DB.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').bind(await hash(accessToken,env.SESSION_SECRET),userId,expires).run();
  const member=await env.DB.prepare('SELECT role FROM users WHERE id=?').bind(userId).first();
  const isAdmin=Boolean(member&&(member.role==='admin'||(env.ADMIN_OPENIDS||'').split(',').map(v=>v.trim()).includes(session.openid)));
  return json({accessToken,expiresIn:604800,user:{id:userId.slice(0,12),isAdmin}},200,headers);
}

async function plants(url,env,headers){
  const q=(url.searchParams.get('query')||'').trim();const category=url.searchParams.get('category')||'';
  const result=await env.DB.prepare(`
    SELECT p.id,p.name,p.scientific_name AS scientificName,p.category,p.aliases_json AS aliases,
           p.summary,p.light,p.temperature AS temp,p.container,
           EXISTS(SELECT 1 FROM plant_sources s
                  WHERE s.species_id=p.id AND s.scope='taxonomy' AND s.status='verified') AS taxonomyVerified,
           EXISTS(SELECT 1 FROM plant_sources s
                  WHERE s.species_id=p.id AND s.scope='cultivation' AND s.status='verified') AS cultivationVerified
    FROM plant_species p
    WHERE p.status='published' AND (?='' OR p.category=?)
      AND (?='' OR p.name LIKE '%'||?||'%' OR p.aliases_json LIKE '%'||?||'%')
    ORDER BY p.name,p.id LIMIT 200
  `).bind(category,category,q,q,q).all();
  const items=(result.results||[]).map(item=>({
    ...item,
    aliases:JSON.parse(item.aliases||'[]'),
    taxonomyVerified:Boolean(item.taxonomyVerified),
    cultivationVerified:Boolean(item.cultivationVerified)
  }));
  return json({items,catalog:{dataStatus:'分类与养护资料按内部审核状态发布',cultivation:'待逐条核验后发布'}},200,headers);
}

const districtName=value=>value.replace(/(特别行政区|自治区|自治州|自治县|自治旗|地区|新区|省|市|区|县)$/u,'');
const provinceName=value=>districtName(value).replace(/(维吾尔|壮族|回族)$/u,'');
function validCoordinates(latitude,longitude){
  return Number.isFinite(latitude)&&Math.abs(latitude)<=90&&Number.isFinite(longitude)&&Math.abs(longitude)<=180;
}

async function lookupRegion(request,env,headers){
  const data=await boundedJson(request,512);
  const {latitude,longitude,region}=data||{};
  const coordinates=validCoordinates(latitude,longitude);
  const manual=Array.isArray(region)&&region.length>=1&&region.length<=3&&
    region.every(name=>typeof name==='string'&&name.trim()&&name.length<=40);
  if(!coordinates&&!manual)return json({code:'INVALID_REGION'},400,headers);
  if(!env.QWEATHER_HOST||!env.QWEATHER_API_KEY)return json({code:'REGION_LOOKUP_UNAVAILABLE'},503,headers);

  const [province,city,district]=manual?region:[];
  const name=district&&!['市辖区','县','省直辖县级行政区划','自治区直辖县级行政区划'].includes(district)?district:city||province;
  const url=new URL('/geo/v2/city/lookup',env.QWEATHER_HOST);
  url.search=new URLSearchParams({location:coordinates?`${longitude.toFixed(2)},${latitude.toFixed(2)}`:districtName(name),lang:'zh',number:coordinates?'1':'20'});
  if(!coordinates&&city&&districtName(city)!==districtName(name))url.searchParams.set('adm',districtName(city));
  const response=await fetch(url,{headers:{'X-QW-Api-Key':env.QWEATHER_API_KEY},signal:AbortSignal.timeout(5500)}).catch(()=>null);
  if(!response?.ok)return json({code:'REGION_LOOKUP_UNAVAILABLE'},502,headers);
  const result=await response.json();
  const places=Array.isArray(result.location)?result.location:[];
  const place=coordinates?places[0]:places.find(place=>
    districtName(place.name||'')===districtName(name)&&provinceName(place.adm1||'')===provinceName(province)&&
    (!city||city===name||districtName(place.adm2||'')===districtName(city)));
  const lat=place?.lat==null?NaN:Number(place.lat),lon=place?.lon==null?NaN:Number(place.lon);
  if(!validCoordinates(lat,lon)||![place.adm1,place.adm2,place.name].every(value=>typeof value==='string'&&value)){
    return json({code:'REGION_NOT_FOUND'},404,headers);
  }
  const matchedRegion=[place.adm1,place.adm2,place.name];
  return json({region:coordinates?matchedRegion:region,latitude:Number(lat.toFixed(2)),longitude:Number(lon.toFixed(2))},200,headers);
}

async function weather(url,env,headers){
  const lat=Number(url.searchParams.get('lat')),lon=Number(url.searchParams.get('lon'));if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return json({code:'INVALID_LOCATION'},400,headers);
  if(env.QWEATHER_HOST&&env.QWEATHER_API_KEY){const target=`${env.QWEATHER_HOST.replace(/\/$/,'')}/weather/v1/current/${lat.toFixed(2)}/${lon.toFixed(2)}`;const response=await fetch(target,{headers:{'X-QW-Api-Key':env.QWEATHER_API_KEY}});if(response.ok){const payload=await response.json();const current=payload.current||payload.now||payload;const text=current.condition?.text||current.text||'多云';const temp=current.temperature?.value??current.temp??'--';return json({kind:weatherKind(text),text,temp:Number.isFinite(Number(temp))?Number(temp):'--',updated:now(),source:'qweather',sourceLabel:'天气服务实况'},200,headers);}}
  const target=new URL('https://api.open-meteo.com/v1/forecast');target.search=new URLSearchParams({latitude:lat.toFixed(4),longitude:lon.toFixed(4),current:'temperature_2m,weather_code',timezone:'auto'}).toString();const response=await fetch(target.toString(),{cf:{cacheTtl:300,cacheEverything:true}});if(!response.ok)return json({code:'WEATHER_UPSTREAM_FAILED'},502,headers);const payload=await response.json();const current=payload.current||{};const condition=openMeteoCondition(current.weather_code);const temp=current.temperature_2m;return json({...condition,temp:Number.isFinite(Number(temp))?Number(temp):'--',updated:current.time||now(),source:'open-meteo-model',sourceLabel:'天气模型数据（开发测试）',isModelled:true},200,headers);
}

async function createPost(request,user,env,headers){const data=await body(request);const content=(data?.content||'').trim();if(!content||content.length>1000)return json({code:'INVALID_POST'},400,headers);const postId=id();await env.DB.prepare("INSERT INTO posts (id,user_id,content,media_ids_json,location_precision) VALUES (?,?,?,?,?)").bind(postId,user.id,content,JSON.stringify(Array.isArray(data.mediaIds)?data.mediaIds.slice(0,9):[]),['hidden','city','district'].includes(data.locationPrecision)?data.locationPrecision:'hidden').run();return json({id:postId,status:'pending'},201,headers);}
async function listPosts(env,headers){const result=await env.DB.prepare("SELECT p.id,p.content,p.media_ids_json AS mediaIds,p.created_at AS createdAt,u.nickname,u.avatar_url AS avatarUrl FROM posts p JOIN users u ON u.id=p.user_id WHERE p.status='published' ORDER BY p.created_at DESC LIMIT 30").all();return json({items:(result.results||[]).map(post=>({...post,mediaIds:JSON.parse(post.mediaIds||'[]')}))},200,headers);}
async function upload(request,user,env,headers){const type=request.headers.get('content-type')||'';const size=Number(request.headers.get('content-length')||0);if(!/^image\/(jpeg|png|webp)$/.test(type)||size>4*1024*1024)return json({code:'INVALID_MEDIA'},400,headers);const assetId=id(),key=`users/${user.id}/${assetId}`;await env.MEDIA.put(key,request.body,{httpMetadata:{contentType:type}});await env.DB.prepare('INSERT INTO media_assets (id,user_id,object_key,content_type,bytes,status) VALUES (?,?,?,?,?,?)').bind(assetId,user.id,key,type,size,'pending').run();return json({id:assetId,status:'pending'},201,headers);}
async function adminPlants(request,user,env,headers){if(request.method==='GET'){const rows=await env.DB.prepare('SELECT * FROM plant_species ORDER BY updated_at DESC LIMIT 100').all();return json({items:rows.results||[]},200,headers);}const data=await body(request);if(!data?.name||!data?.category||!data?.summary)return json({code:'INVALID_PLANT'},400,headers);const plantId=id();await env.DB.prepare('INSERT INTO plant_species (id,name,scientific_name,category,aliases_json,summary,light,temperature,container,status,source) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(plantId,data.name.trim(),data.scientificName||null,data.category.trim(),JSON.stringify(data.aliases||[]),data.summary.trim(),data.light||null,data.temperature||null,data.container||null,'draft','admin').run();await env.DB.prepare('INSERT INTO audit_logs (id,actor_id,action,target_type,target_id) VALUES (?,?,?,?,?)').bind(id(),user.id,'create','plant_species',plantId).run();return json({id:plantId,status:'draft'},201,headers);}

async function createFeedback(request,user,env,headers){
  const data=await boundedJson(request);if(!data)return json({code:'INVALID_FEEDBACK'},400,headers);
  const category=data.category,content=typeof data.content==='string'?data.content.trim():'',contact=typeof data.contact==='string'?data.contact.trim():'';
  if(!['suggestion','bug','content','other'].includes(category)||content.length<8||content.length>1000||contact.length>100)return json({code:'INVALID_FEEDBACK'},400,headers);
  const ip=request.headers.get('CF-Connecting-IP');const ipHash=ip?await hash(ip,env.SESSION_SECRET||'feedback-rate-limit'):null;
  if(ipHash||user){const count=await env.DB.prepare("SELECT COUNT(*) AS count FROM user_feedback WHERE (ip_hash=? OR user_id=?) AND datetime(created_at)>=datetime('now','-1 day')").bind(ipHash,user?.id||null).first();if(Number(count?.count||0)>=5)return json({code:'FEEDBACK_RATE_LIMIT'},429,headers);}
  const feedbackId=id();await env.DB.prepare('INSERT INTO user_feedback (id,user_id,category,content,contact,ip_hash) VALUES (?,?,?,?,?,?)').bind(feedbackId,user?.id||null,category,content,contact,ipHash).run();
  return json({id:feedbackId,status:'open'},201,headers);
}
async function adminFeedback(request,url,user,env,headers){
  if(request.method==='GET'){
    const status=url.searchParams.get('status')||'all';if(!['all','open','reviewing','closed'].includes(status))return json({code:'INVALID_STATUS'},400,headers);
    const rows=await env.DB.prepare("SELECT id,category,content,contact,status,created_at AS createdAt,updated_at AS updatedAt FROM user_feedback WHERE (?='all' OR status=?) ORDER BY created_at DESC LIMIT 100").bind(status,status).all();
    return json({items:rows.results||[]},200,headers);
  }
  const feedbackId=url.pathname.slice('/v1/admin/feedback/'.length);if(request.method!=='PATCH'||!feedbackId)return json({code:'NOT_FOUND'},404,headers);
  const data=await boundedJson(request,512);if(!['open','reviewing','closed'].includes(data?.status))return json({code:'INVALID_STATUS'},400,headers);
  const result=await env.DB.prepare('UPDATE user_feedback SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(data.status,feedbackId).run();
  if(!result.meta?.changes)return json({code:'NOT_FOUND'},404,headers);
  await env.DB.prepare('INSERT INTO audit_logs (id,actor_id,action,target_type,target_id) VALUES (?,?,?,?,?)').bind(id(),user.id,'update_status','user_feedback',feedbackId).run();
  return json({id:feedbackId,status:data.status},200,headers);
}

const maxCorrectionPhotoBytes=512*1024;
const maxCorrectionBase64=4*Math.ceil(maxCorrectionPhotoBytes/3);
const reviewStates=['pending','reviewed','rejected'];

function isCorrectionJpeg(value){
  if(typeof value!=='string'||value.length>maxCorrectionBase64||!value.startsWith('/9j/'))return false;
  try{
    const jpeg=atob(value);
    return jpeg.length>=128&&jpeg.length<=maxCorrectionPhotoBytes&&jpeg.endsWith('\xff\xd9');
  }catch{return false;}
}

async function createPhotoCorrection(request,user,env,headers){
  const ip=request.headers.get('CF-Connecting-IP');
  if(!ip&&!user)return json({code:'UNAUTHORIZED'},401,headers);
  const data=await boundedJson(request,maxCorrectionBase64+4096);
  const note=typeof data?.note==='string'?data.note.trim():'';
  if(!data||data.authorized!==true||typeof data.plantId!=='string'||
     !/^[a-z0-9-]{1,80}$/.test(data.plantId)||note.length>400||!isCorrectionJpeg(data.photo)){
    return json({code:'INVALID_PHOTO_CORRECTION'},400,headers);
  }
  const plant=await env.DB.prepare(
    "SELECT id,scientific_name FROM plant_species WHERE id=? AND status='published'"
  ).bind(data.plantId).first();
  if(!plant)return json({code:'PLANT_NOT_FOUND'},404,headers);

  const ipHash=ip?await hash(ip,env.SESSION_SECRET||'photo-correction-rate-limit'):null;
  const correctionId=id();
  const result=await env.DB.prepare(`
    INSERT INTO plant_photo_corrections (id,plant_id,scientific_name,user_id,ip_hash,note,jpeg_base64)
    SELECT ?,?,?,?,?,?,?
    WHERE (SELECT COUNT(*) FROM plant_photo_corrections
           WHERE (user_id=? OR ip_hash=?) AND created_at>=datetime('now','-1 day'))<3
  `).bind(correctionId,plant.id,plant.scientific_name,user?.id||null,ipHash,note,data.photo,user?.id||null,ipHash).run();
  if(!result.meta?.changes)return json({code:'PHOTO_CORRECTION_RATE_LIMIT'},429,headers);
  return json({id:correctionId,status:'pending'},201,headers);
}

async function adminPhotoCorrections(request,url,user,env,headers){
  const prefix='/v1/admin/plant-photo-corrections';
  if(url.pathname===prefix&&request.method==='GET'){
    const status=url.searchParams.get('status')||'pending';
    if(!reviewStates.includes(status))return json({code:'INVALID_STATUS'},400,headers);
    const rows=await env.DB.prepare(`
      SELECT c.id,c.plant_id AS plantId,p.name AS plantName,c.scientific_name AS scientificName,
             c.note,c.status,c.created_at AS createdAt
      FROM plant_photo_corrections c JOIN plant_species p ON p.id=c.plant_id
      WHERE c.status=? ORDER BY c.created_at DESC LIMIT 50
    `).bind(status).all();
    return json({items:rows.results||[]},200,headers);
  }
  const correctionId=url.pathname.slice(prefix.length+1);
  if(!/^[0-9a-f-]{36}$/.test(correctionId))return json({code:'NOT_FOUND'},404,headers);
  if(request.method==='GET'){
    const row=await env.DB.prepare(
      'SELECT jpeg_base64 AS photo FROM plant_photo_corrections WHERE id=?'
    ).bind(correctionId).first();
    return row?json(row,200,headers):json({code:'NOT_FOUND'},404,headers);
  }
  if(request.method!=='PATCH')return json({code:'NOT_FOUND'},404,headers);
  const data=await boundedJson(request,512);
  if(!['reviewed','rejected'].includes(data?.status))return json({code:'INVALID_STATUS'},400,headers);
  const result=await env.DB.prepare(`
    UPDATE plant_photo_corrections SET status=?,reviewed_at=CURRENT_TIMESTAMP,reviewer_id=?
    WHERE id=? AND status='pending'
  `).bind(data.status,user.id,correctionId).run();
  if(!result.meta?.changes)return json({code:'CORRECTION_NOT_PENDING'},409,headers);
  return json({id:correctionId,status:data.status},200,headers);
}

export default {
  async fetch(request,env){const headers=cors(request);if(request.method==='OPTIONS')return new Response(null,{status:204,headers});const url=new URL(request.url);try{
    if(url.pathname==='/manage'||url.pathname.startsWith('/manage/'))return await handleAdmin(request,env,url);
    if(request.method==='GET'&&url.pathname==='/v1/catalog/photo-overrides')return await publicPhotoOverrides(env.DB);
    const photoPath=/^\/v1\/catalog\/photos\/([a-z0-9-]{1,80})$/.exec(url.pathname);
    if(request.method==='GET'&&photoPath)return await publicCatalogPhoto(env,request,url,photoPath[1]);
    if(request.method==='GET'&&url.pathname==='/health')return json({ok:true,service:'chaomu-tianshi-api',time:now()},200,headers);
    if(request.method==='POST'&&url.pathname==='/v1/auth/wechat')return login(request,env,headers);
    if(request.method==='GET'&&url.pathname==='/v1/plants')return plants(url,env,headers);
    if(request.method==='GET'&&url.pathname==='/v1/context/weather')return weather(url,env,headers);
    if(request.method==='POST'&&url.pathname==='/v1/context/region')return lookupRegion(request,env,headers);
    const user=await currentUser(request,env);
    if(request.method==='GET'&&url.pathname==='/v1/auth/me'){const denied=requireUser(user,headers);return denied||json({user:{id:user.id.slice(0,12),isAdmin:!requireAdmin(user,env,headers)}},200,headers);}
    if(request.method==='POST'&&url.pathname==='/v1/feedback')return createFeedback(request,user,env,headers);
    if(request.method==='POST'&&url.pathname==='/v1/plant-photo-corrections')return createPhotoCorrection(request,user,env,headers);
    if(url.pathname==='/v1/admin/feedback'||url.pathname.startsWith('/v1/admin/feedback/')){const denied=requireAdmin(user,env,headers);return denied||adminFeedback(request,url,user,env,headers);}
    if(url.pathname==='/v1/admin/plant-photo-corrections'||url.pathname.startsWith('/v1/admin/plant-photo-corrections/')){
      const denied=requireAdmin(user,env,headers);
      return denied||adminPhotoCorrections(request,url,user,env,headers);
    }
    if(request.method==='GET'&&url.pathname==='/v1/community/posts')return listPosts(env,headers);
    if(request.method==='POST'&&url.pathname==='/v1/community/posts'){const denied=requireUser(user,headers);return denied||createPost(request,user,env,headers);}
    if(request.method==='POST'&&url.pathname==='/v1/media/upload'){const denied=requireUser(user,headers);return denied||upload(request,user,env,headers);}
    if(url.pathname==='/v1/admin/plants'){const denied=requireAdmin(user,env,headers);return denied||adminPlants(request,user,env,headers);}
    if(url.pathname.startsWith('/v1/payments/'))return json({code:'PAYMENTS_NOT_CONFIGURED',message:'支付必须在商户资料和回调验签配置完成后开启'},501,headers);
    return json({code:'NOT_FOUND'},404,headers);
  }catch(error){console.error(error);return json({code:'INTERNAL_ERROR'},500,headers);}},
  async scheduled(controller,env){if(controller.cron==='15 1 * * *'){
    await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now()).run();
    await env.DB.prepare("DELETE FROM web_admin_sessions WHERE expires_at < ?").bind(now()).run();
    await env.DB.prepare("DELETE FROM web_admin_attempts WHERE attempted_at<datetime('now','-1 day')").bind().run();
  }}
};

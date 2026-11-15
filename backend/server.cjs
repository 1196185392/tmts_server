/*
 * One small reference service for 朝暮田事.
 * It is deliberately dependency-free so it can be deployed to a Node runtime
 * or used as a starting point for a cloud function. It is not a payment or
 * community production service yet: use a real database, key rotation, rate
 * limits and content moderation before public release.
 */
const http=require('node:http');
const crypto=require('node:crypto');
const plants=require('../miniprogram/utils/plants');
const port=Number(process.env.PORT||8787);

function json(res,status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(JSON.stringify(payload));}
function configured(...names){return names.every(name=>Boolean(process.env[name]));}
function body(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>16384)reject(new Error('BODY_TOO_LARGE'));});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{});}catch{reject(new Error('INVALID_JSON'));}});req.on('error',reject);});}
function sign(payload){const data=Buffer.from(JSON.stringify(payload)).toString('base64url');const signature=crypto.createHmac('sha256',process.env.AUTH_SECRET).update(data).digest('base64url');return data+'.'+signature;}
function weatherKind(text=''){if(/雪|冰雹/.test(text))return'snow';if(/雨|雷/.test(text))return'rain';if(/晴/.test(text))return'sunny';return'cloudy';}

async function wechatLogin(req,res){
  if(!configured('WECHAT_APP_ID','WECHAT_APP_SECRET','AUTH_SECRET')){json(res,503,{code:'AUTH_NOT_CONFIGURED',message:'微信登录服务尚未配置'});return;}
  const {code}=await body(req);if(typeof code!=='string'||!code){json(res,400,{code:'INVALID_CODE'});return;}
  const url=new URL('https://api.weixin.qq.com/sns/jscode2session');url.search=new URLSearchParams({appid:process.env.WECHAT_APP_ID,secret:process.env.WECHAT_APP_SECRET,js_code:code,grant_type:'authorization_code'}).toString();
  const response=await fetch(url);const session=await response.json();
  if(!session.openid){json(res,401,{code:'WECHAT_LOGIN_FAILED',message:session.errmsg||'微信登录失败'});return;}
  const now=Math.floor(Date.now()/1000);const token=sign({sub:session.openid,iat:now,exp:now+7*24*3600});
  json(res,200,{accessToken:token,expiresIn:7*24*3600,user:{id:session.openid.slice(0,8)+'…'}});
}

async function weather(req,res,url){
  if(!configured('QWEATHER_HOST','QWEATHER_API_KEY')){json(res,503,{code:'WEATHER_NOT_CONFIGURED',message:'天气服务尚未配置'});return;}
  const lat=Number(url.searchParams.get('lat')),lon=Number(url.searchParams.get('lon'));
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){json(res,400,{code:'INVALID_LOCATION'});return;}
  const base=process.env.QWEATHER_HOST.replace(/\/$/,'');
  const response=await fetch(base+'/weather/v1/current/'+lat.toFixed(2)+'/'+lon.toFixed(2),{headers:{'X-QW-Api-Key':process.env.QWEATHER_API_KEY}});
  if(!response.ok){json(res,502,{code:'WEATHER_UPSTREAM_FAILED'});return;}
  const payload=await response.json();const current=payload.current||payload.now||{};const text=current.condition?.text||current.text||'多云';const temp=current.temperature?.value??current.temp??'--';
  json(res,200,{kind:weatherKind(text),text,temp:Number.isFinite(Number(temp))?Number(temp):'--',updated:new Date().toISOString(),source:'qweather'});
}

function catalog(res,url){
  const query=(url.searchParams.get('query')||'').trim().toLowerCase();const category=url.searchParams.get('category');
  const items=plants.filter(plant=>(!category||plant.category===category)&&(!query||(plant.name+plant.en+plant.alias).toLowerCase().includes(query))).map(plant=>({id:plant.id,name:plant.name,category:plant.category,summary:plant.summary,light:plant.light,temp:plant.temp,source:'local-curated-example'}));
  json(res,200,{items,source:'local-curated-example',notice:'播期和推荐需按地区规则审核后再发布'});
}

http.createServer(async(req,res)=>{try{
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}).end();return;}
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&url.pathname==='/health'){json(res,200,{ok:true,service:'yifangtiandi-api'});return;}
  if(req.method==='POST'&&url.pathname==='/v1/auth/wechat'){await wechatLogin(req,res);return;}
  if(req.method==='GET'&&url.pathname==='/v1/context/weather'){await weather(req,res,url);return;}
  if(req.method==='GET'&&url.pathname==='/v1/plants'){catalog(res,url);return;}
  if(url.pathname.startsWith('/v1/community/')){json(res,501,{code:'COMMUNITY_NOT_IMPLEMENTED',message:'社区需要账户、审核与存储后才开放'});return;}
  json(res,404,{code:'NOT_FOUND'});
}catch(error){json(res,500,{code:'INTERNAL_ERROR',message:error.message});}}).listen(port,'127.0.0.1',()=>console.log('朝暮田事 API: http://127.0.0.1:'+port));

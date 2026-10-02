require("dotenv").config();

const {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
  PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField,
  ActivityType
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const TOKEN = String(process.env.DISCORD_TOKEN || "").trim();
const CLIENT_ID = String(process.env.CLIENT_ID || "").trim();
const GUILD_ID = String(process.env.GUILD_ID || "").trim();

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ Thiếu DISCORD_TOKEN hoặc CLIENT_ID trong .env");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions]
});

const DATA_DIR = path.join(__dirname, "..", "data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, {recursive:true});
if (!fs.existsSync(CONFIG_FILE)) fs.writeFileSync(CONFIG_FILE, "{}");

const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")); }
  catch { return {}; }
}
function saveConfig(x) { fs.writeFileSync(CONFIG_FILE, JSON.stringify(x, null, 2)); }

const ROLE_DEFS = [
  // name, color, key, Discord permissions
  ["👑💎 CAO HƠN OWNER",0xFFF4A3,"higher_owner",["Administrator"]],
  ["OWNER",0xFF00CC,"owner",["Administrator"]],
  ["👑・Owner",0xC62828,"owner2",["Administrator"]],
  ["👑・Founder",0x2196F3,"founder",["Administrator"]],
  ["🔥・Admin",0x1746D1,"admin",[
    "ManageGuild","ManageChannels","ManageRoles","ManageMessages","KickMembers","BanMembers",
    "ModerateMembers","ViewAuditLog","ManageNicknames","MuteMembers","DeafenMembers","MoveMembers"
  ]],
  ["🛡️・Cloud Support",0x6A00FF,"cloud_support",[
    "ModerateMembers","KickMembers","BanMembers","ManageMessages","ManageChannels","ViewAuditLog",
    "ReadMessageHistory","SendMessages","Connect","Speak"
  ]],
  ["🤝・Partner",0xE53935,"partner",["SendMessages","EmbedLinks","AttachFiles","ReadMessageHistory"]],
  ["⚕️・Ceo-đẹp trai",0x8B78D8,"ceo",["SendMessages","ReadMessageHistory"]],
  ["🔥・Đẹp Trai",0xF21B1B,"handsome",["SendMessages","ReadMessageHistory"]],
  ["💵・Buyer",0x6D28D9,"buyer",["SendMessages","ReadMessageHistory"]],
  ["🏳️‍🌈👑・GAY TO",0xFF00CC,"gay_to",["SendMessages","ReadMessageHistory"]],
  ["✅・Verified",0x00D9C0,"verified",["ViewChannel","SendMessages","ReadMessageHistory","Connect","Speak"]],
  ["🤖・BOT",0x5865F2,"bot",[]],
  ["💎・Booster",0xF47FFF,"booster",["ViewChannel","SendMessages","ReadMessageHistory","Connect","Speak"]],
  ["🏆・VIP",0xFFD700,"vip",["ViewChannel","SendMessages","ReadMessageHistory","Connect","Speak"]],
  ["🎮・Member",0x57F287,"member",["ViewChannel","SendMessages","ReadMessageHistory","Connect","Speak"]],
  ["👤・New Member",0x95A5A6,"new_member",["ViewChannel","ReadMessageHistory"]]
];

const ROLE_PERMISSIONS = Object.fromEntries(ROLE_DEFS.map(([, , key, perms]) => [
  key, perms.reduce((bits, name) => bits | PermissionFlagsBits[name], 0n)
]));

const CATEGORIES = [
  {name:"📌 INFORMATION", channels:[["📢・announcements","text"],["📜・rules","text"],["📋・server-info","text"],["📅・events","text"],["🔗・socials","text"]]},
  {name:"💬 COMMUNITY", channels:[["💬・general","text"],["🎮・gaming","text"],["📸・media","text"],["😂・memes","text"],["🤖・bot-commands","text"]]},
  {name:"🎮 GAMING", channels:[["🏆・leaderboard","text"],["🎯・looking-for-group","text"],["📸・game-clips","text"],["🏅・achievements","text"],["🎁・giveaways","text"]]},
  {name:"🔊 VOICE", channels:[["🎮・Gaming 1","voice"],["🎮・Gaming 2","voice"],["🎮・Gaming 3","voice"],["💬・Chill","voice"],["💤・AFK","voice"]]},
  {name:"🎫 SUPPORT", channels:[["🎫・create-ticket","text"],["📢・support-info","text"],["📚・faq","text"]]},
  {name:"🏆 EVENTS", channels:[["📢・event-news","text"],["📝・event-register","text"],["🏆・event-results","text"]]},
  {name:"💎 BOOSTER", channels:[["💎・booster-chat","text"],["🔊・booster-room","voice"]]},
  {name:"🔒 STAFF", channels:[["🔐・staff-chat","text"],["📋・staff-logs","text"],["🚨・reports","text"],["🎫・ticket-logs","text"],["📜・mod-logs","text"]]},
  {name:"🤖 BOT", channels:[["🤖・bot-commands","text"],["📊・bot-logs","text"]]}
];

function admin(i){return i.memberPermissions?.has(PermissionFlagsBits.Administrator);}
function has(i,p){return i.memberPermissions?.has(p);}
function ok(i,msg){return i.reply({content:`✅ ${msg}`,ephemeral:true});}
function fail(i,msg){return i.reply({content:`❌ ${msg}`,ephemeral:true});}
function safeName(user){return user.username.toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,18)||user.id;}

function setupPanel(){
  const embed=new EmbedBuilder().setColor(0x5865F2)
    .setTitle("☁️ CLOUD GAMES — AUTO SERVER SETUP")
    .setDescription("Chọn kiểu server. Bot sẽ hỏi xác nhận trước khi tạo.")
    .addFields(
      {name:"☁️ Cloud Games",value:"17 Roles + Categories + Channels + Permissions + Ticket + Rules + Logs",inline:false},
      {name:"🛡️ Quyền Staff",value:"OWNER/Founder/Admin quản trị • Cloud Support có Mute/Timeout + Kick + Ban + Warn + Lock + Clear + Ticket",inline:false}
    ).setFooter({text:"Cloud Games Auto Setup V4"});
  const menu=new StringSelectMenuBuilder().setCustomId("setup_type").setPlaceholder("☁️ Chọn kiểu server...")
    .addOptions(
      {label:"Cloud Games",value:"cloud_games",emoji:"☁️",description:"Full server gaming"},
      {label:"Gaming",value:"gaming",emoji:"🎮",description:"Cộng đồng gaming"},
      {label:"Community",value:"community",emoji:"👥",description:"Server cộng đồng"},
      {label:"Shop",value:"shop",emoji:"🛒",description:"Server shop"},
      {label:"Custom",value:"custom",emoji:"⚙️",description:"Cấu hình tùy chỉnh"}
    );
  return {embeds:[embed],components:[new ActionRowBuilder().addComponents(menu)]};
}
function typeName(t){return {cloud_games:"☁️ Cloud Games",gaming:"🎮 Gaming",community:"👥 Community",shop:"🛒 Shop",custom:"⚙️ Custom"}[t]||"☁️ Cloud Games";}
function confirmPanel(type){
  const e=new EmbedBuilder().setColor(0x57F287).setTitle(`${typeName(type)} — XÁC NHẬN`)
    .setDescription("Tạo cấu trúc server mà không xóa channel/role hiện có.\n\n• 17 roles màu riêng\n• 9 categories\n• 30+ channels\n• Staff permissions\n• Rules / Announcement\n• Ticket panel\n• Moderation commands");
  return {embeds:[e],components:[new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`setup_start:${type}`).setLabel("🚀 BẮT ĐẦU SETUP").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("setup_cancel").setLabel("❌ HỦY").setStyle(ButtonStyle.Danger)
  )]};
}


function extraCommands(){
  const c=[];
  const {SlashCommandUserOption,SlashCommandRoleOption,SlashCommandChannelOption,SlashCommandStringOption,SlashCommandIntegerOption,SlashCommandBooleanOption}=require("discord.js");
  // discord.js v14 SlashCommandBuilder does not expose addOptions() on all supported builder versions.
  // Use the dedicated add*Option methods so command registration works reliably.
  const userOpt=(name="user",desc="Thành viên")=>b=>b.addUserOption(o=>o.setName(name).setDescription(desc));
  const roleOpt=(name="role",desc="Role")=>b=>b.addRoleOption(o=>o.setName(name).setDescription(desc));
  const channelOpt=(name="channel",desc="Kênh")=>b=>b.addChannelOption(o=>o.setName(name).setDescription(desc));
  const textOpt=(name,desc,req=false)=>b=>b.addStringOption(o=>o.setName(name).setDescription(desc).setRequired(req));
  const intOpt=(name,desc,req=false,min,max)=>b=>b.addIntegerOption(o=>{o.setName(name).setDescription(desc).setRequired(req); if(min!==undefined)o.setMinValue(min); if(max!==undefined)o.setMaxValue(max); return o;});
  const boolOpt=(name,desc,req=false)=>b=>b.addBooleanOption(o=>o.setName(name).setDescription(desc).setRequired(req));
  const add=(name,desc,opts=[])=>{const b=new SlashCommandBuilder().setName(name).setDescription(desc); for(const apply of opts) apply(b); c.push(b);};
  add("ping","Kiểm tra độ trễ bot");
  add("botinfo","Thông tin bot");
  add("uptime","Xem thời gian bot đã chạy");
  add("membercount","Xem thống kê thành viên");
  add("channel-list","Liệt kê kênh trong server");
  add("role-info","Xem thông tin role",[roleOpt()]);
  add("channel-info","Xem thông tin kênh",[channelOpt()]);
  add("bot-list","Liệt kê bot trong server");
  add("dashboard","Bảng điều khiển nhanh server");
  add("invite","Tạo invite cho kênh hiện tại");
  add("user-id","Lấy User ID",[userOpt()]);
  add("banner","Xem banner thành viên",[userOpt()]);
  add("poll","Tạo bình chọn",[textOpt("question","Câu hỏi",true),textOpt("option1","Lựa chọn 1",true),textOpt("option2","Lựa chọn 2",true),textOpt("option3","Lựa chọn 3"),textOpt("option4","Lựa chọn 4")]);
  add("choose","Bot chọn ngẫu nhiên",[textOpt("options","Các lựa chọn, ngăn cách bằng dấu |",true)]);
  add("calc","Tính biểu thức số",[textOpt("expression","Ví dụ: (10+5)*2",true)]);
  add("timestamp","Tạo timestamp Discord",[intOpt("unix","Unix timestamp",true,0)]);
  add("remind","Đặt nhắc nhở",[intOpt("minutes","Số phút",true,1,10080),textOpt("message","Nội dung",true)]);
  add("reminders","Xem nhắc nhở của bạn");
  add("remind-cancel","Hủy nhắc nhở",[textOpt("id","ID nhắc nhở",true)]);
  add("note-add","Lưu ghi chú cá nhân",[textOpt("name","Tên ghi chú",true),textOpt("content","Nội dung",true)]);
  add("note-list","Xem ghi chú cá nhân");
  add("note-delete","Xóa ghi chú cá nhân",[textOpt("name","Tên ghi chú",true)]);
  add("warn-list","Xem cảnh cáo của thành viên",[userOpt()]);
  add("warn-clear","Xóa cảnh cáo của thành viên",[userOpt()]);
  add("nick","Đổi nickname thành viên",[userOpt(),textOpt("nickname","Nickname",true)]);
  add("nick-reset","Xóa nickname",[userOpt()]);
  add("role-color","Đổi màu role",[roleOpt(),textOpt("color","HEX, ví dụ #5865F2",true)]);
  add("role-hoist","Bật/tắt role hoist",[roleOpt(),boolOpt("enabled","Hiển thị riêng",true)]);
  add("role-mentionable","Bật/tắt role mentionable",[roleOpt(),boolOpt("enabled","Cho phép mention",true)]);
  add("role-perms","Xem quyền role",[roleOpt()]);
  add("channel-create","Tạo text/voice channel",[textOpt("name","Tên kênh",true),textOpt("type","text hoặc voice",true)]);
  add("channel-delete","Xóa kênh",[channelOpt()]);
  add("channel-rename","Đổi tên kênh",[textOpt("name","Tên mới",true),channelOpt()]);
  add("channel-topic","Đặt topic kênh",[textOpt("topic","Topic",true),channelOpt()]);
  add("category-create","Tạo category",[textOpt("name","Tên category",true)]);
  add("channel-nsfw","Bật/tắt NSFW",[boolOpt("enabled","NSFW",true),channelOpt()]);
  add("channel-slowmode","Đặt slowmode cho kênh",[intOpt("seconds","0-21600 giây",true,0,21600),channelOpt()]);
  add("channel-sync","Đồng bộ permission với category",[channelOpt()]);
  add("clone","Nhân bản kênh hiện tại");
  add("pin","Ghim tin nhắn",[textOpt("message_id","Message ID",true)]);
  add("unpin","Bỏ ghim tin nhắn",[textOpt("message_id","Message ID",true)]);
  add("pins","Xem danh sách tin nhắn đã ghim");
  add("thread-create","Tạo thread",[textOpt("name","Tên thread",true),textOpt("message","Tin nhắn đầu tiên")]);
  add("emoji-add","Thêm emoji từ URL",[textOpt("name","Tên emoji",true),textOpt("url","URL ảnh",true)]);
  add("voice-move","Chuyển thành viên sang voice khác",[userOpt(),channelOpt("channel","Voice channel")]);
  add("voice-disconnect","Ngắt voice thành viên",[userOpt()]);
  add("voice-mute","Server mute thành viên",[userOpt()]);
  add("voice-deafen","Server deafen thành viên",[userOpt()]);
  add("voice-unmute","Bỏ server mute",[userOpt()]);
  add("dm","Gửi DM cho thành viên",[userOpt(),textOpt("message","Nội dung",true)]);
  add("embed","Gửi embed",[textOpt("title","Tiêu đề",true),textOpt("message","Nội dung",true)]);
  add("role-give-self","Tự nhận role",[roleOpt()]);
  add("role-take-self","Tự bỏ role",[roleOpt()]);
  add("auto-role-set","Đặt role tự động cho thành viên mới",[roleOpt()]);
  add("auto-role-off","Tắt auto role");
  add("autorole-status","Xem auto role");
  add("welcome-set","Đặt kênh + nội dung welcome",[channelOpt(),textOpt("message","Dùng {user} và {server}",true)]);
  add("welcome-off","Tắt welcome");
  add("welcome-status","Xem cấu hình welcome");
  add("prune","Xóa thành viên không hoạt động",[intOpt("days","Số ngày",true,1,30)]);
  add("clear-bots","Xóa tin nhắn gần đây của bot",[intOpt("amount","1-100",true,1,100)]);
  add("clear-user","Xóa tin nhắn gần đây của một user",[userOpt(),intOpt("amount","1-100",true,1,100)]);
  add("purge-links","Xóa tin nhắn chứa link gần đây",[intOpt("amount","1-100",true,1,100)]);
  add("emergency-lockdown","Khóa toàn bộ text channels khẩn cấp");
  add("emergency-unlock","Mở khóa lockdown");
  add("verify","Gán role Verified cho thành viên",[userOpt()]);
  add("unverify","Gỡ role Verified",[userOpt()]);
  add("ticket-add","Thêm thành viên vào ticket",[userOpt()]);
  add("ticket-remove","Xóa thành viên khỏi ticket",[userOpt()]);

  // Grouped management suites keep the bot under Discord's 100 top-level command limit.
  const events=new SlashCommandBuilder().setName("events").setDescription("Quản lý event server");
  events.addSubcommand(s=>s.setName("create").setDescription("Tạo event").addStringOption(o=>o.setName("title").setDescription("Tên event").setRequired(true)).addIntegerOption(o=>o.setName("minutes").setDescription("Thời lượng phút").setRequired(true).setMinValue(1).setMaxValue(10080)).addStringOption(o=>o.setName("description").setDescription("Mô tả")).addChannelOption(o=>o.setName("channel").setDescription("Kênh đăng event")));
  events.addSubcommand(s=>s.setName("list").setDescription("Danh sách event"));
  events.addSubcommand(s=>s.setName("rsvp").setDescription("Đăng ký event").addStringOption(o=>o.setName("id").setDescription("Event ID").setRequired(true)));
  events.addSubcommand(s=>s.setName("cancel").setDescription("Hủy event").addStringOption(o=>o.setName("id").setDescription("Event ID").setRequired(true)));
  events.addSubcommand(s=>s.setName("end").setDescription("Kết thúc event").addStringOption(o=>o.setName("id").setDescription("Event ID").setRequired(true)));
  c.push(events);

  const giveaway=new SlashCommandBuilder().setName("giveaway").setDescription("Quản lý giveaway");
  giveaway.addSubcommand(s=>s.setName("create").setDescription("Tạo giveaway").addStringOption(o=>o.setName("prize").setDescription("Phần thưởng").setRequired(true)).addIntegerOption(o=>o.setName("minutes").setDescription("Thời lượng phút").setRequired(true).setMinValue(1).setMaxValue(10080)).addIntegerOption(o=>o.setName("winners").setDescription("Số người thắng").setRequired(true).setMinValue(1).setMaxValue(20)).addChannelOption(o=>o.setName("channel").setDescription("Kênh đăng giveaway")));
  giveaway.addSubcommand(s=>s.setName("list").setDescription("Danh sách giveaway"));
  giveaway.addSubcommand(s=>s.setName("enter").setDescription("Tham gia giveaway").addStringOption(o=>o.setName("id").setDescription("Giveaway ID").setRequired(true)));
  giveaway.addSubcommand(s=>s.setName("end").setDescription("Kết thúc giveaway").addStringOption(o=>o.setName("id").setDescription("Giveaway ID").setRequired(true)));
  giveaway.addSubcommand(s=>s.setName("reroll").setDescription("Reroll người thắng").addStringOption(o=>o.setName("id").setDescription("Giveaway ID").setRequired(true)));
  giveaway.addSubcommand(s=>s.setName("cancel").setDescription("Hủy giveaway").addStringOption(o=>o.setName("id").setDescription("Giveaway ID").setRequired(true)));
  c.push(giveaway);

  const automod=new SlashCommandBuilder().setName("automod").setDescription("Anti-spam và AutoMod server");
  automod.addSubcommand(s=>s.setName("enable").setDescription("Bật auto moderation").addBooleanOption(o=>o.setName("links").setDescription("Chặn link")).addBooleanOption(o=>o.setName("invites").setDescription("Chặn invite Discord")).addBooleanOption(o=>o.setName("caps").setDescription("Chặn CAPS")).addBooleanOption(o=>o.setName("spam").setDescription("Chặn spam")));
  automod.addSubcommand(s=>s.setName("disable").setDescription("Tắt auto moderation"));
  automod.addSubcommand(s=>s.setName("status").setDescription("Xem trạng thái AutoMod"));
  automod.addSubcommand(s=>s.setName("whitelist").setDescription("Whitelist kênh").addChannelOption(o=>o.setName("channel").setDescription("Kênh").setRequired(true)).addBooleanOption(o=>o.setName("enabled").setDescription("Bật whitelist").setRequired(true)));
  c.push(automod);

  const settings=new SlashCommandBuilder().setName("server-settings").setDescription("Cấu hình hệ thống quản lý server");
  settings.addSubcommand(s=>s.setName("logs").setDescription("Đặt kênh log").addChannelOption(o=>o.setName("channel").setDescription("Kênh log").setRequired(true)));
  settings.addSubcommand(s=>s.setName("logs-off").setDescription("Tắt log"));
  settings.addSubcommand(s=>s.setName("suggestions").setDescription("Đặt kênh suggestions").addChannelOption(o=>o.setName("channel").setDescription("Kênh suggestions").setRequired(true)));
  settings.addSubcommand(s=>s.setName("suggestions-off").setDescription("Tắt suggestions"));
  settings.addSubcommand(s=>s.setName("leveling").setDescription("Bật/tắt hệ thống XP").addBooleanOption(o=>o.setName("enabled").setDescription("Bật XP").setRequired(true)));
  settings.addSubcommand(s=>s.setName("starboard").setDescription("Đặt kênh starboard").addChannelOption(o=>o.setName("channel").setDescription("Kênh").setRequired(true)).addIntegerOption(o=>o.setName("threshold").setDescription("Số reaction ⭐").setRequired(true).setMinValue(2).setMaxValue(20)));
  settings.addSubcommand(s=>s.setName("starboard-off").setDescription("Tắt starboard"));
  settings.addSubcommand(s=>s.setName("status").setDescription("Xem toàn bộ cấu hình"));
  c.push(settings);
  return c;
}

function formatDuration(ms){
  let s=Math.floor(ms/1000), d=Math.floor(s/86400); s%=86400; let h=Math.floor(s/3600); s%=3600; let m=Math.floor(s/60); s%=60;
  return `${d?d+"d ":""}${h?h+"h ":""}${m?m+"m ":""}${s}s`.trim();
}
function getGuildCfg(guildId){const cfg=loadConfig(); cfg[guildId] ||= {}; return cfg;}
function saveGuildCfg(guildId,data){const cfg=loadConfig(); cfg[guildId]={...(cfg[guildId]||{}),...data}; saveConfig(cfg); return cfg[guildId];}
function extraPerm(i,p){return i.memberPermissions?.has(p);}
function requireExtraPerm(i,p,msg){return extraPerm(i,p)?true:fail(i,msg||`Thiếu quyền ${String(p)}.`);}
async function fetchTextMessages(channel,limit=100){return channel.messages.fetch({limit}).catch(()=>new Map());}
function parseSafeMath(expr){
  if(!/^[0-9+\-*/%().\s]+$/.test(expr)||expr.length>100) return null;
  try { const v=Function(`"use strict"; return (${expr})`)(); return Number.isFinite(v)?v:null; } catch{return null;}
}
function scheduleReminder(userId,guildId,delayMs,message,id){
  setTimeout(async()=>{
    const cfg=loadConfig(); const list=cfg.reminders?.[userId]||[]; const idx=list.findIndex(x=>x.id===id); if(idx<0)return;
    const item=list[idx]; list.splice(idx,1); saveConfig(cfg);
    try{const u=await client.users.fetch(userId); await u.send(`⏰ **Nhắc nhở:** ${item.message}`).catch(()=>{});}catch{}
  },Math.max(1000,delayMs));
}
function restoreReminders(){const cfg=loadConfig(), now=Date.now(); for(const [uid,list] of Object.entries(cfg.reminders||{})){for(const item of list){const delay=Math.max(1000,new Date(item.at).getTime()-now); scheduleReminder(uid,item.guildId,delay,item.message,item.id);}}}

function makeId(prefix){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;}
function cfgSection(guildId,key,def){const cfg=loadConfig(); cfg[guildId] ||= {}; if(cfg[guildId][key]===undefined){cfg[guildId][key]=def; saveConfig(cfg);} return cfg[guildId][key];}
function updateGuildSection(guildId,key,value){const cfg=loadConfig(); cfg[guildId] ||= {}; cfg[guildId][key]=value; saveConfig(cfg); return value;}
async function postEvent(guild,i){
  const title=i.options.getString("title",true), minutes=i.options.getInteger("minutes",true), description=i.options.getString("description")||"Tham gia event bằng nút bên dưới.", ch=i.options.getChannel("channel")||i.channel;
  if(!ch?.isTextBased()) return fail(i,"Kênh event phải là text channel.");
  const id=makeId("evt"), item={id,title,description,channelId:ch.id,messageId:null,creatorId:i.user.id,endsAt:Date.now()+minutes*60000,participants:[],ended:false};
  const embed=new EmbedBuilder().setColor(0x57F287).setTitle(`🎉 EVENT • ${title}`).setDescription(description).addFields({name:"⏰ Kết thúc",value:`<t:${Math.floor(item.endsAt/1000)}:R>`,inline:true},{name:"👥 Đăng ký",value:"0",inline:true}).setFooter({text:`Event ID: ${id}`});
  const msg=await ch.send({embeds:[embed],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`event_rsvp:${id}`).setLabel("🎉 THAM GIA").setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId(`event_leave:${id}`).setLabel("↩️ RỜI EVENT").setStyle(ButtonStyle.Secondary))]});
  item.messageId=msg.id; const cfg=loadConfig(); cfg[guild.id] ||= {}; cfg[guild.id].events ||= []; cfg[guild.id].events.push(item); saveConfig(cfg); return ok(i,`Đã tạo event **${title}** • ID: \`${id}\``);
}
async function finishEvent(guild,id,cancel=false){
  const cfg=loadConfig(); cfg[guild.id] ||= {}; const list=cfg[guild.id].events||[], item=list.find(x=>x.id===id); if(!item)return null; if(item.ended)return item;
  item.ended=true; item.cancelled=cancel; saveConfig(cfg);
  const ch=guild.channels.cache.get(item.channelId); const msg=ch?.messages?.fetch?await ch.messages.fetch(item.messageId).catch(()=>null):null;
  if(msg){const e=new EmbedBuilder().setColor(cancel?0xED4245:0x5865F2).setTitle(`${cancel?"🛑 EVENT HỦY":"🏁 EVENT KẾT THÚC"} • ${item.title}`).setDescription(cancel?"Event đã bị hủy.":`Đã kết thúc. Có **${item.participants.length}** người tham gia.`).setFooter({text:`Event ID: ${id}`}); await msg.edit({embeds:[e],components:[]}).catch(()=>{});}
  return item;
}
function pickWinners(ids,count){const a=[...new Set(ids)]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a.slice(0,Math.min(count,a.length));}
async function finishGiveaway(guild,id){
  const cfg=loadConfig(); cfg[guild.id] ||= {}; const list=cfg[guild.id].giveaways||[], item=list.find(x=>x.id===id); if(!item)return null; if(item.ended)return item;
  item.ended=true; item.winners=pickWinners(item.participants,item.winnerCount); saveConfig(cfg);
  const ch=guild.channels.cache.get(item.channelId); const msg=ch?.messages?.fetch?await ch.messages.fetch(item.messageId).catch(()=>null):null;
  const winnerText=item.winners.length?item.winners.map(x=>`<@${x}>`).join(", "):"Không đủ người tham gia.";
  if(msg){const e=new EmbedBuilder().setColor(0xFFD700).setTitle(`🏆 GIVEAWAY KẾT THÚC • ${item.prize}`).setDescription(`Người thắng: ${winnerText}\n\n👥 Người tham gia: **${item.participants.length}**`).setFooter({text:`Giveaway ID: ${id}`}); await msg.edit({embeds:[e],components:[]}).catch(()=>{});}
  if(item.winners.length&&ch?.isTextBased()) await ch.send(`🎉 Chúc mừng ${winnerText}! Bạn đã thắng **${item.prize}**!`).catch(()=>{});
  return item;
}
function scheduleEventsAndGiveaways(){
  const cfg=loadConfig(), now=Date.now();
  for(const [gid,g] of Object.entries(cfg)){
    for(const e of (g.events||[])){if(!e.ended){setTimeout(()=>{const guild=client.guilds.cache.get(gid); if(guild)finishEvent(guild,e.id).catch(()=>{});},Math.max(1000,e.endsAt-now));}}
    for(const x of (g.giveaways||[])){if(!x.ended){setTimeout(()=>{const guild=client.guilds.cache.get(gid); if(guild)finishGiveaway(guild,x.id).catch(()=>{});},Math.max(1000,x.endsAt-now));}}
  }
}
function autoModerationCheck(message){
  if(!message.guild||message.author.bot)return false;
  const cfg=loadConfig()[message.guild.id]?.automod; if(!cfg?.enabled)return false;
  if(cfg.whitelist?.includes(message.channel.id))return false;
  const text=message.content||"";
  const reasons=[];
  if(cfg.links && /https?:\/\//i.test(text))reasons.push("link");
  if(cfg.invites && /(discord\.gg\/|discord\.com\/invite\/)/i.test(text))reasons.push("invite");
  if(cfg.caps && text.length>=12){const letters=text.replace(/[^A-Za-zÀ-ỹ]/g,""); const upper=[...letters].filter(x=>x===x.toUpperCase()&&x!==x.toLowerCase()).length; if(letters.length&&upper/letters.length>=0.75)reasons.push("caps");}
  if(cfg.spam){const key=message.guild.id+":"+message.author.id; global.__cgSpam ||= new Map(); const now=Date.now(), arr=(global.__cgSpam.get(key)||[]).filter(t=>now-t<6000); arr.push(now); global.__cgSpam.set(key,arr); if(arr.length>=6)reasons.push("spam");}
  if(!reasons.length)return false;
  message.delete().catch(()=>{}); const warn=message.channel.send(`🛡️ ${message.author}, tin nhắn đã bị xóa (${reasons.join(", ")}).`).catch(()=>{}); setTimeout(()=>warn.then(m=>m.delete().catch(()=>{})).catch(()=>{}),5000); return true;
}

async function registerCommands(){
  const c=[];
  c.push(new SlashCommandBuilder().setName("setup").setDescription("Mở Auto Server Setup"));
  c.push(new SlashCommandBuilder().setName("setup-status").setDescription("Xem trạng thái setup"));
  c.push(new SlashCommandBuilder().setName("lock").setDescription("Khóa chat hiện tại"));
  c.push(new SlashCommandBuilder().setName("unlock").setDescription("Mở khóa chat hiện tại"));
  c.push(new SlashCommandBuilder().setName("lockall").setDescription("Khóa toàn bộ text channels"));
  c.push(new SlashCommandBuilder().setName("unlockall").setDescription("Mở khóa toàn bộ text channels"));
  c.push(new SlashCommandBuilder().setName("slowmode").setDescription("Đặt slowmode cho kênh").addIntegerOption(o=>o.setName("seconds").setDescription("0-21600 giây").setRequired(true).setMinValue(0).setMaxValue(21600)));
  c.push(new SlashCommandBuilder().setName("clear").setDescription("Xóa tin nhắn gần đây").addIntegerOption(o=>o.setName("amount").setDescription("1-100").setRequired(true).setMinValue(1).setMaxValue(100)));
  c.push(new SlashCommandBuilder().setName("timeout").setDescription("Timeout thành viên").addUserOption(o=>o.setName("user").setDescription("Thành viên").setRequired(true)).addIntegerOption(o=>o.setName("minutes").setDescription("Phút, 1-40320").setRequired(true).setMinValue(1).setMaxValue(40320)).addStringOption(o=>o.setName("reason").setDescription("Lý do")));
  c.push(new SlashCommandBuilder().setName("untimeout").setDescription("Gỡ timeout").addUserOption(o=>o.setName("user").setDescription("Thành viên").setRequired(true)));
  c.push(new SlashCommandBuilder().setName("kick").setDescription("Kick thành viên").addUserOption(o=>o.setName("user").setDescription("Thành viên").setRequired(true)).addStringOption(o=>o.setName("reason").setDescription("Lý do")));
  c.push(new SlashCommandBuilder().setName("ban").setDescription("Ban thành viên").addUserOption(o=>o.setName("user").setDescription("Thành viên").setRequired(true)).addStringOption(o=>o.setName("reason").setDescription("Lý do")));
  c.push(new SlashCommandBuilder().setName("unban").setDescription("Unban bằng User ID").addStringOption(o=>o.setName("user_id").setDescription("User ID").setRequired(true)));
  c.push(new SlashCommandBuilder().setName("warn").setDescription("Cảnh cáo thành viên").addUserOption(o=>o.setName("user").setDescription("Thành viên").setRequired(true)).addStringOption(o=>o.setName("reason").setDescription("Lý do").setRequired(true)));
  c.push(new SlashCommandBuilder().setName("role-add").setDescription("Cấp role").addUserOption(o=>o.setName("user").setDescription("Thành viên").setRequired(true)).addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true)));
  c.push(new SlashCommandBuilder().setName("role-remove").setDescription("Gỡ role").addUserOption(o=>o.setName("user").setDescription("Thành viên").setRequired(true)).addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true)));
  c.push(new SlashCommandBuilder().setName("role-create").setDescription("Tạo role mới").addStringOption(o=>o.setName("name").setDescription("Tên role").setRequired(true)).addStringOption(o=>o.setName("color").setDescription("HEX, ví dụ #5865F2")));
  c.push(new SlashCommandBuilder().setName("role-delete").setDescription("Xóa role").addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true)));
  c.push(new SlashCommandBuilder().setName("role-list").setDescription("Danh sách role"));
  c.push(new SlashCommandBuilder().setName("serverinfo").setDescription("Thông tin server"));
  c.push(new SlashCommandBuilder().setName("userinfo").setDescription("Thông tin thành viên").addUserOption(o=>o.setName("user").setDescription("Thành viên")));
  c.push(new SlashCommandBuilder().setName("say").setDescription("Bot gửi tin nhắn").addStringOption(o=>o.setName("message").setDescription("Nội dung").setRequired(true)));
  c.push(new SlashCommandBuilder().setName("announce").setDescription("Gửi announcement embed").addStringOption(o=>o.setName("message").setDescription("Nội dung").setRequired(true)));
  c.push(new SlashCommandBuilder().setName("ticket-panel").setDescription("Tạo ticket panel tại kênh hiện tại"));
  c.push(new SlashCommandBuilder().setName("nuke").setDescription("Xóa và tạo lại kênh hiện tại"));
  c.push(new SlashCommandBuilder().setName("avatar").setDescription("Xem avatar").addUserOption(o=>o.setName("user").setDescription("Thành viên")));
  c.push(new SlashCommandBuilder().setName("help").setDescription("Danh sách lệnh"));
  c.push(...extraCommands());

  // Discord requires required options to appear before every non-required option.
  // Some of the management commands intentionally put an optional target/channel
  // before a required value. Normalize every command/subcommand recursively before
  // sending the payload so one malformed command cannot block all 100 commands.
  function normalizeOptionOrder(node) {
    if (!node || !Array.isArray(node.options)) return node;
    const options = node.options.map(normalizeOptionOrder);
    const hasSubcommands = options.some(o => o.type === 1 || o.type === 2);
    if (hasSubcommands) {
      node.options = options;
      return node;
    }
    const required = options.filter(o => o.required === true);
    const optional = options.filter(o => o.required !== true);
    node.options = required.concat(optional);
    return node;
  }

  let commands;
  try {
    commands=c.map((x,idx)=>{
      const json=normalizeOptionOrder(x.toJSON());
      if(typeof json.name!=="string" || typeof json.description!=="string") throw new Error(`Command #${idx+1} thiếu name/description`);
      return json;
    });
  } catch(e) {
    console.error("❌ Command build error:", e);
    throw e;
  }

  const rest=new REST({version:"10"}).setToken(TOKEN);
  const target=GUILD_ID ? `guild ${GUILD_ID}` : "global";
  console.log(`🔄 Registering ${commands.length} slash commands -> ${target}`);
  if(GUILD_ID) await rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),{body:commands});
  else await rest.put(Routes.applicationCommands(CLIENT_ID),{body:commands});
  console.log(`✅ ${commands.length} slash commands registered`);
}

async function createRoles(guild){
  const map={}; let created=0;
  for(const [name,color,key] of ROLE_DEFS){
    let r=guild.roles.cache.find(x=>x.name===name);
    const permissions=ROLE_PERMISSIONS[key];
    if(!r){
      r=await guild.roles.create({
        name,
        color,
        permissions,
        hoist:["higher_owner","owner","owner2","founder","admin","cloud_support"].includes(key),
        mentionable:false,
        reason:"Cloud Games Auto Setup V5 — role permissions"
      });
      created++;
    } else if(r.editable){
      await r.edit({
        color,
        permissions,
        hoist:["higher_owner","owner","owner2","founder","admin","cloud_support"].includes(key),
        reason:"Cloud Games role permission sync"
      }).catch(()=>{});
    }
    map[key]=r.id;
  }
  // Put the management roles above ordinary roles. The bot's own role must remain above them.
  const managedKeys=["higher_owner","owner","owner2","founder","admin","cloud_support","partner","ceo","handsome","buyer","gay_to","verified","bot","booster","vip","member","new_member"];
  const positions=[];
  const botPosition=guild.members.me?.roles?.highest?.position ?? guild.roles.highest.position;
  let pos=Math.max(1, Math.min(botPosition-1, guild.roles.cache.size-1));
  for(const key of managedKeys){
    const role=guild.roles.cache.get(map[key]);
    if(role?.editable && pos>0){ positions.push({role:role.id, position:pos}); pos--; }
  }
  if(positions.length) await guild.roles.setPositions(positions).catch(()=>{});
  return {map,created};
}
async function createStructure(guild){
  let categoriesCreated=0,channelsCreated=0; const map=new Map();
  for(const d of CATEGORIES){
    let cat=guild.channels.cache.find(c=>c.type===ChannelType.GuildCategory&&c.name===d.name);
    if(!cat){cat=await guild.channels.create({name:d.name,type:ChannelType.GuildCategory,reason:"Cloud Games Auto Setup V4"});categoriesCreated++;}
    map.set(d.name,cat);
    for(const [name,type] of d.channels){
      let ch=guild.channels.cache.find(c=>c.parentId===cat.id&&c.name===name);
      if(!ch){await guild.channels.create({name,type:type==="voice"?ChannelType.GuildVoice:ChannelType.GuildText,parent:cat.id,reason:"Cloud Games Auto Setup V4"});channelsCreated++;}
    }
  }
  return {map,categoriesCreated,channelsCreated};
}
async function permissions(guild,roles,cats){
  const staff=[roles.higher_owner,roles.owner,roles.owner2,roles.founder,roles.admin,roles.cloud_support].filter(Boolean);
  const staffCat=cats.get("🔒 STAFF");
  if(staffCat){
    await staffCat.permissionOverwrites.set([
      {id:guild.roles.everyone.id,deny:[PermissionsBitField.Flags.ViewChannel]},
      ...staff.map(id=>({id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ReadMessageHistory]}))
    ]).catch(()=>{});
  }
  const booster=cats.get("💎 BOOSTER");
  if(booster&&roles.booster) await booster.permissionOverwrites.edit(roles.booster,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true}).catch(()=>{});
}
async function seedMessages(guild,cats,roleMap){
  const info=cats.get("📌 INFORMATION");
  if(info){
    const rules=guild.channels.cache.find(c=>c.parentId===info.id&&c.name==="📜・rules");
    if(rules?.isTextBased()){
      const recent=await rules.messages.fetch({limit:10}).catch(()=>null);
      if(!recent?.some(m=>m.author?.id===client.user.id&&m.embeds?.[0]?.title==="📜 CLOUD GAMES — RULES")){
        await rules.send({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle("📜 CLOUD GAMES — RULES").setDescription("1. Tôn trọng thành viên.\n2. Không spam/scam.\n3. Không quảng cáo trái phép.\n4. Không NSFW.\n5. Tuân thủ Discord ToS và nội quy server.").setFooter({text:"Cloud Games"})]}).catch(()=>{});
      }
    }
  }
  const support=cats.get("🎫 SUPPORT");
  if(support){
    const ticket=support && guild.channels.cache.find(c=>c.parentId===support.id&&c.name==="🎫・create-ticket");
    if(ticket?.isTextBased()){
      const recent=await ticket.messages.fetch({limit:20}).catch(()=>null);
      if(!recent?.some(m=>m.author?.id===client.user.id&&m.embeds?.[0]?.title==="🎫 TICKET")){
        await ticket.send({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle("🎫 TICKET").setDescription("Bấm nút để tạo ticket riêng tư.")],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_create").setLabel("🎫 TẠO TICKET").setStyle(ButtonStyle.Primary))]}).catch(()=>{});
      }
    }
  }
}
async function runSetup(guild,type){
  const r=await createRoles(guild), s=await createStructure(guild);
  await permissions(guild,r.map,s.map); await seedMessages(guild,s.map,r.map);
  const cfg=loadConfig(); cfg[guild.id]={type,setupAt:new Date().toISOString(),roleIds:r.map}; saveConfig(cfg);
  return {roles:r.created,categories:s.categoriesCreated,channels:s.channelsCreated};
}

async function lockChannel(channel){
  if(!channel?.isTextBased()) throw new Error("Kênh này không phải text channel.");
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone,{SendMessages:false});
}
async function unlockChannel(channel){
  if(!channel?.isTextBased()) throw new Error("Kênh này không phải text channel.");
  await channel.permissionOverwrites.edit(channel.guild.roles.everyone,{SendMessages:null});
}
async function bulkLock(guild,lock){
  let count=0;
  for(const ch of guild.channels.cache.values()){
    if(ch.type!==ChannelType.GuildText) continue;
    if(lock) await ch.permissionOverwrites.edit(guild.roles.everyone,{SendMessages:false}).catch(()=>{});
    else await ch.permissionOverwrites.edit(guild.roles.everyone,{SendMessages:null}).catch(()=>{});
    count++;
    await sleep(150);
  }
  return count;
}
function hexColor(s){
  if(!s) return 0x5865F2;
  const v=s.replace("#","");
  if(!/^[0-9a-fA-F]{6}$/.test(v)) return null;
  return parseInt(v,16);
}
async function memberTarget(i){
  const u=i.options.getUser("user",true);
  return i.guild.members.fetch(u.id).catch(()=>null);
}

async function createTicket(i){
  const name=`ticket-${safeName(i.user)}`;
  const existing=i.guild.channels.cache.find(c=>c.type===ChannelType.GuildText&&c.name===name);
  if(existing) return fail(i,`Bạn đã có ticket: ${existing}`);
  const cfg=loadConfig()[i.guildId], support=cfg?.roleIds?.cloud_support;
  const ch=await i.guild.channels.create({
    name,type:ChannelType.GuildText,
    permissionOverwrites:[
      {id:i.guild.roles.everyone.id,deny:[PermissionsBitField.Flags.ViewChannel]},
      {id:i.user.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ReadMessageHistory]},
      ...(support?[{id:support,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ReadMessageHistory]}]:[])
    ]
  });
  await ch.send({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle("🎫 Ticket Support").setDescription("Mô tả vấn đề của bạn.")],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_close").setLabel("🔒 ĐÓNG TICKET").setStyle(ButtonStyle.Danger))]});
  return ok(i,`Ticket đã tạo: ${ch}`);
}

client.once("clientReady",async()=>{
  console.log(`☁️ Logged in as ${client.user.tag}`);
  client.user.setActivity("/help", {type:ActivityType.Listening});
  try{await registerCommands();}catch(e){console.error("❌ Register commands:",e.message);}
});

client.on("interactionCreate",async i=>{
  try{
    if(i.isChatInputCommand()){
      const n=i.commandName;

      if(n==="setup"){
        if(!admin(i)) return fail(i,"Bạn cần Administrator.");
        return i.reply(setupPanel());
      }
      if(n==="setup-status"){
        const c=loadConfig()[i.guildId];
        return i.reply({content:c?`✅ ${typeName(c.type)} đã setup lúc ${c.setupAt}`:"❌ Server chưa setup.",ephemeral:true});
      }
      if(n==="lock"){
        if(!has(i,PermissionFlagsBits.ManageChannels)) return fail(i,"Thiếu Manage Channels.");
        await i.deferReply({ephemeral:true}); await lockChannel(i.channel); return i.editReply("🔒 Đã khóa chat.");
      }
      if(n==="unlock"){
        if(!has(i,PermissionFlagsBits.ManageChannels)) return fail(i,"Thiếu Manage Channels.");
        await i.deferReply({ephemeral:true}); await unlockChannel(i.channel); return i.editReply("🔓 Đã mở khóa chat.");
      }
      if(n==="lockall"){
        if(!admin(i)) return fail(i,"Cần Administrator.");
        await i.deferReply({ephemeral:true}); const count=await bulkLock(i.guild,true); return i.editReply(`🔒 Đã khóa ${count} text channels.`);
      }
      if(n==="unlockall"){
        if(!admin(i)) return fail(i,"Cần Administrator.");
        await i.deferReply({ephemeral:true}); const count=await bulkLock(i.guild,false); return i.editReply(`🔓 Đã mở ${count} text channels.`);
      }
      if(n==="slowmode"){
        if(!has(i,PermissionFlagsBits.ManageChannels)) return fail(i,"Thiếu Manage Channels.");
        await i.deferReply({ephemeral:true}); await i.channel.setRateLimitPerUser(i.options.getInteger("seconds",true)); return i.editReply("🐢 Đã cập nhật slowmode.");
      }
      if(n==="clear"){
        if(!has(i,PermissionFlagsBits.ManageMessages)) return fail(i,"Thiếu Manage Messages.");
        const amount=i.options.getInteger("amount",true);
        if(!i.channel.isTextBased()||!i.channel.bulkDelete) return fail(i,"Kênh không hỗ trợ xóa hàng loạt.");
        await i.deferReply({ephemeral:true}); const deleted=await i.channel.bulkDelete(amount,true); return i.editReply(`🧹 Đã xóa ${deleted.size} tin nhắn.`);
      }
      if(n==="timeout"||n==="untimeout"){
        if(!has(i,PermissionFlagsBits.ModerateMembers)) return fail(i,"Thiếu Moderate Members.");
        const m=await memberTarget(i); if(!m) return fail(i,"Không tìm thấy thành viên.");
        if(m.id===i.user.id) return fail(i,"Không thể tự timeout bản thân.");
        if(!m.moderatable) return fail(i,"Bot không thể timeout thành viên này. Kiểm tra role hierarchy.");
        if(n==="timeout"){
          const min=i.options.getInteger("minutes",true);
          const reason=i.options.getString("reason")||"Không có lý do";
          await m.timeout(min*60*1000,reason);
          return ok(i,`Đã timeout **${m.user.tag}** ${min} phút.`);
        }
        await m.timeout(null,"Timeout removed"); return ok(i,`Đã gỡ timeout cho **${m.user.tag}**.`);
      }
      if(n==="kick"||n==="ban"){
        const perm=n==="kick"?PermissionFlagsBits.KickMembers:PermissionFlagsBits.BanMembers;
        if(!has(i,perm)) return fail(i,`Thiếu quyền ${n==="kick"?"Kick Members":"Ban Members"}.`);
        const m=await memberTarget(i); if(!m) return fail(i,"Không tìm thấy thành viên.");
        if(!m.kickable&&n==="kick") return fail(i,"Bot không thể kick thành viên này.");
        if(!m.bannable&&n==="ban") return fail(i,"Bot không thể ban thành viên này.");
        const reason=i.options.getString("reason")||"Không có lý do";
        if(n==="kick") await m.kick(reason); else await m.ban({reason});
        return ok(i,`${n==="kick"?"👢 Đã kick":"🔨 Đã ban"} **${m.user.tag}**.`);
      }
      if(n==="unban"){
        if(!has(i,PermissionFlagsBits.BanMembers)) return fail(i,"Thiếu Ban Members.");
        const id=i.options.getString("user_id",true);
        await i.guild.members.unban(id).catch(()=>{throw new Error("User ID không hợp lệ hoặc user chưa bị ban.");});
        return ok(i,`Đã unban \`${id}\`.`);
      }
      if(n==="warn"){
        if(!has(i,PermissionFlagsBits.ModerateMembers)) return fail(i,"Thiếu Moderate Members.");
        const m=await memberTarget(i); if(!m) return fail(i,"Không tìm thấy thành viên.");
        const reason=i.options.getString("reason",true);
        const cfg=loadConfig(); cfg.warnings ||= {}; cfg.warnings[i.guildId] ||= {}; cfg.warnings[i.guildId][m.id] ||= [];
        cfg.warnings[i.guildId][m.id].push({reason,by:i.user.id,at:new Date().toISOString()}); saveConfig(cfg);
        return ok(i,`⚠️ Đã cảnh cáo **${m.user.tag}**.\nLý do: ${reason}`);
      }
      if(n==="role-add"||n==="role-remove"){
        if(!has(i,PermissionFlagsBits.ManageRoles)) return fail(i,"Thiếu Manage Roles.");
        const m=await memberTarget(i), r=i.options.getRole("role",true);
        if(!m) return fail(i,"Không tìm thấy thành viên.");
        if(r.managed||!r.editable) return fail(i,"Bot không thể quản lý role này. Đưa role bot lên cao hơn.");
        if(n==="role-add") await m.roles.add(r); else await m.roles.remove(r);
        return ok(i,`${n==="role-add"?"🎭 Đã cấp":"🎭 Đã gỡ"} role **${r.name}** cho **${m.user.tag}**.`);
      }
      if(n==="role-create"){
        if(!has(i,PermissionFlagsBits.ManageRoles)) return fail(i,"Thiếu Manage Roles.");
        const color=hexColor(i.options.getString("color"));
        if(color===null) return fail(i,"Màu HEX không hợp lệ. Ví dụ #5865F2.");
        const r=await i.guild.roles.create({name:i.options.getString("name",true),color,reason:`Created by ${i.user.tag}`});
        return ok(i,`🎭 Đã tạo role ${r} .`);
      }
      if(n==="role-delete"){
        if(!has(i,PermissionFlagsBits.ManageRoles)) return fail(i,"Thiếu Manage Roles.");
        const r=i.options.getRole("role",true);
        if(r.managed||!r.editable) return fail(i,"Bot không thể xóa role này.");
        await r.delete(`Deleted by ${i.user.tag}`); return ok(i,"🗑️ Đã xóa role.");
      }
      if(n==="role-list"){
        const roles=i.guild.roles.cache.filter(r=>r.id!==i.guild.id).sort((a,b)=>b.position-a.position).map(r=>`${r} — ${r.members.size} members`);
        const arr=[...roles.values()]; const text=arr.length?arr.slice(0,50).join("\n"):"Không có role.";
        return i.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle("🎭 ROLE LIST").setDescription(text)],ephemeral:true});
      }
      if(n==="serverinfo"){
        const g=i.guild;
        return i.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle(`☁️ ${g.name}`).setThumbnail(g.iconURL()).addFields(
          {name:"👥 Members",value:String(g.memberCount),inline:true},
          {name:"💬 Channels",value:String(g.channels.cache.size),inline:true},
          {name:"🎭 Roles",value:String(g.roles.cache.size),inline:true},
          {name:"🆔 ID",value:g.id,inline:false}
        )]});
      }
      if(n==="userinfo"){
        const m=await memberTarget(i)||i.member;
        return i.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle(`👤 ${m.user.tag}`).setThumbnail(m.user.displayAvatarURL()).addFields(
          {name:"🆔 ID",value:m.id,inline:true},
          {name:"🎭 Roles",value:m.roles.cache.filter(r=>r.id!==i.guild.id).map(String).slice(0,15).join(" ")||"None",inline:false}
        )]});
      }
      if(n==="avatar"){
        const u=i.options.getUser("user")||i.user;
        return i.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle(`🖼️ Avatar — ${u.tag}`).setImage(u.displayAvatarURL({size:1024}))]});
      }
      if(n==="say"){
        if(!has(i,PermissionFlagsBits.ManageMessages)) return fail(i,"Thiếu Manage Messages.");
        await i.deferReply({ephemeral:true}); await i.channel.send(i.options.getString("message",true)); return i.editReply("✅ Đã gửi.");
      }
      if(n==="announce"){
        if(!has(i,PermissionFlagsBits.ManageGuild)) return fail(i,"Thiếu Manage Server.");
        const msg=i.options.getString("message",true);
        await i.channel.send({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle("📢 ANNOUNCEMENT").setDescription(msg).setTimestamp()]});
        return ok(i,"Đã gửi announcement.");
      }
      if(n==="ticket-panel"){
        if(!has(i,PermissionFlagsBits.ManageChannels)) return fail(i,"Thiếu Manage Channels.");
        await i.channel.send({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle("🎫 TICKET").setDescription("Bấm nút bên dưới để tạo ticket.")],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_create").setLabel("🎫 TẠO TICKET").setStyle(ButtonStyle.Primary))]});
        return ok(i,"Đã tạo ticket panel.");
      }
      if(n==="nuke"){
        if(!has(i,PermissionFlagsBits.ManageChannels)) return fail(i,"Thiếu Manage Channels.");
        const old=i.channel;
        if(!old.isTextBased()) return fail(i,"Kênh không hợp lệ.");
        await i.deferReply({ephemeral:true});
        const clone=await old.clone({reason:`Nuke by ${i.user.tag}`});
        await old.delete(`Nuke by ${i.user.tag}`);
        return clone.send({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle("☢️ CHANNEL RESET").setDescription(`Kênh đã được tạo lại bởi ${i.user}.`)]});
      }
      if(["ping","botinfo","uptime","membercount","channel-list","role-info","channel-info","emoji-list","bot-list","online-list","invite","user-id","banner","server-icon","server-banner","poll","choose","calc","timestamp","remind","reminders","remind-cancel","note-add","note-list","note-delete","warn-list","warn-clear","nick","nick-reset","role-color","role-hoist","role-mentionable","role-position","role-perms","channel-create","channel-delete","channel-rename","channel-topic","category-create","category-delete","channel-nsfw","channel-slowmode","channel-sync","clone","pin","unpin","pins","thread-create","thread-archive","thread-lock","emoji-add","emoji-delete","sticker-list","voice-move","voice-disconnect","voice-mute","voice-deafen","voice-unmute","voice-undeafen","dm","embed","role-give-self","role-take-self","auto-role-set","auto-role-off","autorole-status","welcome-set","welcome-off","welcome-status","config","audit","prune","clear-bots","clear-user","purge-links","emergency-lockdown","emergency-unlock","verify","unverify","ticket-add","ticket-remove"].includes(n)){
        if(n==="dashboard"){const c=loadConfig()[i.guildId]||{}; const activeEvents=(c.events||[]).filter(x=>!x.ended).length; const activeGiveaways=(c.giveaways||[]).filter(x=>!x.ended).length; const e=new EmbedBuilder().setColor(0x5865F2).setTitle("☁️ CLOUD GAMES — SERVER DASHBOARD").addFields({name:"👥 Members",value:String(i.guild.memberCount),inline:true},{name:"🎭 Roles",value:String(i.guild.roles.cache.size),inline:true},{name:"📺 Channels",value:String(i.guild.channels.cache.size),inline:true},{name:"🎉 Events",value:String(activeEvents),inline:true},{name:"🎁 Giveaways",value:String(activeGiveaways),inline:true},{name:"🛡️ AutoMod",value:c.automod?.enabled?"ON":"OFF",inline:true},{name:"💡 Suggestions",value:c.suggestionChannel?"ON":"OFF",inline:true},{name:"⭐ Starboard",value:c.starboard?"ON":"OFF",inline:true}); return i.reply({embeds:[e],ephemeral:true});}
        if(n==="ping") return i.reply(`🏓 Pong! API: **${client.ws.ping}ms**`);
        if(n==="botinfo") return i.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle("☁️ CLOUD GAMES BOT").setThumbnail(client.user.displayAvatarURL()).addFields(
          {name:"Version",value:"6.0.0",inline:true},{name:"Servers",value:String(client.guilds.cache.size),inline:true},{name:"Commands",value:"100",inline:true},{name:"Node.js",value:process.version,inline:true},{name:"Discord.js",value:require("discord.js").version,inline:true}
        ).setTimestamp()]});
        if(n==="uptime") return i.reply(`⏱️ Bot đã chạy **${formatDuration(client.uptime||0)}**.`);
        if(n==="membercount") return i.reply(`👥 Server có **${i.guild.memberCount}** thành viên, **${i.guild.members.cache.filter(m=>m.user.bot).size}** bot.`);
        if(n==="channel-list") {const a=[...i.guild.channels.cache.values()].sort((a,b)=>a.position-b.position).map(c=>`${c.type===ChannelType.GuildCategory?"📁":c.isVoiceBased()?"🔊":"💬"} ${c}`).slice(0,80); return i.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle("📚 CHANNEL LIST").setDescription(a.join("\n")||"Không có kênh.")],ephemeral:true});}
        if(n==="role-info") {const r=i.options.getRole("role",true); return i.reply({embeds:[new EmbedBuilder().setColor(r.color||0x5865F2).setTitle(`🎭 ${r.name}`).addFields({name:"ID",value:r.id,inline:true},{name:"Position",value:String(r.position),inline:true},{name:"Members",value:String(r.members.size),inline:true},{name:"Hoist",value:String(r.hoist),inline:true},{name:"Mentionable",value:String(r.mentionable),inline:true})]});}
        if(n==="channel-info") {const c=i.options.getChannel("channel")||i.channel; return i.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle(`📺 ${c.name}`).addFields({name:"ID",value:c.id,inline:true},{name:"Type",value:String(c.type),inline:true},{name:"Parent",value:c.parent?.name||"None",inline:true})]});}
        if(n==="emoji-list") {const a=[...i.guild.emojis.cache.values()].map(e=>`${e} ${e.name} — ${e.id}`); return i.reply({content:a.slice(0,80).join("\n")||"Server chưa có emoji.",ephemeral:true});}
        if(n==="bot-list") {const a=i.guild.members.cache.filter(m=>m.user.bot).map(m=>`${m.user} — ${m.user.tag}`).slice(0,80); return i.reply({content:a.join("\n")||"Không có bot.",ephemeral:true});}
        if(n==="online-list") {const a=i.guild.members.cache.filter(m=>m.presence?.status&&m.presence.status!=="offline").map(m=>`${m.user}`).slice(0,50); return i.reply({content:a.length?`🟢 ${a.join(" ")}`:"Không thấy presence online trong cache. Bật Server Members/Presence Intent nếu cần.",ephemeral:true});}
        if(n==="invite") {if(!requireExtraPerm(i,PermissionFlagsBits.CreateInstantInvite,"Thiếu Create Invite."))return; const inv=await i.channel.createInvite({maxAge:86400,maxUses:0,reason:`Created by ${i.user.tag}`}); return i.reply(`🔗 Invite 24h: ${inv.url}`);}
        if(n==="user-id") {const u=i.options.getUser("user")||i.user; return i.reply(`🆔 **${u.tag}**: ${u.id}`);}
        if(n==="banner") {const u=i.options.getUser("user")||i.user; const b=await u.fetch().then(x=>x.bannerURL({size:1024})); return i.reply(b?`🖼️ Banner của **${u.tag}**: ${b}`:`${u.tag} chưa có banner.`);}
        if(n==="server-icon") {const u=i.guild.iconURL({size:2048}); return i.reply(u?u:`Server chưa có icon.`);}
        if(n==="server-banner") {const u=i.guild.bannerURL({size:2048}); return i.reply(u?u:`Server chưa có banner.`);}
        if(n==="poll") {const opts=[1,2,3,4].map(x=>i.options.getString(`option${x}`)).filter(Boolean); const letters=["🇦","🇧","🇨","🇩"]; const msg=await i.channel.send({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle("📊 POLL").setDescription(`**${i.options.getString("question",true)}**\n\n${opts.map((x,j)=>`${letters[j]} ${x}`).join("\n")}`).setFooter({text:`Tạo bởi ${i.user.tag}`})]}); for(let j=0;j<opts.length;j++)await msg.react(letters[j]).catch(()=>{}); return ok(i,"Đã tạo poll.");}
        if(n==="choose") {const a=i.options.getString("options",true).split("|").map(x=>x.trim()).filter(Boolean); if(!a.length)return fail(i,"Không có lựa chọn."); return i.reply(`🎲 Bot chọn: **${a[Math.floor(Math.random()*a.length)]}**`);}
        if(n==="calc") {const v=parseSafeMath(i.options.getString("expression",true)); return v===null?fail(i,"Biểu thức không hợp lệ."):i.reply(`🧮 Kết quả: **${v}**`);}
        if(n==="timestamp") {const ts=i.options.getInteger("unix",true); return i.reply(`🕐 <t:${ts}:F> • <t:${ts}:R>`);}
        if(n==="remind") {const mins=i.options.getInteger("minutes",true), message=i.options.getString("message",true); const cfg=loadConfig(); cfg.reminders ||= {}; cfg.reminders[i.user.id] ||= []; const id=Math.random().toString(36).slice(2,8); const at=new Date(Date.now()+mins*60000).toISOString(); cfg.reminders[i.user.id].push({id,at,message,guildId:i.guildId}); saveConfig(cfg); scheduleReminder(i.user.id,i.guildId,mins*60000,message,id); return ok(i,`⏰ Đã đặt nhắc nhở **${id}** sau ${mins} phút.`);}
        if(n==="reminders") {const a=loadConfig().reminders?.[i.user.id]||[]; return i.reply({content:a.length?a.map(x=>`${x.id} • <t:${Math.floor(new Date(x.at).getTime()/1000)}:R> • ${x.message}`).join("\n"):"Bạn chưa có nhắc nhở.",ephemeral:true});}
        if(n==="remind-cancel") {const id=i.options.getString("id",true), cfg=loadConfig(); cfg.reminders ||= {}; const a=cfg.reminders[i.user.id]||[]; const idx=a.findIndex(x=>x.id===id); if(idx<0)return fail(i,"Không tìm thấy nhắc nhở."); a.splice(idx,1); saveConfig(cfg); return ok(i,"Đã hủy nhắc nhở.");}
        if(n==="note-add") {const cfg=loadConfig(); cfg.notes ||= {}; cfg.notes[i.user.id] ||= {}; cfg.notes[i.user.id][i.options.getString("name",true).slice(0,50)]=i.options.getString("content",true).slice(0,1000); saveConfig(cfg); return ok(i,"Đã lưu ghi chú.");}
        if(n==="note-list") {const a=Object.entries(loadConfig().notes?.[i.user.id]||{}); return i.reply({content:a.length?a.map(([k,v])=>`**${k}** — ${v}`).join("\n"):"Bạn chưa có ghi chú.",ephemeral:true});}
        if(n==="note-delete") {const cfg=loadConfig(), name=i.options.getString("name",true); if(!cfg.notes?.[i.user.id]?.[name])return fail(i,"Không tìm thấy ghi chú."); delete cfg.notes[i.user.id][name]; saveConfig(cfg); return ok(i,"Đã xóa ghi chú.");}
        if(n==="warn-list") {if(!extraPerm(i,PermissionFlagsBits.ModerateMembers))return fail(i,"Thiếu Moderate Members."); const u=i.options.getUser("user",true), a=loadConfig().warnings?.[i.guildId]?.[u.id]||[]; return i.reply({content:a.length?a.map((x,j)=>`#${j+1} • ${x.reason} • <@${x.by}> • <t:${Math.floor(new Date(x.at).getTime()/1000)}:R>`).join("\n"):"Không có cảnh cáo.",ephemeral:true});}
        if(n==="warn-clear") {if(!extraPerm(i,PermissionFlagsBits.ModerateMembers))return fail(i,"Thiếu Moderate Members."); const u=i.options.getUser("user",true), cfg=loadConfig(); if(!cfg.warnings?.[i.guildId]?.[u.id])return fail(i,"Không có cảnh cáo."); delete cfg.warnings[i.guildId][u.id]; saveConfig(cfg); return ok(i,"Đã xóa toàn bộ cảnh cáo.");}
        if(n==="nick"||n==="nick-reset") {if(!extraPerm(i,PermissionFlagsBits.ManageNicknames))return fail(i,"Thiếu Manage Nicknames."); const m=await memberTarget(i); if(!m)return fail(i,"Không tìm thấy thành viên."); if(!m.manageable)return fail(i,"Bot không thể đổi nickname thành viên này."); await m.setNickname(n==="nick"?i.options.getString("nickname",true):null,`By ${i.user.tag}`); return ok(i,n==="nick"?"Đã đổi nickname.":"Đã reset nickname.");}
        if(n.startsWith("role-")&&["role-color","role-hoist","role-mentionable","role-position","role-perms"].includes(n)){if(!extraPerm(i,PermissionFlagsBits.ManageRoles))return fail(i,"Thiếu Manage Roles."); const r=i.options.getRole("role",true); if(!r.editable)return fail(i,"Bot không thể quản lý role này."); if(n==="role-color"){const c=hexColor(i.options.getString("color",true)); if(c===null)return fail(i,"HEX không hợp lệ."); await r.setColor(c); return ok(i,"Đã đổi màu role.");} if(n==="role-hoist"){await r.setHoist(i.options.getBoolean("enabled",true));return ok(i,"Đã cập nhật hoist.");} if(n==="role-mentionable"){await r.setMentionable(i.options.getBoolean("enabled",true));return ok(i,"Đã cập nhật mentionable.");} if(n==="role-position"){await r.setPosition(i.options.getInteger("position",true));return ok(i,"Đã cập nhật vị trí role.");} const p=r.permissions.toArray(); return i.reply({content:p.length?p.join(", "):"Role không có quyền đặc biệt.",ephemeral:true});}
        if(["channel-create","channel-delete","channel-rename","channel-topic","category-create","category-delete","channel-nsfw","channel-slowmode","channel-sync","clone"].includes(n)){if(!extraPerm(i,PermissionFlagsBits.ManageChannels))return fail(i,"Thiếu Manage Channels.");
          if(n==="channel-create"){const name=i.options.getString("name",true), type=i.options.getString("type",true).toLowerCase(); if(!["text","voice"].includes(type))return fail(i,"type phải là text hoặc voice."); const ch=await i.guild.channels.create({name,type:type==="voice"?ChannelType.GuildVoice:ChannelType.GuildText,parent:i.channel.parentId||undefined}); return ok(i,`Đã tạo ${ch}.`);}
          if(n==="channel-delete"){const ch=i.options.getChannel("channel",true); await ch.delete(`By ${i.user.tag}`); return ok(i,"Đã xóa kênh.");}
          if(n==="channel-rename"){const ch=i.options.getChannel("channel")||i.channel; await ch.setName(i.options.getString("name",true)); return ok(i,"Đã đổi tên kênh.");}
          if(n==="channel-topic"){const ch=i.options.getChannel("channel")||i.channel; if(!ch.isTextBased()||!('setTopic' in ch))return fail(i,"Kênh không hỗ trợ topic."); await ch.setTopic(i.options.getString("topic",true)); return ok(i,"Đã cập nhật topic.");}
          if(n==="category-create"){const ch=await i.guild.channels.create({name:i.options.getString("name",true),type:ChannelType.GuildCategory}); return ok(i,`Đã tạo category ${ch}.`);}
          if(n==="category-delete"){const ch=i.options.getChannel("category",true); if(ch.type!==ChannelType.GuildCategory)return fail(i,"Đây không phải category."); await ch.delete(); return ok(i,"Đã xóa category.");}
          if(n==="channel-nsfw"){const ch=i.options.getChannel("channel")||i.channel; if(!('setNSFW' in ch))return fail(i,"Kênh không hỗ trợ NSFW."); await ch.setNSFW(i.options.getBoolean("enabled",true)); return ok(i,"Đã cập nhật NSFW.");}
          if(n==="channel-slowmode"){const ch=i.options.getChannel("channel")||i.channel; if(!('setRateLimitPerUser' in ch))return fail(i,"Kênh không hỗ trợ slowmode."); await ch.setRateLimitPerUser(i.options.getInteger("seconds",true)); return ok(i,"Đã cập nhật slowmode.");}
          if(n==="channel-sync"){const ch=i.options.getChannel("channel")||i.channel; if(!ch.parent) return fail(i,"Kênh chưa có category."); await ch.lockPermissions(); return ok(i,"Đã đồng bộ permission theo category.");}
          const old=i.channel, clone=await old.clone({reason:`Clone by ${i.user.tag}`}); return ok(i,`Đã clone kênh: ${clone}`);
        }
        if(["pin","unpin","pins"].includes(n)){if(!extraPerm(i,PermissionFlagsBits.ManageMessages))return fail(i,"Thiếu Manage Messages."); if(n==="pins"){const p=await i.channel.messages.fetchPinned(); return i.reply({content:p.size?p.map(m=>`${m.id} • ${m.author.tag} • ${m.content.slice(0,100)}`).join("\n"):"Chưa có tin ghim.",ephemeral:true});} const m=await i.channel.messages.fetch(i.options.getString("message_id",true)).catch(()=>null); if(!m)return fail(i,"Không tìm thấy message."); n==="pin"?await m.pin(`By ${i.user.tag}`):await m.unpin(`By ${i.user.tag}`); return ok(i,n==="pin"?"Đã ghim message.":"Đã bỏ ghim message.");}
        if(["thread-create","thread-archive","thread-lock"].includes(n)){if(!extraPerm(i,PermissionFlagsBits.ManageThreads))return fail(i,"Thiếu Manage Threads."); if(n==="thread-create"){if(!i.channel.isTextBased())return fail(i,"Kênh không hỗ trợ thread."); const th=await i.channel.threads.create({name:i.options.getString("name",true),message:i.options.getString("message")||undefined,reason:`By ${i.user.tag}`}); return ok(i,`Đã tạo thread ${th}.`);} if(!i.channel.isThread())return fail(i,"Lệnh này cần chạy trong thread."); await i.channel.setArchived(true); if(n==="thread-lock")await i.channel.setLocked(true); return ok(i,"Đã cập nhật thread.");}
        if(n==="emoji-add"){if(!extraPerm(i,PermissionFlagsBits.ManageGuildExpressions))return fail(i,"Thiếu Manage Expressions."); const e=await i.guild.emojis.create({attachment:i.options.getString("url",true),name:i.options.getString("name",true),reason:`By ${i.user.tag}`}); return ok(i,`Đã thêm emoji ${e}.`);}
        if(n==="emoji-delete"){if(!extraPerm(i,PermissionFlagsBits.ManageGuildExpressions))return fail(i,"Thiếu Manage Expressions."); const e=await i.guild.emojis.fetch(i.options.getString("emoji_id",true)).catch(()=>null); if(!e)return fail(i,"Không tìm thấy emoji."); await e.delete(`By ${i.user.tag}`); return ok(i,"Đã xóa emoji.");}
        if(n==="sticker-list"){const a=[...i.guild.stickers.cache.values()].map(s=>`${s.name} — ${s.id}`); return i.reply({content:a.join("\n")||"Không có sticker.",ephemeral:true});}
        if(n.startsWith("voice-")){if(!extraPerm(i,PermissionFlagsBits.MoveMembers))return fail(i,"Thiếu Move Members."); const m=await memberTarget(i); if(!m)return fail(i,"Không tìm thấy thành viên."); if(n==="voice-move"){const ch=i.options.getChannel("channel",true); if(!ch.isVoiceBased())return fail(i,"Kênh đích phải là voice."); await m.voice.setChannel(ch);return ok(i,"Đã chuyển thành viên.");} if(!m.voice.channel)return fail(i,"Thành viên không ở voice."); if(n==="voice-disconnect")await m.voice.disconnect(); if(n==="voice-mute")await m.voice.setMute(true); if(n==="voice-unmute")await m.voice.setMute(false); if(n==="voice-deafen")await m.voice.setDeaf(true); if(n==="voice-undeafen")await m.voice.setDeaf(false); return ok(i,"Đã cập nhật voice.");}
        if(n==="dm"){if(!extraPerm(i,PermissionFlagsBits.ManageMessages))return fail(i,"Thiếu Manage Messages."); const u=i.options.getUser("user",true); await u.send(i.options.getString("message",true)); return ok(i,"Đã gửi DM.");}
        if(n==="embed"){if(!extraPerm(i,PermissionFlagsBits.ManageMessages))return fail(i,"Thiếu Manage Messages."); await i.channel.send({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle(i.options.getString("title",true)).setDescription(i.options.getString("message",true)).setTimestamp()]}); return ok(i,"Đã gửi embed.");}
        if(n==="role-give-self"||n==="role-take-self"){const r=i.options.getRole("role",true); if(r.managed||!r.editable)return fail(i,"Role này không thể tự quản lý."); if(r.permissions.has(PermissionFlagsBits.Administrator)||r.permissions.any(PermissionFlagsBits.ManageGuild,PermissionFlagsBits.ManageRoles,PermissionFlagsBits.BanMembers,PermissionFlagsBits.KickMembers))return fail(i,"Không cho tự nhận role quản trị."); n==="role-give-self"?await i.member.roles.add(r):await i.member.roles.remove(r); return ok(i,n==="role-give-self"?`Đã nhận ${r}.`:`Đã bỏ ${r}.`);}
        if(n==="auto-role-set"){if(!admin(i))return fail(i,"Cần Administrator."); const r=i.options.getRole("role",true); if(r.managed||!r.editable)return fail(i,"Bot không quản lý được role này."); saveGuildCfg(i.guildId,{autoRole:r.id}); return ok(i,`Auto role: ${r}.`);}
        if(n==="auto-role-off"){if(!admin(i))return fail(i,"Cần Administrator."); const cfg=loadConfig(); if(cfg[i.guildId])delete cfg[i.guildId].autoRole; saveConfig(cfg); return ok(i,"Đã tắt auto role.");}
        if(n==="autorole-status"){const c=loadConfig()[i.guildId]; return i.reply(`🎭 Auto role: ${c?.autoRole?`<@&${c.autoRole}>`:"Tắt"}`);}
        if(n==="welcome-set"){if(!admin(i))return fail(i,"Cần Administrator."); const ch=i.options.getChannel("channel",true); if(!ch.isTextBased())return fail(i,"Kênh phải là text."); saveGuildCfg(i.guildId,{welcome:{channelId:ch.id,message:i.options.getString("message",true)}}); return ok(i,"Đã bật welcome.");}
        if(n==="welcome-off"){if(!admin(i))return fail(i,"Cần Administrator."); const cfg=loadConfig(); if(cfg[i.guildId])delete cfg[i.guildId].welcome; saveConfig(cfg); return ok(i,"Đã tắt welcome.");}
        if(n==="welcome-status"){const c=loadConfig()[i.guildId]; return i.reply(c?.welcome?`👋 Kênh: <#${c.welcome.channelId}>\nNội dung: ${c.welcome.message}`:"Welcome đang tắt.");}
        if(n==="config"){const c=loadConfig()[i.guildId]||{}; return i.reply({content:"```json\n"+JSON.stringify({...c,setupAt:c.setupAt||null},null,2).slice(0,1900)+"\n```",ephemeral:true});}
        if(n==="audit"){if(!extraPerm(i,PermissionFlagsBits.ViewAuditLog))return fail(i,"Thiếu View Audit Log."); const logs=await i.guild.fetchAuditLogs({limit:i.options.getInteger("limit")||10}); const a=[...logs.entries.values()].map(x=>`${x.action} • ${x.executor?.tag||"?"} • <t:${Math.floor(x.createdTimestamp/1000)}:R>`); return i.reply({content:a.join("\n")||"Không có log.",ephemeral:true});}
        if(n==="prune"){if(!extraPerm(i,PermissionFlagsBits.KickMembers))return fail(i,"Thiếu Kick Members."); const days=i.options.getInteger("days",true); const count=await i.guild.members.prune({days,reason:`Prune by ${i.user.tag}`}); return ok(i,`Đã prune **${count}** thành viên không hoạt động.`);}
        if(n==="clear-bots"||n==="clear-user"||n==="purge-links"){if(!extraPerm(i,PermissionFlagsBits.ManageMessages))return fail(i,"Thiếu Manage Messages."); const amount=i.options.getInteger("amount",true), msgs=await fetchTextMessages(i.channel,100); const target=n==="clear-bots"?msgs.filter(m=>m.author.bot):n==="clear-user"?msgs.filter(m=>m.author.id===i.options.getUser("user",true).id):msgs.filter(m=>/https?:\/\//i.test(m.content)); const arr=[...target.values()].slice(0,amount); if(!arr.length)return fail(i,"Không tìm thấy tin phù hợp."); let count=0; for(const m of arr){await m.delete().catch(()=>{});count++;} return ok(i,`🧹 Đã xóa ${count} tin nhắn.`);}
        if(n==="emergency-lockdown"||n==="emergency-unlock"){if(!admin(i))return fail(i,"Cần Administrator."); await i.deferReply({ephemeral:true}); const count=await bulkLock(i.guild,n==="emergency-lockdown"); return i.editReply(`${n==="emergency-lockdown"?"🚨🔒 Đã lockdown":"🚨🔓 Đã mở lockdown"} ${count} kênh.`);}
        if(n==="verify"||n==="unverify"){if(!extraPerm(i,PermissionFlagsBits.ManageRoles))return fail(i,"Thiếu Manage Roles."); const m=await memberTarget(i); const cfg=loadConfig()[i.guildId]; const rid=cfg?.roleIds?.verified||i.guild.roles.cache.find(r=>r.name==="✅・Verified")?.id; if(!m||!rid)return fail(i,"Không tìm thấy thành viên/role Verified."); const r=i.guild.roles.cache.get(rid); if(!r?.editable)return fail(i,"Bot không quản lý được role Verified."); n==="verify"?await m.roles.add(r):await m.roles.remove(r); return ok(i,n==="verify"?"Đã verify.":"Đã unverify.");}
        if(n==="ticket-add"||n==="ticket-remove"){if(!extraPerm(i,PermissionFlagsBits.ManageChannels))return fail(i,"Thiếu Manage Channels."); if(!i.channel.name.startsWith("ticket-"))return fail(i,"Chỉ dùng trong ticket."); const u=i.options.getUser("user",true); if(n==="ticket-add")await i.channel.permissionOverwrites.edit(u,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true}); else await i.channel.permissionOverwrites.delete(u.id); return ok(i,n==="ticket-add"?`Đã thêm ${u}.`:`Đã xóa ${u} khỏi ticket.`);}
      }

      if(n==="events"){
        if(!i.inGuild())return fail(i,"Chỉ dùng trong server."); const sub=i.options.getSubcommand();
        if(sub==="create"){if(!extraPerm(i,PermissionFlagsBits.ManageGuild)&&!admin(i))return fail(i,"Thiếu Manage Events/Administrator."); return postEvent(i.guild,i);}
        const cfg=loadConfig(), list=cfg[i.guildId]?.events||[];
        if(sub==="list"){const a=list.filter(x=>!x.ended).slice(-20); return i.reply({content:a.length?a.map(x=>`🎉 **${x.title}** • \`${x.id}\` • <t:${Math.floor(x.endsAt/1000)}:R> • ${x.participants.length} người`).join("\n"):"Không có event đang chạy.",ephemeral:true});}
        const id=i.options.getString("id",true), item=list.find(x=>x.id===id); if(!item)return fail(i,"Không tìm thấy event.");
        if(sub==="rsvp"){if(item.ended)return fail(i,"Event đã kết thúc."); if(!item.participants.includes(i.user.id))item.participants.push(i.user.id); saveConfig(cfg); return ok(i,"Đã đăng ký event.");}
        if(!admin(i)&&item.creatorId!==i.user.id)return fail(i,"Chỉ người tạo event hoặc Administrator.");
        if(sub==="cancel")await finishEvent(i.guild,id,true); else if(sub==="end")await finishEvent(i.guild,id,false); return ok(i,sub==="cancel"?"Đã hủy event.":"Đã kết thúc event.");
      }
      if(n==="giveaway"){
        if(!i.inGuild())return fail(i,"Chỉ dùng trong server."); const sub=i.options.getSubcommand();
        const cfg=loadConfig(); cfg[i.guildId].giveaways ||= []; const list=cfg[i.guildId].giveaways;
        if(sub==="create"){
          if(!admin(i)&&!extraPerm(i,PermissionFlagsBits.ManageGuild))return fail(i,"Cần Manage Server/Administrator.");
          const prize=i.options.getString("prize",true), minutes=i.options.getInteger("minutes",true), winners=i.options.getInteger("winners",true), ch=i.options.getChannel("channel")||i.channel;
          if(!ch.isTextBased())return fail(i,"Kênh giveaway phải là text."); const id=makeId("gw"); const item={id,prize,winnerCount:winners,channelId:ch.id,messageId:null,creatorId:i.user.id,endsAt:Date.now()+minutes*60000,participants:[],ended:false};
          const e=new EmbedBuilder().setColor(0xFFD700).setTitle(`🎁 GIVEAWAY • ${prize}`).setDescription(`Bấm **🎉 THAM GIA** để tham gia!\n\n🏆 Số người thắng: **${winners}**\n⏰ Kết thúc: <t:${Math.floor(item.endsAt/1000)}:R>`).setFooter({text:`Giveaway ID: ${id}`});
          const msg=await ch.send({embeds:[e],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway_join:${id}`).setLabel("🎉 THAM GIA").setStyle(ButtonStyle.Success))]}); item.messageId=msg.id; list.push(item); saveConfig(cfg); return ok(i,`Đã tạo giveaway **${prize}** • ID: \`${id}\``);
        }
        if(sub==="list"){const a=list.filter(x=>!x.ended); return i.reply({content:a.length?a.map(x=>`🎁 **${x.prize}** • \`${x.id}\` • <t:${Math.floor(x.endsAt/1000)}:R> • ${x.participants.length} người`).join("\n"):"Không có giveaway đang chạy.",ephemeral:true});}
        const id=i.options.getString("id",true), item=list.find(x=>x.id===id); if(!item)return fail(i,"Không tìm thấy giveaway.");
        if(sub==="enter"){if(item.ended)return fail(i,"Giveaway đã kết thúc."); if(!item.participants.includes(i.user.id))item.participants.push(i.user.id); saveConfig(cfg); return ok(i,"Đã tham gia giveaway.");}
        if(!admin(i)&&item.creatorId!==i.user.id)return fail(i,"Chỉ người tạo hoặc Administrator.");
        if(sub==="end")await finishGiveaway(i.guild,id); else if(sub==="cancel"){item.ended=true;item.cancelled=true;saveConfig(cfg);} else if(sub==="reroll"){if(!item.ended)return fail(i,"Giveaway chưa kết thúc."); const w=pickWinners(item.participants,item.winnerCount); if(i.channel?.isTextBased())await i.channel.send(`🎲 Reroll **${item.prize}**: ${w.length?w.map(x=>`<@${x}>`).join(", "):"Không có người mới."}`);}
        return ok(i,sub==="reroll"?"Đã reroll.":sub==="cancel"?"Đã hủy giveaway.":"Đã kết thúc giveaway.");
      }
      if(n==="automod"){
        if(!admin(i))return fail(i,"Cần Administrator."); const sub=i.options.getSubcommand(), cfg=loadConfig(); cfg[i.guildId].automod ||= {enabled:false,links:true,invites:true,caps:false,spam:true,whitelist:[]};
        if(sub==="enable"){cfg[i.guildId].automod={...cfg[i.guildId].automod,enabled:true,links:i.options.getBoolean("links")??true,invites:i.options.getBoolean("invites")??true,caps:i.options.getBoolean("caps")??false,spam:i.options.getBoolean("spam")??true}; saveConfig(cfg); return ok(i,"🛡️ AutoMod đã bật.");}
        if(sub==="disable"){cfg[i.guildId].automod.enabled=false;saveConfig(cfg);return ok(i,"Đã tắt AutoMod.");}
        if(sub==="whitelist"){const ch=i.options.getChannel("channel",true),en=i.options.getBoolean("enabled",true);cfg[i.guildId].automod.whitelist ||= []; if(en&&!cfg[i.guildId].automod.whitelist.includes(ch.id))cfg[i.guildId].automod.whitelist.push(ch.id);if(!en)cfg[i.guildId].automod.whitelist=cfg[i.guildId].automod.whitelist.filter(x=>x!==ch.id);saveConfig(cfg);return ok(i,en?`Đã whitelist ${ch}.`:`Đã bỏ whitelist ${ch}.`);}
        const a=cfg[i.guildId].automod; return i.reply({content:`🛡️ AutoMod: **${a.enabled?"ON":"OFF"}**\n🔗 Links: ${a.links}\n📨 Invites: ${a.invites}\n🔠 CAPS: ${a.caps}\n💬 Spam: ${a.spam}\n⚪ Whitelist: ${a.whitelist?.length||0} kênh`,ephemeral:true});
      }
      if(n==="server-settings"){
        if(!admin(i))return fail(i,"Cần Administrator."); const sub=i.options.getSubcommand(), cfg=loadConfig(); cfg[i.guildId] ||= {};
        if(sub==="logs"){cfg[i.guildId].logChannel=i.options.getChannel("channel",true).id;saveConfig(cfg);return ok(i,"Đã bật server logs.");}
        if(sub==="logs-off"){delete cfg[i.guildId].logChannel;saveConfig(cfg);return ok(i,"Đã tắt server logs.");}
        if(sub==="suggestions"){cfg[i.guildId].suggestionChannel=i.options.getChannel("channel",true).id;saveConfig(cfg);return ok(i,"Đã bật suggestions.");}
        if(sub==="suggestions-off"){delete cfg[i.guildId].suggestionChannel;saveConfig(cfg);return ok(i,"Đã tắt suggestions.");}
        if(sub==="leveling"){cfg[i.guildId].leveling={enabled:i.options.getBoolean("enabled",true)};saveConfig(cfg);return ok(i,cfg[i.guildId].leveling.enabled?"XP/Level đã bật.":"XP/Level đã tắt.");}
        if(sub==="starboard"){cfg[i.guildId].starboard={channelId:i.options.getChannel("channel",true).id,threshold:i.options.getInteger("threshold",true)};saveConfig(cfg);return ok(i,"Đã cấu hình starboard.");}
        if(sub==="starboard-off"){delete cfg[i.guildId].starboard;saveConfig(cfg);return ok(i,"Đã tắt starboard.");}
        return i.reply({content:"```json\n"+JSON.stringify(cfg[i.guildId],null,2).slice(0,1900)+"\n```",ephemeral:true});
      }
      if(n==="help"){
        return i.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle("☁️ CLOUD GAMES — COMMANDS").setDescription(
          "**Setup**\n`/setup` `/setup-status`\n\n"+
          "**Lock**\n`/lock` `/unlock` `/lockall` `/unlockall` `/slowmode`\n\n"+
          "**Moderation**\n`/clear` `/timeout` `/untimeout` `/warn` `/kick` `/ban` `/unban`\n\n"+
          "**Roles**\n`/role-add` `/role-remove` `/role-create` `/role-delete` `/role-list`\n\n"+
          "**Server**\n`/serverinfo` `/userinfo` `/avatar` `/say` `/announce` `/nuke`\n\n"+
          "**Support**\n`/ticket-panel`"
        )]});
      }
    }


    if(i.isButton()&&i.customId.startsWith("event_rsvp:")){const id=i.customId.split(":")[1],cfg=loadConfig(),item=(cfg[i.guildId]?.events||[]).find(x=>x.id===id);if(!item||item.ended)return fail(i,"Event đã kết thúc hoặc không tồn tại.");if(!item.participants.includes(i.user.id))item.participants.push(i.user.id);saveConfig(cfg);return ok(i,"🎉 Bạn đã tham gia event.");}
    if(i.isButton()&&i.customId.startsWith("event_leave:")){const id=i.customId.split(":")[1],cfg=loadConfig(),item=(cfg[i.guildId]?.events||[]).find(x=>x.id===id);if(!item||item.ended)return fail(i,"Event không còn hoạt động.");item.participants=item.participants.filter(x=>x!==i.user.id);saveConfig(cfg);return ok(i,"Đã rời event.");}
    if(i.isButton()&&i.customId.startsWith("giveaway_join:")){const id=i.customId.split(":")[1],cfg=loadConfig(),item=(cfg[i.guildId]?.giveaways||[]).find(x=>x.id===id);if(!item||item.ended)return fail(i,"Giveaway đã kết thúc hoặc không tồn tại.");if(!item.participants.includes(i.user.id))item.participants.push(i.user.id);saveConfig(cfg);return ok(i,"🎁 Bạn đã tham gia giveaway.");}
    if(i.isStringSelectMenu()&&i.customId==="setup_type"){
      if(!admin(i)) return fail(i,"Bạn cần Administrator.");
      await i.deferUpdate(); await i.editReply(confirmPanel(i.values[0])); return;
    }
    if(i.isButton()&&i.customId==="setup_cancel"){
      await i.update({content:"❌ Đã hủy.",embeds:[],components:[]}); return;
    }
    if(i.isButton()&&i.customId.startsWith("setup_start:")){
      if(!admin(i)) return fail(i,"Bạn cần Administrator.");
      await i.deferUpdate();
      await i.editReply({content:"⏳ Đang setup... Vui lòng chờ.",embeds:[new EmbedBuilder().setColor(0xFEE75C).setTitle("☁️ CLOUD GAMES SETUP").setDescription("🔄 Roles → Categories → Channels → Permissions → Ticket")],components:[]});
      const type=i.customId.split(":")[1], result=await runSetup(i.guild,type);
      await i.editReply({content:"",embeds:[new EmbedBuilder().setColor(0x57F287).setTitle("☁️ CLOUD GAMES — SETUP COMPLETE").setDescription(`✅ Hoàn tất **${i.guild.name}**.`).addFields(
        {name:"🎭 Roles",value:String(result.roles),inline:true},
        {name:"📁 Categories",value:String(result.categories),inline:true},
        {name:"💬 Channels",value:String(result.channels),inline:true}
      ).setTimestamp()],components:[]}); return;
    }
    if(i.isButton()&&i.customId==="ticket_create"){await createTicket(i);return;}
    if(i.isButton()&&i.customId==="ticket_close"){
      await i.reply({content:"🔒 Đóng ticket sau 3 giây.",ephemeral:true}); await sleep(3000); await i.channel.delete("Ticket closed"); return;
    }
  }catch(e){
    console.error("INTERACTION ERROR:",e);
    const msg=`❌ ${e.message||"Unknown error"}`;
    if(i.deferred||i.replied) await i.followUp({content:msg,ephemeral:true}).catch(()=>{});
    else await i.reply({content:msg,ephemeral:true}).catch(()=>{});
  }
});


client.on("messageCreate",async message=>{
  try{
    if(!message.guild||message.author.bot)return;
    if(autoModerationCheck(message))return;
    const cfg=loadConfig()[message.guild.id]||{};
    if(cfg.leveling?.enabled){const levels=cfg.xp ||= {}; const u=levels[message.author.id] ||= {xp:0,level:0}; u.xp+=Math.floor(Math.random()*8)+5; const next=(u.level+1)*100; if(u.xp>=next){u.level++;u.xp-=next;message.channel.send(`🎉 ${message.author} đã lên **Level ${u.level}**!`).then(m=>setTimeout(()=>m.delete().catch(()=>{}),7000)).catch(()=>{});} const all=loadConfig(); all[message.guild.id]=cfg;saveConfig(all);}
    if(cfg.suggestionChannel===message.channel.id&&!message.author.bot){const e=new EmbedBuilder().setColor(0x5865F2).setTitle("💡 SUGGESTION").setDescription(message.content.slice(0,4000)).setFooter({text:`Đề xuất bởi ${message.author.tag}`}).setTimestamp();const m=await message.channel.send({embeds:[e]});await m.react("👍").catch(()=>{});await m.react("👎").catch(()=>{});await message.delete().catch(()=>{});}
    if(cfg.starboard?.channelId&&message.reactions?.cache?.size){/* handled by reaction event */}
    if(cfg.logChannel){const ch=message.guild.channels.cache.get(cfg.logChannel);if(ch?.isTextBased())ch.send(`💬 ${message.author.tag} gửi tin tại ${message.channel}: ${message.content.slice(0,500)}`).catch(()=>{});}
  }catch(e){console.error("MESSAGE SYSTEM ERROR:",e.message);}
});
client.on("messageDelete",async message=>{try{const cfg=loadConfig()[message.guild?.id||""]||{};const ch=message.guild?.channels?.cache?.get(cfg.logChannel);if(ch?.isTextBased()&&message.author)ch.send(`🗑️ Tin nhắn của **${message.author.tag}** bị xóa tại ${message.channel}.`).catch(()=>{});}catch{}});
client.on("guildMemberRemove",async member=>{try{const cfg=loadConfig()[member.guild.id]||{};const ch=member.guild.channels.cache.get(cfg.logChannel);if(ch?.isTextBased())ch.send(`📤 **${member.user.tag}** đã rời server.`).catch(()=>{});}catch{}});
client.on("messageReactionAdd",async reaction=>{try{if(reaction.partial)await reaction.fetch();const m=reaction.message;if(reaction.emoji.name!=="⭐"||!m.guild)return;const cfg=loadConfig()[m.guild.id]?.starboard;if(!cfg||reaction.count<cfg.threshold)return;const ch=m.guild.channels.cache.get(cfg.channelId);if(ch?.isTextBased()){const e=new EmbedBuilder().setColor(0xFEE75C).setAuthor({name:m.author?.tag||"Unknown",iconURL:m.author?.displayAvatarURL?.()}).setDescription(m.content?.slice(0,3500)||"(embed/attachment)").addFields({name:"⭐ Stars",value:String(reaction.count)}).setFooter({text:`Message ${m.id}`});await ch.send({embeds:[e]}).catch(()=>{});}}catch{}});
client.on("guildMemberAdd",async member=>{
  try{
    const cfg=loadConfig()[member.guild.id]||{};
    if(cfg.autoRole){const r=member.guild.roles.cache.get(cfg.autoRole); if(r?.editable) await member.roles.add(r).catch(()=>{});}
    if(cfg.welcome){const ch=member.guild.channels.cache.get(cfg.welcome.channelId); if(ch?.isTextBased()) await ch.send({content:cfg.welcome.message.replaceAll("{user}",`${member}`).replaceAll("{server}",member.guild.name)}).catch(()=>{});}
  }catch(e){console.error("WELCOME/AUTOROLE ERROR:",e.message);}
});
restoreReminders();
scheduleEventsAndGiveaways();
client.on("error",e=>console.error("DISCORD CLIENT ERROR:",e));
process.on("unhandledRejection",e=>console.error("UNHANDLED REJECTION:",e));
process.on("uncaughtException",e=>console.error("UNCAUGHT EXCEPTION:",e));
client.login(TOKEN).catch(e=>{console.error("❌ Login thất bại:",e.message);process.exit(1);});

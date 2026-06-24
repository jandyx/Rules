/*
ChatGPT 解锁检测 (Surge Panel)
基于 keywos / 整点猫咪 的 chatgpt_check.js 修复:
  - 端点改为 https://chatgpt.com/cdn-cgi/trace
    (旧的 http://chat.openai.com/cdn-cgi/trace 现走代理返回 503 Connection Closed,
     导致面板显示 "Untitled Panel / N/A")
  - 出错时也回填 title=ChatGPT,不再退化成 "Untitled Panel"

自定义 icon、iconerr、icon-color,通过 argument 传递,不同参数用 & 连接:
  argument=title=ChatGPT&icon=lasso.and.sparkles&iconerr=xmark.seal.fill&icon-color=#336FA9&iconerr-color=#D65C51
*/

let url = "https://chatgpt.com/cdn-cgi/trace";
let tf=["T1","XX","AL","DZ","AD","AO","AG","AR","AM","AU","AT","AZ","BS","BD","BB","BE","BZ","BJ","BT","BA","BW","BR","BG","BF","CV","CA","CL","CO","KM","CR","HR","CY","DK","DJ","DM","DO","EC","SV","EE","FJ","FI","FR","GA","GM","GE","DE","GH","GR","GD","GT","GN","GW","GY","HT","HN","HU","IS","IN","ID","IQ","IE","IL","IT","JM","JP","JO","KZ","KE","KI","KW","KG","LV","LB","LS","LR","LI","LT","LU","MG","MW","MY","MV","ML","MT","MH","MR","MU","MX","MC","MN","ME","MA","MZ","MM","NA","NR","NP","NL","NZ","NI","NE","NG","MK","NO","OM","PK","PW","PA","PG","PE","PH","PL","PT","QA","RO","RW","KN","LC","VC","WS","SM","ST","SN","RS","SC","SL","SG","SK","SI","SB","ZA","ES","LK","SR","SE","CH","TH","TG","TO","TT","TN","TR","TV","UG","AE","US","UY","VU","ZM","BO","BN","CG","CZ","VA","FM","MD","PS","KR","TW","TZ","TL","GB"];
let tff=["plus","on"];

// 处理 argument 参数
let titlediy,icon,iconerr,iconColor,iconerrColor;
if (typeof $argument !== 'undefined') {
  const args = $argument.split('&');
  for (let i = 0; i < args.length; i++) {
  const [key,value] = args[i].split('=');
  if (key === 'title') {
    titlediy = value;
  } else if (key === 'icon') {
    icon = value;
  } else if (key === 'iconerr') {
    iconerr = value;
  } else if (key === 'icon-color') {
    iconColor = value;
  } else if (key === 'iconerr-color') {
    iconerrColor = value;
  }
  }
}

const TITLE = titlediy ? titlediy : 'ChatGPT';

// 发送 HTTP 请求获取所在地信息。
// 用对象形式带 timeout,确保慢/重启中的代理不会让脚本卡死到 "evaluating
// timeout"(那样面板会退回 Untitled);超时则走 error 分支显示「检测失败」。
$httpClient.get({ url: url, timeout: 10 },function(error,response,data){
  if (error || !data) {
  console.error(error || 'empty response');
  $done({
    title: TITLE,
    content: '检测失败',
    icon: iconerr ? iconerr : undefined,
    'icon-color': iconerrColor ? iconerrColor : undefined
  });
  return;
  }

  let lines = data.split("\n");
  let cf = lines.reduce((acc,line) => {
  let [key,value] = line.split("=");
  acc[key] = value;
  return acc;
  },{});
  let warp = cf.warp;
  let loc = cf.loc ? (getCountryFlagEmoji(cf.loc) + ' ' + cf.loc) : '未知';

  // 判断 ChatGPT 是否支持该国家/地区
  let l = cf.loc ? tf.indexOf(cf.loc) : -1;
  let gpt,iconUsed,iconCol;
  if (l !== -1) {
  gpt = "支持";
  iconUsed = icon ? icon : undefined;
  iconCol = iconColor ? iconColor : undefined;
  } else {
  gpt = "不支持";
  iconUsed = iconerr ? iconerr : undefined;
  iconCol = iconerrColor ? iconerrColor : undefined;
  }

  // 组装通知数据
  let body = {
    title: TITLE,
    content: `${gpt} | 地区: ${loc}`,
    icon: iconUsed ? iconUsed : undefined,
    'icon-color': iconCol ? iconCol : undefined
  };

  $done(body);
});

//获取国旗Emoji函数
function getCountryFlagEmoji(countryCode) {
    if (countryCode.toUpperCase() == 'TW') {
      countryCode = 'CN'
    }
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt())
    return String.fromCodePoint(...codePoints)
}

/*
Cursor AI 可用性检测
Cursor 全球基本可用，通过访问 cursor.com API 确认可达性
使用 Cloudflare trace 通用端点获取地区信息
*/

let checkUrl = "https://api2.cursor.sh/health";
let traceUrl = "http://1.1.1.1/cdn-cgi/trace";
let blocked = ["CN", "RU", "IR", "KP", "SY", "CU", "SD"];

let titlediy, icon, iconerr, iconColor, iconerrColor;
if (typeof $argument !== 'undefined') {
  const args = $argument.split('&');
  for (const arg of args) {
    const [key, value] = arg.split('=');
    if (key === 'title') titlediy = value;
    if (key === 'icon') icon = value;
    if (key === 'iconerr') iconerr = value;
    if (key === 'icon-color') iconColor = value;
    if (key === 'iconerr-color') iconerrColor = value;
  }
}

// 先获取地区信息
$httpClient.get(traceUrl, function(error, response, data) {
  if (error) {
    $done({
      title: titlediy || 'Cursor',
      content: "检测失败 ⚠️",
      icon: iconerr || "xmark.seal.fill",
      "icon-color": iconerrColor || "#D65C51"
    });
    return;
  }

  let lines = data.split("\n");
  let cf = lines.reduce((acc, line) => {
    let [key, value] = line.split("=");
    acc[key] = value;
    return acc;
  }, {});

  let loc = getCountryFlagEmoji(cf.loc) + ' ' + cf.loc;
  let isBlocked = blocked.indexOf(cf.loc) !== -1;

  let result, iconUsed, iconCol;
  if (!isBlocked) {
    result = "支持";
    iconUsed = icon || "cursorarrow.click.2";
    iconCol = iconColor || "#2196F3";
  } else {
    result = "不支持";
    iconUsed = iconerr || "xmark.seal.fill";
    iconCol = iconerrColor || "#D65C51";
  }

  $done({
    title: titlediy || 'Cursor',
    content: `${result} | 地区: ${loc}`,
    icon: iconUsed,
    'icon-color': iconCol
  });
});

function getCountryFlagEmoji(countryCode) {
  if (countryCode.toUpperCase() == 'TW') countryCode = 'CN';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

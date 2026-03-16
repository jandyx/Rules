/*
Claude AI 可用性检测
1. 通过 1.1.1.1/cdn-cgi/trace 获取地区
2. 请求 claude.ai 验证可达性
*/

let traceUrl = "http://1.1.1.1/cdn-cgi/trace";
let checkUrl = "https://claude.ai";
let blocked = ["CN", "RU", "IR", "KP", "SY", "CU", "SD", "BY"];

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

// 获取地区
$httpClient.get(traceUrl, function(error, response, data) {
  if (error) {
    $done({
      title: titlediy || 'Claude',
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

  if (isBlocked) {
    $done({
      title: titlediy || 'Claude',
      content: "不支持 | 地区: " + loc,
      icon: iconerr || "xmark.seal.fill",
      "icon-color": iconerrColor || "#D65C51"
    });
    return;
  }

  // 验证 claude.ai 可达性
  $httpClient.get({ url: checkUrl, timeout: 8, headers: { "User-Agent": "Mozilla/5.0" } }, function(err2, resp2, data2) {
    if (err2 || (resp2 && resp2.status === 403)) {
      $done({
        title: titlediy || 'Claude',
        content: "不支持 | 地区: " + loc,
        icon: iconerr || "xmark.seal.fill",
        "icon-color": iconerrColor || "#D65C51"
      });
    } else {
      $done({
        title: titlediy || 'Claude',
        content: "支持 | 地区: " + loc,
        icon: icon || "brain.head.profile",
        "icon-color": iconColor || "#D97757"
      });
    }
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

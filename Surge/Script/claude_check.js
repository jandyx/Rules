/*
Claude AI 可用性检测
通过访问 claude.ai 首页判断是否可用
*/

let url = "https://claude.ai";
let title = "Claude";
let icon = "brain.head.profile";
let iconerr = "xmark.seal.fill";
let iconColor = "#D97757";
let iconerrColor = "#D65C51";

if (typeof $argument !== 'undefined') {
  const args = $argument.split('&');
  for (const arg of args) {
    const [key, value] = arg.split('=');
    if (key === 'title') title = value;
    if (key === 'icon') icon = value;
    if (key === 'iconerr') iconerr = value;
    if (key === 'icon-color') iconColor = value;
    if (key === 'iconerr-color') iconerrColor = value;
  }
}

// Claude 在不支持的地区会返回 403 或重定向
$httpClient.get({ url: url, timeout: 8, headers: { "User-Agent": "Mozilla/5.0" } }, function(error, response, data) {
  if (error) {
    $done({
      title: title,
      content: "检测失败 ⚠️",
      icon: iconerr,
      "icon-color": iconerrColor
    });
    return;
  }

  // 获取 IP 地区信息
  $httpClient.get("http://ip-api.com/json/?fields=status,country,countryCode,query", function(err2, resp2, data2) {
    let loc = "";
    let countryCode = "";
    try {
      let info = JSON.parse(data2);
      countryCode = info.countryCode;
      let flag = getCountryFlagEmoji(countryCode);
      loc = " | 地区: " + flag + " " + info.country;
    } catch(e) {}

    // Claude 不支持的地区：中国大陆、俄罗斯、伊朗、朝鲜、叙利亚、古巴等
    let blocked = ["CN", "RU", "IR", "KP", "SY", "CU", "SD", "BY"];
    let isBlocked = blocked.indexOf(countryCode) !== -1;

    // 如果响应包含 "unavailable" 或状态码 403，也判定为不支持
    let status = response.status;
    if (isBlocked || status === 403 || (data && data.includes("unavailable in your country"))) {
      $done({
        title: title,
        content: "不支持 ❌" + loc,
        icon: iconerr,
        "icon-color": iconerrColor
      });
    } else {
      $done({
        title: title,
        content: "支持 ✅" + loc,
        icon: icon,
        "icon-color": iconColor
      });
    }
  });
});

function getCountryFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

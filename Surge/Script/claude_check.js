/*
Claude AI 可用性检测
通过 claude.ai/cdn-cgi/trace 获取地区，对比支持地区列表
*/

let url = "http://claude.ai/cdn-cgi/trace";
let tf = ["US","GB","CA","AU","NZ","AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IE","IT","LV","LI","LT","LU","MT","NL","NO","PL","PT","RO","SK","SI","ES","SE","CH","JP","KR","SG","HK","TW","IN","MX","BR","AR","CL","CO","PE","PH","MY","ID","TH","VN","ZA","IL","AE","SA","QA","KW","BH","OM","JO","NG","KE","GH"];

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

$httpClient.get(url, function(error, response, data) {
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
  let l = tf.indexOf(cf.loc);

  let result, iconUsed, iconCol;
  if (l !== -1) {
    result = "支持";
    iconUsed = icon || "brain.head.profile";
    iconCol = iconColor || "#D97757";
  } else {
    result = "不支持";
    iconUsed = iconerr || "xmark.seal.fill";
    iconCol = iconerrColor || "#D65C51";
  }

  $done({
    title: titlediy || 'Claude',
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

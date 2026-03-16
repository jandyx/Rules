/*
Cursor AI 可用性检测
检测当前节点是否可以访问 cursor.com
*/

let url = "https://www.cursor.com";
let title = "Cursor";
let icon = "cursorarrow.click.2";
let iconerr = "xmark.seal.fill";
let iconColor = "#2196F3";
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

$httpClient.get({ url: url, timeout: 5 }, function(error, response, data) {
  if (error || response.status >= 400) {
    $done({
      title: title,
      content: "不支持 ❌",
      icon: iconerr,
      "icon-color": iconerrColor
    });
    return;
  }

  $httpClient.get("http://ip-api.com/json/?fields=status,country,countryCode,query", function(err2, resp2, data2) {
    let loc = "";
    try {
      let info = JSON.parse(data2);
      let flag = getCountryFlagEmoji(info.countryCode);
      loc = " | 地区: " + flag + " " + info.country;
    } catch(e) {}

    $done({
      title: title,
      content: "支持 ✅" + loc,
      icon: icon,
      "icon-color": iconColor
    });
  });
});

function getCountryFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

/*
IP Risk 检测
通过 ipapi.is 获取当前节点 IP 的风险信息
*/

let url = "https://api.ipapi.is/";

$httpClient.get({ url: url, timeout: 10 }, function(error, response, data) {
  if (error) {
    $done({
      title: "IP Risk",
      content: "检测失败 ⚠️",
      icon: "shield.lefthalf.filled.trianglebadge.exclamationmark",
      "icon-color": "#FF9800"
    });
    return;
  }

  try {
    let info = JSON.parse(data);
    let ip = info.ip;
    let cc = info.datacenter ? (info.datacenter.country || "") : "";
    let flag = cc ? getCountryFlagEmoji(cc) + " " + cc : "";
    let company = (info.company && info.company.name) || "";
    if (company.length > 18) company = company.substring(0, 18) + "..";

    // 滥用评分
    let score = 0;
    if (info.company && info.company.abuser_score) {
      score = Math.round(parseFloat(info.company.abuser_score) * 100);
    }

    // 判定 IP 类型和风险
    let type, risk, icon, iconColor;

    if (info.is_tor) {
      type = "Tor";
      risk = "极高";
      icon = "shield.lefthalf.filled.slash";
      iconColor = "#F44336";
    } else if (info.is_proxy || info.is_vpn) {
      type = info.is_datacenter ? "机房代理" : "代理IP";
      risk = score > 70 ? "极高(" + score + "%)" : score > 40 ? "高(" + score + "%)" : "中(" + score + "%)";
      icon = "shield.lefthalf.filled.slash";
      iconColor = score > 70 ? "#F44336" : "#FF9800";
    } else if (info.is_datacenter) {
      type = "机房IP";
      risk = score > 70 ? "极高(" + score + "%)" : score > 40 ? "高(" + score + "%)" : "中(" + score + "%)";
      icon = "shield.lefthalf.filled.trianglebadge.exclamationmark";
      iconColor = score > 70 ? "#F44336" : "#FF9800";
    } else if (info.is_mobile) {
      type = "移动网络";
      risk = "低";
      icon = "shield.lefthalf.filled.badge.checkmark";
      iconColor = "#4CAF50";
    } else {
      type = "住宅IP";
      risk = score > 40 ? "中(" + score + "%)" : "低";
      icon = "shield.lefthalf.filled.badge.checkmark";
      iconColor = score > 40 ? "#FF9800" : "#4CAF50";
    }

    $done({
      title: "IP Risk",
      content: `${flag} | ${type} | 风险: ${risk} | ${company}`,
      icon: icon,
      "icon-color": iconColor
    });
  } catch(e) {
    $done({
      title: "IP Risk",
      content: "解析失败 ⚠️",
      icon: "shield.lefthalf.filled.trianglebadge.exclamationmark",
      "icon-color": "#FF9800"
    });
  }
});

function getCountryFlagEmoji(countryCode) {
  if (countryCode.toUpperCase() == 'TW') countryCode = 'CN';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

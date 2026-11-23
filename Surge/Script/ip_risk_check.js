/*
IP Risk 检测
主源：my.ippure.com/v1/info（免 key，单次请求，返回 fraudScore 等风险字段）
备源：ipapi.is 匿名档已于 2026-09-01 起将风险字段收进付费 key，主源不可用时改用
      api.ipify.org 获取当前出口 IP，再查询 proxycheck.io/v2/<ip> 获取风险信息
*/

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

const DEFAULT_ERR_ICON = "shield.lefthalf.filled.trianglebadge.exclamationmark";
const DEFAULT_ERR_COLOR = "#FF9800";

function isValidStatus(response) {
  if (!response) return true;
  let status = response.status || response.statusCode;
  if (typeof status === "number" && (status < 200 || status >= 300)) return false;
  return true;
}

function fail(content, iconOverride, colorOverride) {
  $done({
    title: titlediy || "IP Risk",
    content: content,
    icon: iconOverride || iconerr || DEFAULT_ERR_ICON,
    "icon-color": colorOverride || iconerrColor || DEFAULT_ERR_COLOR
  });
}

function normalizeIppure(info) {
  return {
    cc: info.countryCode || "",
    score: info.fraudScore,
    residential: info.isResidential !== false,
    tor: !!info.isTor,
    proxy: !!(info.isProxy || info.isVpn),
    company: info.asOrganization || ""
  };
}

function normalizeProxycheck(entry) {
  let type = entry.type || "";
  const raw = entry.risk;
  const score = typeof raw === "string" && /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : raw;
  return {
    cc: entry.isocode || "",
    score: score,
    residential: !(type === "Hosting" || type === "Business"),
    tor: type === "TOR",
    proxy: entry.proxy === "yes" || type === "VPN",
    company: entry.organisation || entry.provider || ""
  };
}

function riskRating(score) {
  if (!Number.isFinite(score) || score < 0 || score > 100) return { label: "未知", color: "#8E8E93" };
  if (score > 70) return { label: "极高", color: "#F44336" };
  if (score > 40) return { label: "高", color: "#F44336" };
  if (score > 15) return { label: "中", color: "#FF9800" };
  return { label: "低", color: "#4CAF50" };
}

function finish(norm, source) {
  let flag = norm.cc ? getCountryFlagEmoji(norm.cc) + " " + norm.cc : "";
  let company = norm.company || "";
  if (company.length > 18) company = company.substring(0, 18) + "..";
  const rating = norm.tor ? { label: "极高", color: "#F44336" } : riskRating(norm.score);
  let risk = rating.label;
  if (!norm.tor && risk !== "未知") risk += "(" + Math.round(norm.score) + "%)";

  let type, iconUsed;
  if (norm.tor) {
    type = "Tor";
    iconUsed = "shield.lefthalf.filled.slash";
  } else if (norm.proxy) {
    type = "代理IP";
    iconUsed = "shield.lefthalf.filled.slash";
  } else if (!norm.residential) {
    type = "机房IP";
    iconUsed = "shield.lefthalf.filled.trianglebadge.exclamationmark";
  } else {
    type = "住宅IP";
    iconUsed = "shield.lefthalf.filled.badge.checkmark";
  }

  let segments = [];
  if (flag) segments.push(flag);
  segments.push(type);
  segments.push("风险: " + risk);
  if (company) segments.push(company);
  let content = segments.join(" | ");
  if (source === "fallback") content += " · pc";

  $done({
    title: titlediy || "IP Risk",
    content: content,
    icon: iconUsed,
    "icon-color": rating.color
  });
}

function runFallback() {
  $httpClient.get({ url: "https://api.ipify.org", timeout: 10 }, function(error, response, data) {
    if (error || !isValidStatus(response) || !data) {
      fail("检测失败 ⚠️");
      return;
    }
    let ip = data.trim();
    if (!ip) {
      fail("检测失败 ⚠️");
      return;
    }

    let pcUrl = "https://proxycheck.io/v2/" + ip + "?vpn=1&asn=1&risk=1";
    $httpClient.get({ url: pcUrl, timeout: 10 }, function(error2, response2, data2) {
      if (error2 || !isValidStatus(response2)) {
        fail("检测失败 ⚠️");
        return;
      }
      try {
        let json = JSON.parse(data2);
        if (json.status !== "ok" || !json[ip]) {
          fail("检测失败 ⚠️");
          return;
        }
        let norm = normalizeProxycheck(json[ip]);
        finish(norm, "fallback");
      } catch (e) {
        fail("解析失败 ⚠️");
      }
    });
  });
}

$httpClient.get({ url: "https://my.ippure.com/v1/info", timeout: 10 }, function(error, response, data) {
  if (error || !isValidStatus(response)) {
    runFallback();
    return;
  }
  try {
    let info = JSON.parse(data);
    if (typeof info.fraudScore !== "number") {
      runFallback();
      return;
    }
    let norm = normalizeIppure(info);
    finish(norm, "primary");
  } catch (e) {
    runFallback();
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

/*
Claude AI 可用性检测
通过 claude.ai/cdn-cgi/trace 获取地区，对比支持地区列表
*/

let url = "https://claude.ai/cdn-cgi/trace";
let tf = ["US","GB","CA","AU","NZ","AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IE","IT","LV","LI","LT","LU","MT","NL","NO","PL","PT","RO","SK","SI","ES","SE","CH","JP","KR","SG","HK","TW","IN","MX","BR","AR","CL","CO","PE","PH","MY","ID","TH","VN","ZA","IL","AE","SA","QA","KW","BH","OM","JO","NG","KE","GH"];

let titlediy, icon, iconerr, iconerrColor;
if (typeof $argument !== 'undefined') {
  const args = $argument.split('&');
  for (const arg of args) {
    const [key, value] = arg.split('=');
    if (key === 'title') titlediy = value;
    if (key === 'icon') icon = value;
    if (key === 'iconerr') iconerr = value;
    if (key === 'iconerr-color') iconerrColor = value;
  }
}

const apiUrl = "https://fuck-claude.vercel.app/api/check?format=json&lang=zh";
const details = typeof $surge !== "undefined" && $surge.selectGroupDetails ? $surge.selectGroupDetails() : null;
const hasClaudePolicy = !!(details && details.groups && Object.prototype.hasOwnProperty.call(details.groups, "Claude"));

function get(target) {
  return new Promise(resolve => {
    const options = { url: target, timeout: 7, headers: { "Cache-Control": "no-cache" }, "auto-cookie": false };
    if (hasClaudePolicy) options.policy = "Claude";
    $httpClient.get(options, (error, response, data) => {
      const status = response && Number(response.status || response.statusCode);
      resolve(!error && status === 200 && typeof data === "string" ? data : "");
    });
  });
}

// Local CN-profile font probes and score bands adapted from LinXiaoTao/FuckClaude (5c0c30f).
/*
MIT License

Copyright (c) 2026 LinXiaoTao (https://github.com/LinXiaoTao/FuckClaude)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const simplifiedFonts = ["Microsoft YaHei", "Microsoft YaHei UI", "SimSun", "NSimSun", "SimHei", "KaiTi", "FangSong", "DengXian", "PingFang SC", "Hiragino Sans GB", "STHeiti", "STSong", "Songti SC", "Source Han Sans CN", "Source Han Sans SC", "Noto Sans CJK SC", "Noto Serif CJK SC", "WenQuanYi Micro Hei", "WenQuanYi Zen Hei"];
const traditionalFonts = ["Microsoft JhengHei", "PMingLiU", "MingLiU", "DFKai-SB", "PingFang TC", "PingFang HK", "Source Han Sans TW", "Noto Sans CJK TC"];
const vendorFonts = ["MiSans", "MIUI", "HarmonyOS Sans SC", "HarmonyOS Sans", "HONOR Sans", "OPPO Sans", "vivo Sans", "Alibaba PuHuiTi", "Alibaba Sans", "DingTalk JinBuTi", "Douyin Sans", "HYQiHei", "FZShuSong-Z01S", "FZKai-Z03S", "FZHei-B01S", "FZFangSong-Z02S"];

function localSignals() {
  const values = new Map();
  const offset = new Date().getTimezoneOffset();
  if (Number.isFinite(offset)) values.set("timezoneOffset", offset === -480 ? 0.7 : 0);

  const locale = typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().locale;
  if (locale) {
    const tag = locale.toLowerCase();
    const simplified = tag === "zh" || tag.startsWith("zh-cn") || tag.includes("hans");
    values.set("intlLocale", simplified ? 1 : tag.startsWith("zh") && !tag.startsWith("zh-tw") ? 0.5 : 0);
  }

  const ctx = typeof document !== "undefined" && document.createElement("canvas").getContext("2d");
  if (!ctx) return values;
  const probe = "中文字体检测ABCabc012";
  const bases = ["monospace", "sans-serif", "serif"].map(base => {
    ctx.font = "72px " + base;
    return [base, ctx.measureText(probe).width];
  });
  if (!bases.every(([, width]) => Number.isFinite(width) && width > 0)) return values;
  function available(font) {
    return bases.some(([base, width]) => {
      ctx.font = '72px "' + font + '", ' + base;
      return Math.abs(ctx.measureText(probe).width - width) > 0.5;
    });
  }
  const simplified = simplifiedFonts.filter(available).length;
  const vendors = vendorFonts.filter(available).length;
  values.set("fonts", simplified ? Math.min(1, 0.75 + 0.08 * simplified) : traditionalFonts.some(available) ? 0.2 : 0);
  values.set("vendorFonts", vendors >= 2 ? 1 : vendors === 1 ? 0.8 : 0);
  return values;
}

// Only the public IPv4 server-reflexive path is comparable to trace's IPv4.
function publicIPv4(ip) {
  if (typeof ip !== "string" || !/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(ip)) return false;
  const octets = ip.split(".").map(Number);
  const [a, b, c] = octets;
  return octets.every(n => n <= 255) && a > 0 && a < 224 && a !== 10 && a !== 127 &&
    !(a === 100 && b >= 64 && b < 128) && !(a === 169 && b === 254) &&
    !(a === 172 && b >= 16 && b < 32) && !(a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) &&
    !(a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) && !(a === 203 && b === 0 && c === 113);
}

function rtcProbe() {
  return new Promise(resolve => {
    const addresses = new Set();
    let peer, finished = false;
    const timer = setTimeout(() => finish(false), 3000);
    function finish(complete) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (peer) {
        peer.onicecandidate = null;
        peer.close();
      }
      resolve({ complete, addresses });
    }
    try {
      peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] });
      peer.onicecandidate = ({ candidate }) => {
        if (!candidate) return finish(true);
        if (candidate.type === "srflx" && publicIPv4(candidate.address)) addresses.add(candidate.address);
      };
      peer.createDataChannel("probe");
      peer.createOffer().then(offer => !finished && peer.setLocalDescription(offer)).catch(() => finish(false));
    } catch (_) { finish(false); }
  });
}

function rtcRisk(trace, probe) {
  const ip = /^ip=([^\s]+)\r?$/m.exec(trace)?.[1];
  if (!probe || !publicIPv4(ip) || !probe.addresses.size) return null;
  for (const addr of probe.addresses) if (addr !== ip) return 1;
  return probe.complete ? 0 : null;
}

function environmentRisk(body, rtc) {
  const unknown = { text: "未检测", color: "#8E8E93" };
  try {
    const { signals, coverage, estimate, lang } = JSON.parse(body);
    if (estimate !== true || lang !== "zh" || !Array.isArray(signals) || coverage?.totalWeight !== 100) return unknown;
    const local = localSignals();
    if (rtc !== null) local.set("webrtcLeak", rtc);
    const seen = new Set();
    let points = 0, weight = 0, serverWeight = 0, total = 0;
    let usedLocal = false, usedNetwork = false;
    for (const signal of signals) {
      const { id, measured, contribution, weight: w } = signal;
      if (typeof id !== "string" || seen.has(id) || typeof measured !== "boolean" ||
          !Number.isInteger(w) || w < 0 || w > 100 ||
          !Number.isInteger(contribution) || contribution < 0 || contribution > w) return unknown;
      seen.add(id);
      total += w;
      if (measured) serverWeight += w;
      if (local.has(id) && w > 0) {
        points += Math.round(local.get(id) * w);
        usedLocal = true;
      } else if (measured && w > 0) {
        points += contribution;
        usedNetwork = true;
      } else {
        continue;
      }
      weight += w;
    }
    if (!usedLocal || !usedNetwork || total !== 100 || serverWeight !== coverage.measuredWeight) return unknown;
    const score = Math.round(100 * points / weight);
    const [label, color] = score <= 30 ? ["低", "#4CAF50"] : score <= 60 ? ["中", "#FF9800"] : ["高", "#F44336"];
    return { text: score + "/100（" + label + "）", color };
  } catch (_) {
    return unknown;
  }
}

// Without a Claude group, keep the region check but never score an unrelated default exit.
Promise.all([get(url), hasClaudePolicy ? get(apiUrl) : "", hasClaudePolicy ? rtcProbe() : null]).then(([trace, body, probe]) => {
  const rtc = rtcRisk(trace, probe);
  const risk = environmentRisk(body, rtc);
  const match = /^loc=([A-Z]{2})\r?$/m.exec(trace);
  const country = match && match[1];
  const supported = country && tf.includes(country);
  const region = country ? (supported ? "支持 " : "不支持 ") + getCountryFlagEmoji(country) + " " + country : "地区检测失败";
  $done({
    title: titlediy || "Claude",
    content: region + " | 环境风险值 " + risk.text,
    icon: supported ? (icon || "brain.head.profile") : (iconerr || "xmark.seal.fill"),
    "icon-color": supported ? risk.color : (iconerrColor || "#D65C51")
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

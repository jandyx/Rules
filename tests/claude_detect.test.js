const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const script = fs.readFileSync(require.resolve('../Surge/Script/claude_detect.js'), 'utf8');

function panel(payload, { group = true, apiStatus = 200, trace = 'loc=US\n', fonts = null, candidates = [], complete = true } = {}) {
  const calls = [];
  return new Promise(resolve => vm.runInNewContext(script, {
    setTimeout: (callback, ms) => setTimeout(callback, ms === 3000 ? 10 : ms), clearTimeout,
    RTCPeerConnection: class {
      createDataChannel() {}
      createOffer() { return Promise.resolve({}); }
      async setLocalDescription() {
        for (const candidate of candidates) this.onicecandidate({candidate});
        if (complete) this.onicecandidate({candidate:null});
      }
      close() {}
    },
    Date: class extends Date { getTimezoneOffset() { return -480; } },
    Intl: {DateTimeFormat: () => ({resolvedOptions: () => ({locale: 'en-US'})})},
    document: {createElement: () => ({getContext: () => fonts === null ? null : ({
      measureText() { return {width: fonts.some(f => this.font.includes('"' + f + '"')) ? 102 : 100}; }
    })})},
    $surge: { selectGroupDetails: () => ({groups: group ? {Claude: []} : {}}) },
    $httpClient: { get(options, cb) {
      calls.push(options);
      if (options.url === 'https://claude.ai/cdn-cgi/trace') return cb(null, {status: 200}, trace);
      assert.equal(options.url, 'https://fuck-claude.vercel.app/api/check?format=json&lang=zh');
      cb(null, {status: apiStatus}, JSON.stringify(payload));
    } },
    $done(value) { resolve({ value, calls }); }
  }));
}

function estimate(networkPoints) {
  const signals = [
    {id:'timezone', weight:24, measured:true, contribution:Math.min(networkPoints,24)},
    {id:'headers', weight:35, measured:true, contribution:Math.max(0, networkPoints-24)},
    {id:'timezoneOffset', weight:3, measured:true, contribution:0},
    {id:'intlLocale', weight:4, measured:false, contribution:0},
    {id:'fonts', weight:14, measured:false, contribution:0},
    {id:'vendorFonts', weight:10, measured:false, contribution:0},
    {id:'webrtcLeak', weight:10, measured:false, contribution:0}
  ];
  return {estimate:true, lang:'zh', coverage:{totalWeight:100,measuredWeight:62}, signals};
}

test('combine network and local contributions once; exclude unmeasured weight', async () => {
  // Local offset replaces the API zero with 2, locale adds 4 measured weight, WebRTC is absent.
  for (const [points, fonts, expected, color] of [
    [0,null,'3/100（低）','#4CAF50'],           // 2/66, no canvas
    [0,['PingFang SC'],'16/100（低）','#4CAF50'], // (2+12)/90, vendor fonts tested negative
    [30,[],'36/100（中）','#FF9800'],
    [59,[],'68/100（高）','#F44336']
  ]) {
    const {value,calls} = await panel(estimate(points), {fonts});
    assert.equal(calls.length, 2);
    assert.ok(calls.every(r => r.policy === 'Claude'));
    assert.equal(value.content, '支持 🇺🇸 US | 环境风险值 ' + expected);
    assert.equal(value['icon-color'], color);
  }
});

test('do not use a stale/API-only estimate on missing or malformed evidence', async () => {
  const duplicate = estimate(0); duplicate.signals[1].id = 'timezone';
  for (const [data, opts] of [[{score:28,band:'low',estimate:true},{}], [duplicate,{}],
    [{...estimate(0), lang:'ru'},{}], [estimate(0),{apiStatus:503}], [null,{group:false}]]) {
    const {value,calls} = await panel(data,opts);
    assert.equal(value.content, '支持 🇺🇸 US | 环境风险值 未检测');
    if (opts.group === false) assert.equal(calls.length,1);
  }
});

test('RTC scores only comparable STUN IPv4, and matching needs completed gathering', async () => {
  for (const [addresses, expected] of [
    [['8.8.8.8'], '2/100（低）'], [['8.8.8.8', '1.1.1.1'], '12/100（低）'],
    [['192.168.1.1','host.local','2001:db8::1'], '2/100（低）'],
  ]) {
    const candidates = [{type:'host',address:'1.1.1.1'},...addresses.map(address => ({type:'srflx',address}))];
    const {value} = await panel(estimate(0), {fonts:[],trace:'loc=US\nip=8.8.8.8\n',candidates});
    assert.equal(value.content, '支持 🇺🇸 US | 环境风险值 ' + expected);
  }
  const candidates = [{type:'srflx',address:'8.8.8.8'}];
  for (const options of [{trace:'ip=8.8.8.8\nloc=US',complete:false}, {trace:'ip=2001:db8::1\nloc=US'}]) {
    const {value} = await panel(estimate(0), {...options,candidates});
    assert.equal(value.content, '支持 🇺🇸 US | 环境风险值 3/100（低）');
  }
});

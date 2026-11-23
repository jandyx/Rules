const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function render(script, replies) {
  const code = fs.readFileSync(require.resolve('../Surge/Script/' + script + '.js'), 'utf8');
  let panel;
  vm.runInNewContext(code, {
    $argument: 'policy=Custom-ISP',
    $surge: { selectGroupDetails: () => ({groups: {'Custom-ISP': []}}) },
    $httpClient: {get(_, cb) {
      assert.ok(replies.length);
      const [status, data] = replies.shift();
      cb(null, {status}, data);
    }},
    $done(value) { panel = value; }
  });
  return panel;
}

for (const [score, label, color] of [[0,'低','#4CAF50'], [15,'低','#4CAF50'], [16,'中','#FF9800'],
  [40,'中','#FF9800'], [41,'高','#F44336'], [49,'高','#F44336'], [71,'极高','#F44336'], [101,'未知','#8E8E93']]) {
  const body = JSON.stringify({ip:'203.0.113.1',countryCode:'US',isResidential:false,fraudScore:score});
  for (const panel of [render('ip_risk_check', [[200, body]]), render('isp_check', [[200, body], [401, '']])]) {
    assert.equal(panel['icon-color'], color);
    assert.ok(panel.content.includes(label));
  }
}

const fallback = render('ip_risk_check', [[503,''],[200,'203.0.113.1'],[200,'{"status":"ok","203.0.113.1":{}}']]);
assert.equal(fallback['icon-color'], '#8E8E93');
assert.ok(fallback.content.includes('未知'));

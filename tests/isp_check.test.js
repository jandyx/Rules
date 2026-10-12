const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'Surge', 'Script', 'isp_check.js'), 'utf8');

function run(argument, responses, extra = {}) {
  const requests = [];
  let done;
  const context = {
    $argument: argument,
    console,
    $surge: extra.$surge || {
      selectGroupDetails() {
        return { groups: { 'Custom-ISP': ['ISP-Example'] }, decisions: { 'Custom-ISP': 'ISP-Example' } };
      }
    },
    $httpClient: {
      get(options, callback) {
        requests.push(options);
        const next = responses.shift();
        if (!next) throw new Error('unexpected request: ' + options.url);
        callback(next.error || null, next.response || { status: 200 }, next.data || '');
      }
    },
    $done(value) { done = value; }
  };
  vm.runInNewContext(script, context, { filename: 'isp_check.js' });
  assert.ok(done, 'script must call $done');
  return { done, requests };
}

function ippure(body) {
  return { response: { status: 200 }, data: JSON.stringify(body) };
}

function anthropic(status = 401) {
  return { response: { status }, data: '' };
}

function assertForced(requests, policy = 'Custom-ISP') {
  for (const request of requests) assert.strictEqual(request.policy, policy);
}

{
  const { done, requests } = run('title=ISP&policy=Custom-ISP', [
    ippure({ ip: '203.0.113.9', countryCode: 'US', isResidential: true, fraudScore: 8, asOrganization: 'Example ISP' }),
    anthropic(401)
  ]);
  assert.strictEqual(done.content, '🇺🇸 US | 住宅 IP | 风险：低（8/100）\n203.0.113.9');
  assertForced(requests);
  assert.doesNotMatch(done.content, /Custom-ISP|Anthropic|Expected|ASN|Example ISP/);
}

{
  const { done, requests } = run('title=ISP&policy=Custom-ISP&expected-ip=203.0.113.9', [
    ippure({ ip: '203.0.113.9', countryCode: 'US', isResidential: false, fraudScore: 41 }),
    anthropic(200)
  ]);
  assert.strictEqual(done.content, '🇺🇸 US | 机房 IP | 风险：高（41/100）\n203.0.113.9');
  assertForced(requests);
}

{
  const { done } = run('title=ISP&policy=Custom-ISP', [
    ippure({ ip: '203.0.113.9', countryCode: 'US', isResidential: false, isProxy: true, fraudScore: 72 }),
    anthropic(401)
  ]);
  assert.strictEqual(done.content, '🇺🇸 US | 代理IP | 风险：极高（72/100）\n203.0.113.9');
}

{
  const { done } = run('title=ISP&policy=Custom-ISP', [
    ippure({ ip: '203.0.113.9', countryCode: 'US', isResidential: true, isTor: true, fraudScore: 99 }),
    anthropic(401)
  ]);
  assert.strictEqual(done.content, '🇺🇸 US | Tor IP | 风险：极高（99/100）\n203.0.113.9');
}

{
  const { done } = run('title=ISP&policy=Custom-ISP', [
    ippure({ ip: '203.0.113.9', countryCode: 'US' }),
    anthropic(401)
  ]);
  assert.strictEqual(done.content, '🇺🇸 US | 类型未知 | 风险：未知\n203.0.113.9');
}

{
  const { done } = run('title=ISP&policy=Custom-ISP', [
    ippure({ ip: '203.0.113.9', countryCode: 'US', isResidential: 'true', fraudScore: '8' }),
    anthropic(401)
  ]);
  assert.strictEqual(done.content, '🇺🇸 US | 类型未知 | 风险：未知\n203.0.113.9');
}

{
  const { done, requests } = run('title=ISP&policy=Custom-ISP', [
    { response: { status: 200 }, data: '{bad json' },
    { response: { status: 200 }, data: '203.0.113.9\n' }
  ]);
  assert.strictEqual(done.content, '信息查询失败\n203.0.113.9');
  assertForced(requests);
}

{
  const { done } = run('title=ISP&policy=Custom-ISP', [
    ippure({ ip: '2001:db8::1', countryCode: 'US', isResidential: true, fraudScore: 8 }),
    { response: { status: 200 }, data: '203.0.113.9\n' }
  ]);
  assert.strictEqual(done.content, '信息查询失败\n203.0.113.9');
}

{
  const { done } = run('title=ISP&policy=Custom-ISP', [
    ippure({ ip: '203.0.113.9', countryCode: 'USA', isResidential: true, fraudScore: 8 }),
    { response: { status: 200 }, data: '203.0.113.9\n' }
  ]);
  assert.strictEqual(done.content, '信息查询失败\n203.0.113.9');
}

{
  const { done, requests } = run('title=ISP&policy=Missing%20Policy', [], {
    $surge: { selectGroupDetails: () => ({ groups: { 'Custom-ISP': [] }, decisions: {} }) }
  });
  assert.strictEqual(done.content, '策略不可用：Missing Policy');
  assert.strictEqual(requests.length, 0);
}

{
  const { done } = run('title=ISP&policy=Custom-ISP&expected-ip=203.0.113.10', [
    ippure({ ip: '203.0.113.9', countryCode: 'US', isResidential: true, fraudScore: 8 }),
    anthropic(401)
  ]);
  assert.strictEqual(done.content, '出口 IP 与预期不一致\n实际 203.0.113.9 / 预期 203.0.113.10');
}

{
  const { done } = run('title=ISP&policy=Custom-ISP', [
    ippure({ ip: '203.0.113.9', countryCode: 'US', isResidential: true, fraudScore: 8 }),
    { response: { status: 503 }, data: '' }
  ]);
  assert.strictEqual(done.content, 'Anthropic 连通性异常\n203.0.113.9');
}

{
  const { done, requests } = run('title=ISP&policy=Custom-ISP', [
    { error: 'down', response: { status: 0 }, data: '' },
    { response: { status: 200 }, data: '203.0.113.9\n' }
  ]);
  assert.strictEqual(done.content, '信息查询失败\n203.0.113.9');
  assertForced(requests);
}

console.log('isp_check tests passed');

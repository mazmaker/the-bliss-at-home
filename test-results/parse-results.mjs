import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync(0, 'utf-8'));
const files = [];
for (const suite of data.testResults || []) {
  const name = suite.name.replace(/.*the-bliss-at-home[/\\]/, '');
  const total = suite.assertionResults || [];
  const passed = total.filter(t => t.status === 'passed').length;
  const failed = total.filter(t => t.status === 'failed').length;
  const failedTests = total.filter(t => t.status === 'failed').map(t => t.fullName);
  const status = failed === 0 ? 'PASS' : 'FAIL';
  files.push({ name, passed, failed, status, failedTests });
}
files.sort((a, b) => a.name.localeCompare(b.name));
for (const f of files) {
  console.log([f.status, f.name.replace(/\\/g, '/'), f.passed, f.failed].join('|'));
  for (const t of f.failedTests) {
    console.log('  FAILED: ' + t);
  }
}
const tp = files.reduce((s, f) => s + f.passed, 0);
const tf = files.reduce((s, f) => s + f.failed, 0);
console.log('SUMMARY|files:' + files.length + '|passed:' + tp + '|failed:' + tf);

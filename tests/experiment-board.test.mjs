import { describe, it, expect } from 'vitest';
import { renderDashboard, mergeDomainSettings } from '../scripts/deploy-amplify-board.mjs';
import { createNullMetrics } from '../scripts/collect-metrics.mjs';
const experiment = {
  branch: 'claude.cli.opus-5-5.spec', modelLabel: 'Opus 5.5', method: 'Spec',
  preparedSha: '123456789', resultSha: 'abcdef012', status: 'Completed',
  activeSeconds: 120, wallSeconds: 180, estimatedTokens: null, actualTokens: 1000,
  evidenceUrl: 'https://github.com/example/results', summary: 'Observed <not invented>',
  buildStatus: 'passed', testStatus: 'passed', deployable: true,
};
function render(overrides = {}) {
  return renderDashboard({}, [{ deployBranch: 'claude-cli-opus-5-5-spec', commit: 'abcdef012',
    sourceRef: 'abcdef012', url: 'https://example.test/', metrics: createNullMetrics(),
    experiment: { ...experiment, ...overrides } }]);
}
describe('experiment cards', () => {
  it('shows model, method, provenance and unavailable measures honestly', () => {
    const html = render();
    for (const text of ['Opus 5.5', 'Claude CLI', 'claude.cli.opus-5-5.spec',
      'Active: 2.0 min', 'Wall: 3.0 min', 'Tokens estimated: N/A', 'Provider total: 1,000',
      'Independent gameplay: Not evaluated', 'Observed &lt;not invented&gt;']) expect(html).toContain(text);
  });
  it('retains failed runs without offering a nonexistent demo', () => {
    const html = render({ deployable: false, status: 'Blocked' });
    expect(html).toContain('Not deployable');
    expect(html).toContain('Blocked');
    expect(html).not.toContain('OPEN APP');
  });
});

it('preserves unrelated domain mappings when adding experiments', () => {
  expect(mergeDomainSettings([
    {prefix: 'cradleai', branchName: 'cradleai'},
    {prefix: 'solitaire', branchName: 'old-dashboard'},
  ], [
    {prefix: 'solitaire', branchName: 'dashboard'},
    {prefix: 'claude-cli-opus-5-5-spec-solitaire', branchName: 'claude-cli-opus-5-5-spec'},
  ])).toEqual([
    {prefix: 'cradleai', branchName: 'cradleai'},
    {prefix: 'solitaire', branchName: 'dashboard'},
    {prefix: 'claude-cli-opus-5-5-spec-solitaire', branchName: 'claude-cli-opus-5-5-spec'},
  ]);
});

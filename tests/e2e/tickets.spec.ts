import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function checkAccessibility(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        detail: n.failureSummary,
      })),
    })),
  ).toEqual([]);
}
import { Pool } from 'pg';
import { testDatabaseUrl } from '../../scripts/test-env';
test('conversation, agent-edited AI reply, customer follow-up and refreshed analysis', async ({
  page,
}, testInfo) => {
  const title = `Browser billing question ${testInfo.project.name}`;
  let id: string | undefined;
  try {
    await page.goto('/tickets');
    await checkAccessibility(page);
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'Skip to content' }),
    ).toBeFocused();
    await expect(
      page.getByRole('heading', { name: 'Ticket overview' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'New ticket', exact: true }).click();
    await checkAccessibility(page);
    await page.getByLabel('Ticket title').fill(title);
    await page
      .getByRole('textbox', { name: 'Description', exact: true })
      .fill(
        'Synthetic account charged twice. <script>window.demoXss = true</script>',
      );
    await page
      .getByRole('button', { name: 'Create ticket', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
    id = new URL(page.url()).pathname.split('/').pop();
    await expect(
      page.getByRole('heading', { name: 'Suggested response' }),
    ).toBeVisible();
    await expect(page.getByText('Mock AI', { exact: true })).toBeVisible();
    await checkAccessibility(page);
    expect(await page.evaluate(() => Object.hasOwn(window, 'demoXss'))).toBe(
      false,
    );
    const thread = page.getByRole('list', { name: 'Conversation messages' });
    await expect(thread.getByRole('listitem')).toHaveCount(1);
    await page.getByRole('button', { name: 'Use reply', exact: true }).click();
    const composer = page.getByRole('textbox', {
      name: 'Support reply',
      exact: true,
    });
    await expect(composer).not.toHaveValue('');
    await expect(thread.getByRole('listitem')).toHaveCount(1);
    await composer.fill(
      'Agent-edited reply: please confirm invoice DEMO-2041.',
    );
    await page.getByRole('button', { name: 'Use reply', exact: true }).click();
    await checkAccessibility(page);
    await page.getByRole('button', { name: 'Keep my draft' }).click();
    await expect(composer).toHaveValue(
      'Agent-edited reply: please confirm invoice DEMO-2041.',
    );
    const submittedIds: string[] = [];
    await page.route('**/api/tickets/*/messages', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      submittedIds.push(route.request().postDataJSON().clientMessageId);
      if (submittedIds.length === 1) {
        const committed = await route.fetch();
        expect(committed.status()).toBe(201);
        return route.abort('failed');
      }
      return route.continue();
    });
    await page.getByRole('button', { name: 'Send reply', exact: true }).click();
    await expect(thread.getByRole('listitem')).toHaveCount(2);
    await expect(thread).toContainText('Agent-edited reply');
    await expect(
      page.getByRole('alert').filter({ hasText: 'Connection interrupted' }),
    ).toContainText('Connection interrupted');
    await expect(composer).toHaveValue(
      'Agent-edited reply: please confirm invoice DEMO-2041.',
    );
    await page.getByRole('button', { name: 'Send reply', exact: true }).click();
    await expect(composer).toHaveValue('');
    await expect(thread.getByRole('listitem')).toHaveCount(2);
    expect(submittedIds).toHaveLength(2);
    expect(submittedIds[1]).toBe(submittedIds[0]);
    await page.unroute('**/api/tickets/*/messages');
    await page
      .getByRole('button', { name: 'Add customer reply', exact: true })
      .click();
    await expect(
      page.getByText(/This is not a real customer portal/),
    ).toBeVisible();
    await checkAccessibility(page);
    await page
      .getByRole('textbox', { name: 'Simulated customer reply' })
      .fill(
        'Confirmed invoice DEMO-2041. Additional context UNIQUE-CUSTOMER-FOLLOWUP. <img src=x onerror="window.demoXss=true">',
      );
    await page
      .getByRole('button', { name: 'Add simulated reply', exact: true })
      .click();
    await expect(thread.getByRole('listitem')).toHaveCount(3);
    await expect(
      page.getByText('Analysis is out of date.', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Use reply', exact: true }),
    ).toBeDisabled();
    await checkAccessibility(page);
    const overview = await page.context().newPage();
    await overview.goto(`/tickets?q=${encodeURIComponent(title)}`);
    await expect(
      overview
        .locator('span:visible')
        .filter({ hasText: /^Analysis outdated$/ }),
    ).toBeVisible();
    await checkAccessibility(overview);
    await overview.close();
    await composer.fill('Keep this unsent draft during analysis.');
    await page
      .getByRole('button', { name: 'Refresh analysis', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Use reply', exact: true }),
    ).toBeEnabled();
    await expect(page.getByText(/Latest customer update:/)).toContainText(
      'UNIQUE-CUSTOMER-FOLLOWUP',
    );
    await expect(composer).toHaveValue(
      'Keep this unsent draft during analysis.',
    );
    await expect(thread.getByRole('listitem')).toHaveCount(3);
    await page.getByRole('button', { name: 'Use reply', exact: true }).click();
    await page
      .getByRole('button', { name: 'Replace draft', exact: true })
      .click();
    await expect(composer).not.toHaveValue(
      'Keep this unsent draft during analysis.',
    );
    await expect(thread.getByRole('listitem')).toHaveCount(3);
    expect(await page.evaluate(() => Object.hasOwn(window, 'demoXss'))).toBe(
      false,
    );
    await checkAccessibility(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('conversation.png'),
      fullPage: true,
    });
    const remoteUpdate = await page.request.patch(`/api/tickets/${id}`, {
      data: { status: 'IN_PROGRESS', version: 1 },
    });
    expect(remoteUpdate.status()).toBe(200);
    await page.getByRole('button', { name: 'Refresh conversation' }).click();
    await expect(page.getByLabel('Ticket status')).toHaveValue('IN_PROGRESS');
    await expect(
      page.locator('span').filter({ hasText: /^In progress$/ }),
    ).toBeVisible();
    await page.getByLabel('Ticket status').selectOption('RESOLVED');
    await expect(page.getByLabel('Ticket status')).toHaveValue('RESOLVED');
    await page
      .getByRole('link', { name: 'Back to tickets', exact: true })
      .click();
    await page.getByRole('searchbox', { name: 'Search tickets' }).fill(title);
    await expect(page).toHaveURL(/q=Browser/);
    await page.getByLabel('Status filter').selectOption('RESOLVED');
    await page.getByLabel('Category filter').selectOption('BILLING');
    await expect(
      page.getByRole('link', { name: new RegExp(title) }),
    ).toBeVisible();
    await page.getByLabel('Status filter').selectOption('OPEN');
    await expect(
      page.getByRole('heading', { name: 'No matching tickets' }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  } finally {
    if (id) {
      const pool = new Pool({ connectionString: testDatabaseUrl() });
      await pool.query('DELETE FROM "Ticket" WHERE id=$1', [id]);
      await pool.end();
    }
  }
});

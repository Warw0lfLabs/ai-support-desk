import 'dotenv/config';
export function testDatabaseUrl() {
  const value =
    process.env.TEST_DATABASE_URL ??
    'postgresql://support:test_only@localhost:5433/support_desk_test';
  const url = new URL(value);
  if (!url.pathname.endsWith('_test'))
    throw new Error('Refusing test database: its name must end with _test.');
  return value;
}

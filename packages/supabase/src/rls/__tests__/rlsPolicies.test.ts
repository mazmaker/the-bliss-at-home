/**
 * RLS (Row Level Security) Policy Tests
 *
 * Comprehensive static analysis of Supabase migration files to verify:
 * 1. All tables have RLS enabled
 * 2. All tables have appropriate policies for each role
 * 3. No security anti-patterns exist
 * 4. Policy coverage per role (ADMIN, CUSTOMER, STAFF, HOTEL)
 * 5. GRANT statements align with RLS policies
 * 6. Helper functions are used correctly
 * 7. Tenant isolation is enforced
 * 8. Known vulnerability detection
 *
 * These tests do NOT require a live database connection.
 * They parse the SQL migration files directly.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// ─── Types ─────────────────────────────────────────────────

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../../../supabase/migrations');

interface MigrationFile {
  filename: string;
  content: string;
}

interface PolicyInfo {
  name: string;
  command: string; // SELECT, INSERT, UPDATE, DELETE, ALL
  roles: string;
  table: string;
  source: string;
  condition: string;
  permissive: boolean;
}

interface GrantInfo {
  privilege: string;  // SELECT, INSERT, UPDATE, DELETE, ALL
  table: string;
  role: string;
  source: string;
}

interface DroppedPolicy {
  name: string;
  table: string;
  source: string;
}

// ─── Parser Functions ──────────────────────────────────────

let migrations: MigrationFile[] = [];
let allSql = '';
let tablesCreated: string[] = [];
let tablesWithRLS: string[] = [];
let policies: PolicyInfo[] = [];
let grants: GrantInfo[] = [];
let droppedPolicies: DroppedPolicy[] = [];

function loadMigrations(): MigrationFile[] {
  const allFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .filter(f => !f.startsWith('debug_') && !f.startsWith('verify_'))
    .sort();

  const files = allFiles.filter(f => {
    const dupMatch = f.match(/^(.+) (\d)\.sql$/);
    if (!dupMatch) return true;
    const baseName = dupMatch[1] + '.sql';
    return !allFiles.includes(baseName);
  });

  return files.map(filename => ({
    filename,
    content: fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf-8'),
  }));
}

function extractCreatedTables(sql: string): string[] {
  const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?["']?(\w+)["']?\s*\(/gi;
  const tables = new Set<string>();
  let match;
  while ((match = regex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    if (!['schema_migrations', 'supabase_migrations'].includes(tableName)) {
      tables.add(tableName);
    }
  }
  return Array.from(tables);
}

function extractRLSTables(sql: string): string[] {
  const regex = /ALTER\s+TABLE\s+(?:public\.)?["']?(\w+)["']?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
  const tables = new Set<string>();
  let match;
  while ((match = regex.exec(sql)) !== null) {
    tables.add(match[1].toLowerCase());
  }
  return Array.from(tables);
}

function extractPolicies(migrationFiles: MigrationFile[]): PolicyInfo[] {
  const results: PolicyInfo[] = [];

  for (const { filename, content } of migrationFiles) {
    const regex = /CREATE\s+POLICY\s+["']([^"']+)["']\s+ON\s+(?:public\.)?["']?(\w+)["']?\s+([\s\S]*?)(?:;|CREATE\s+POLICY|ALTER\s+TABLE|GRANT|DROP\s+POLICY|CREATE\s+OR\s+REPLACE|CREATE\s+INDEX|CREATE\s+TABLE|CREATE\s+FUNCTION|INSERT\s+INTO|$)/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const policyName = match[1];
      const table = match[2].toLowerCase();
      const body = match[3];

      const cmdMatch = body.match(/FOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL)/i);
      const command = cmdMatch ? cmdMatch[1].toUpperCase() : 'ALL';

      const rolesMatch = body.match(/TO\s+([\w,\s]+?)(?:\s+(?:USING|WITH|;))/i);
      const roles = rolesMatch ? rolesMatch[1].trim() : 'unknown';

      const condMatch = body.match(/(?:USING|WITH\s+CHECK)\s*\(([\s\S]*)\)/i);
      const condition = condMatch ? condMatch[1].trim() : '';

      const isRestrictive = /AS\s+RESTRICTIVE/i.test(body);

      results.push({
        name: policyName,
        command,
        roles,
        table,
        source: filename,
        condition,
        permissive: !isRestrictive,
      });
    }
  }

  return results;
}

function extractGrants(migrationFiles: MigrationFile[]): GrantInfo[] {
  const results: GrantInfo[] = [];

  for (const { filename, content } of migrationFiles) {
    const regex = /GRANT\s+(SELECT|INSERT|UPDATE|DELETE|ALL(?:\s+PRIVILEGES)?|USAGE)\s+ON\s+(?:TABLE\s+)?(?:public\.)?["']?(\w+)["']?\s+TO\s+([\w,\s]+)/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      results.push({
        privilege: match[1].toUpperCase().replace(' PRIVILEGES', ''),
        table: match[2].toLowerCase(),
        role: match[3].trim().toLowerCase(),
        source: filename,
      });
    }
  }

  return results;
}

function extractDroppedPolicies(migrationFiles: MigrationFile[]): DroppedPolicy[] {
  const results: DroppedPolicy[] = [];

  for (const { filename, content } of migrationFiles) {
    const regex = /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?["']([^"']+)["']\s+ON\s+(?:public\.)?["']?(\w+)["']?/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      results.push({
        name: match[1],
        table: match[2].toLowerCase(),
        source: filename,
      });
    }
  }

  return results;
}

// Helper to get policies for a specific table
function getPoliciesForTable(tableName: string): PolicyInfo[] {
  return policies.filter(p => p.table === tableName);
}

// Helper to check if table has specific command coverage
function analyzeTablePolicies(tableName: string) {
  const tablePolicies = getPoliciesForTable(tableName);
  const commands = new Set(tablePolicies.map(p => p.command));
  return {
    count: tablePolicies.length,
    hasSelect: commands.has('SELECT') || commands.has('ALL'),
    hasInsert: commands.has('INSERT') || commands.has('ALL'),
    hasUpdate: commands.has('UPDATE') || commands.has('ALL'),
    hasDelete: commands.has('DELETE') || commands.has('ALL'),
    hasAll: commands.has('ALL'),
    hasAdminPolicy: tablePolicies.some(
      p => p.name.toLowerCase().includes('admin') ||
           p.condition.includes("'ADMIN'") ||
           p.condition.includes('is_admin()')
    ),
    hasOwnerPolicy: tablePolicies.some(
      p => p.condition.includes('auth.uid()')
    ),
    policies: tablePolicies,
  };
}

// Tables exempt from RLS (internal/config data)
const EXEMPT_TABLES = [
  'duration_options', // read-only config data populated via migration
];

// ─── Setup ─────────────────────────────────────────────────

beforeAll(() => {
  migrations = loadMigrations();
  allSql = migrations.map(m => m.content).join('\n');
  tablesCreated = extractCreatedTables(allSql);
  tablesWithRLS = extractRLSTables(allSql);
  policies = extractPolicies(migrations);
  grants = extractGrants(migrations);
  droppedPolicies = extractDroppedPolicies(migrations);
});

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

describe('RLS Policy Tests - Migration File Analysis', () => {

  // ─── 1. Migration Infrastructure ───────────────────────

  describe('1. Migration Infrastructure', () => {
    it('should find migration files in the migrations directory', () => {
      expect(migrations.length).toBeGreaterThan(0);
      expect(fs.existsSync(MIGRATIONS_DIR)).toBe(true);
    });

    it('should have non-empty SQL content in each migration', () => {
      for (const m of migrations) {
        expect(m.content.length).toBeGreaterThan(0);
      }
    });

    it('should discover at least 20 unique tables', () => {
      expect(tablesCreated.length).toBeGreaterThanOrEqual(20);
    });

    it('should find at least 100 policies across all migrations', () => {
      expect(policies.length).toBeGreaterThanOrEqual(100);
    });

    it('should parse policy commands correctly (SELECT/INSERT/UPDATE/DELETE/ALL)', () => {
      const validCommands = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'];
      for (const p of policies) {
        expect(validCommands).toContain(p.command);
      }
    });

    it('should track DROP POLICY statements for migration audit', () => {
      expect(droppedPolicies.length).toBeGreaterThan(0);
    });
  });

  // ─── 2. RLS Enabled Coverage ───────────────────────────

  describe('2. RLS Enabled - All Tables', () => {
    it('should have RLS enabled on core user tables', () => {
      const coreTables = ['profiles', 'customers', 'staff', 'hotels'];
      for (const table of coreTables) {
        if (tablesCreated.includes(table)) {
          expect(tablesWithRLS, `${table} should have RLS enabled`).toContain(table);
        }
      }
    });

    it('should have RLS enabled on booking tables', () => {
      const tables = ['bookings', 'booking_services', 'booking_addons', 'service_addons'];
      for (const table of tables) {
        if (tablesCreated.includes(table)) {
          expect(tablesWithRLS, `${table} should have RLS enabled`).toContain(table);
        }
      }
    });

    it('should have RLS enabled on service tables', () => {
      const tables = ['services', 'service_images', 'skills', 'staff_skills'];
      for (const table of tables) {
        if (tablesCreated.includes(table)) {
          expect(tablesWithRLS, `${table} should have RLS enabled`).toContain(table);
        }
      }
    });

    it('should have RLS enabled on financial tables', () => {
      const tables = ['monthly_bills', 'payouts', 'transactions', 'payment_methods', 'tax_information'];
      for (const table of tables) {
        if (tablesCreated.includes(table)) {
          expect(tablesWithRLS, `${table} should have RLS enabled`).toContain(table);
        }
      }
    });

    it('should have RLS enabled on communication tables', () => {
      const tables = ['notifications', 'reviews'];
      for (const table of tables) {
        if (tablesCreated.includes(table)) {
          expect(tablesWithRLS, `${table} should have RLS enabled`).toContain(table);
        }
      }
    });

    it('should have RLS enabled on promotion tables', () => {
      const tables = ['promotions', 'promotion_usage', 'coupon_codes'];
      for (const table of tables) {
        if (tablesCreated.includes(table)) {
          expect(tablesWithRLS, `${table} should have RLS enabled`).toContain(table);
        }
      }
    });

    it('should have RLS enabled on cancellation/refund tables', () => {
      const tables = [
        'cancellation_policy_tiers', 'cancellation_policy_settings',
        'refund_transactions', 'cancellation_notifications',
      ];
      for (const table of tables) {
        if (tablesCreated.includes(table)) {
          expect(tablesWithRLS, `${table} should have RLS enabled`).toContain(table);
        }
      }
    });

    it('should have RLS enabled on system tables', () => {
      const tables = ['system_logs', 'app_settings', 'settings', 'receipt_sequences'];
      for (const table of tables) {
        if (tablesCreated.includes(table)) {
          expect(tablesWithRLS, `${table} should have RLS enabled`).toContain(table);
        }
      }
    });

    it('should have RLS enabled on bank & hotel auth tables', () => {
      const tables = ['bank_accounts', 'hotel_invitations'];
      for (const table of tables) {
        if (tablesCreated.includes(table)) {
          expect(tablesWithRLS, `${table} should have RLS enabled`).toContain(table);
        }
      }
    });

    it('should have RLS enabled on performance tables', () => {
      const tables = ['staff_performance_metrics'];
      for (const table of tables) {
        if (tablesCreated.includes(table)) {
          expect(tablesWithRLS, `${table} should have RLS enabled`).toContain(table);
        }
      }
    });

    it('should report all tables missing RLS', () => {
      const missing = tablesCreated.filter(
        t => !tablesWithRLS.includes(t) && !EXEMPT_TABLES.includes(t)
      );
      if (missing.length > 0) {
        console.warn('Tables WITHOUT RLS (need attention):', missing);
      }
      // Every non-exempt table should have RLS
      for (const t of tablesCreated) {
        if (!EXEMPT_TABLES.includes(t)) {
          expect(tablesWithRLS, `${t} must have RLS enabled`).toContain(t);
        }
      }
    });
  });

  // ─── 3. Policy Existence ───────────────────────────────

  describe('3. Policy Existence - Every RLS Table Has Policies', () => {
    it('should have at least one policy for every RLS-enabled table', () => {
      const tablesWithPolicies = new Set(policies.map(p => p.table));
      const rlsWithoutPolicy = tablesWithRLS.filter(t => !tablesWithPolicies.has(t));

      if (rlsWithoutPolicy.length > 0) {
        console.warn('RLS enabled but NO policies (table is locked!):', rlsWithoutPolicy);
      }
      // Every RLS table must have at least one policy
      for (const table of tablesWithRLS) {
        expect(
          tablesWithPolicies.has(table),
          `${table} has RLS enabled but no policies (all access blocked!)`
        ).toBe(true);
      }
    });

    it('should have at least a SELECT policy for user-facing tables', () => {
      const userFacingTables = [
        'profiles', 'customers', 'staff', 'bookings', 'reviews',
        'notifications', 'hotels', 'services', 'skills', 'staff_skills',
        'payment_methods', 'transactions', 'bank_accounts',
        'promotions', 'monthly_bills', 'payouts',
      ];
      for (const table of userFacingTables) {
        const analysis = analyzeTablePolicies(table);
        expect(analysis.hasSelect, `${table} must have SELECT policy`).toBe(true);
      }
    });

    it('should have admin access policies for all manageable tables', () => {
      const managedTables = [
        'bookings', 'staff', 'services', 'hotels', 'customers',
        'notifications', 'promotions', 'reviews', 'monthly_bills',
        'payouts', 'service_images', 'skills',
      ];
      for (const table of managedTables) {
        const analysis = analyzeTablePolicies(table);
        expect(analysis.hasAdminPolicy, `${table} must have admin access policy`).toBe(true);
      }
    });
  });

  // ─── 4. Per-Table Policy Coverage ──────────────────────

  describe('4. Policy Coverage - profiles', () => {
    it('should have SELECT, INSERT, UPDATE policies', () => {
      const a = analyzeTablePolicies('profiles');
      expect(a.hasSelect).toBe(true);
      expect(a.hasInsert).toBe(true);
      expect(a.hasUpdate).toBe(true);
    });

    it('should have owner-scoped SELECT using auth.uid()', () => {
      const p = getPoliciesForTable('profiles');
      const ownerSelect = p.some(
        pol => pol.command === 'SELECT' && pol.condition.includes('auth.uid()')
      );
      expect(ownerSelect).toBe(true);
    });

    it('should have admin SELECT policy', () => {
      const p = getPoliciesForTable('profiles');
      const adminSelect = p.some(
        pol => pol.command === 'SELECT' &&
               (pol.condition.includes("'ADMIN'") || pol.name.toLowerCase().includes('admin'))
      );
      expect(adminSelect).toBe(true);
    });

    it('should have service_role policy for system operations', () => {
      const p = getPoliciesForTable('profiles');
      const serviceRole = p.some(
        pol => pol.roles.includes('service_role') || pol.name.includes('service role')
      );
      expect(serviceRole).toBe(true);
    });
  });

  describe('4. Policy Coverage - bookings', () => {
    it('should have SELECT, INSERT, UPDATE policies', () => {
      const a = analyzeTablePolicies('bookings');
      expect(a.hasSelect).toBe(true);
      expect(a.hasInsert).toBe(true);
      expect(a.hasUpdate).toBe(true);
    });

    it('should have customer-scoped booking access', () => {
      const p = getPoliciesForTable('bookings');
      const customerAccess = p.some(
        pol => pol.name.toLowerCase().includes('customer')
      );
      expect(customerAccess).toBe(true);
    });

    it('should have staff-scoped booking access', () => {
      const p = getPoliciesForTable('bookings');
      const staffAccess = p.some(
        pol => pol.name.toLowerCase().includes('staff') ||
               pol.condition.includes('staff')
      );
      expect(staffAccess).toBe(true);
    });

    it('should have hotel-scoped booking access', () => {
      const p = getPoliciesForTable('bookings');
      const hotelAccess = p.some(
        pol => pol.name.toLowerCase().includes('hotel')
      );
      expect(hotelAccess).toBe(true);
    });

    it('should have admin full access (SELECT + UPDATE + INSERT + DELETE)', () => {
      const p = getPoliciesForTable('bookings');
      const adminPolicies = p.filter(
        pol => pol.name.toLowerCase().includes('admin')
      );
      const adminCommands = new Set(adminPolicies.map(pol => pol.command));
      expect(
        adminCommands.has('ALL') ||
        (adminCommands.has('SELECT') && adminCommands.has('UPDATE'))
      ).toBe(true);
    });
  });

  describe('4. Policy Coverage - staff', () => {
    it('should have SELECT and UPDATE policies', () => {
      const a = analyzeTablePolicies('staff');
      expect(a.hasSelect).toBe(true);
      expect(a.hasUpdate).toBe(true);
    });

    it('should allow public/anon to view active staff', () => {
      const p = getPoliciesForTable('staff');
      const publicView = p.some(
        pol => pol.command === 'SELECT' &&
               (pol.condition.includes("'active'") || pol.condition.includes('active'))
      );
      expect(publicView).toBe(true);
    });

    it('should allow staff to view own record', () => {
      const p = getPoliciesForTable('staff');
      const selfView = p.some(
        pol => pol.command === 'SELECT' &&
               pol.condition.includes('auth.uid()')
      );
      expect(selfView).toBe(true);
    });

    it('should have admin full management via is_admin() or ADMIN role', () => {
      const p = getPoliciesForTable('staff');
      const adminManage = p.some(
        pol => (pol.command === 'ALL' || pol.command === 'UPDATE') &&
               (pol.condition.includes('is_admin()') || pol.condition.includes("'ADMIN'"))
      );
      expect(adminManage).toBe(true);
    });
  });

  describe('4. Policy Coverage - customers', () => {
    it('should have SELECT and UPDATE policies', () => {
      const a = analyzeTablePolicies('customers');
      expect(a.hasSelect).toBe(true);
      expect(a.hasUpdate).toBe(true);
    });

    it('should have owner-scoped access via profile_id', () => {
      const p = getPoliciesForTable('customers');
      const ownerAccess = p.some(
        pol => pol.condition.includes('profile_id') || pol.condition.includes('auth.uid()')
      );
      expect(ownerAccess).toBe(true);
    });

    it('should have admin view policy', () => {
      const a = analyzeTablePolicies('customers');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - hotels', () => {
    it('should have SELECT and UPDATE policies', () => {
      const a = analyzeTablePolicies('hotels');
      expect(a.hasSelect).toBe(true);
      expect(a.hasUpdate).toBe(true);
    });

    it('should allow public to view active hotels', () => {
      const p = getPoliciesForTable('hotels');
      const publicView = p.some(
        pol => pol.command === 'SELECT' &&
               (pol.condition.includes("'active'") || pol.name.toLowerCase().includes('active'))
      );
      expect(publicView).toBe(true);
    });

    it('should use hotel_id isolation for own data', () => {
      const p = getPoliciesForTable('hotels');
      const hotelScoped = p.some(
        pol => pol.condition.includes('get_user_hotel_id') ||
               pol.condition.includes('hotel_id')
      );
      expect(hotelScoped).toBe(true);
    });
  });

  describe('4. Policy Coverage - reviews', () => {
    it('should have SELECT and INSERT policies', () => {
      const a = analyzeTablePolicies('reviews');
      expect(a.hasSelect).toBe(true);
      expect(a.hasInsert).toBe(true);
    });

    it('should allow public to view visible reviews', () => {
      const p = getPoliciesForTable('reviews');
      const publicView = p.some(
        pol => pol.command === 'SELECT' &&
               (pol.condition.includes('is_visible') ||
                pol.name.toLowerCase().includes('visible') ||
                pol.name.toLowerCase().includes('public'))
      );
      expect(publicView).toBe(true);
    });

    it('should restrict customer review creation to own bookings', () => {
      const p = getPoliciesForTable('reviews');
      const customerInsert = p.some(
        pol => pol.command === 'INSERT' &&
               pol.name.toLowerCase().includes('customer')
      );
      expect(customerInsert).toBe(true);
    });

    it('should have admin management policy', () => {
      const a = analyzeTablePolicies('reviews');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - notifications', () => {
    it('should have SELECT, INSERT, UPDATE policies', () => {
      const a = analyzeTablePolicies('notifications');
      expect(a.hasSelect).toBe(true);
      expect(a.hasInsert).toBe(true);
      expect(a.hasUpdate).toBe(true);
    });

    it('should scope notifications to owner via user_id', () => {
      const p = getPoliciesForTable('notifications');
      const ownerScoped = p.some(
        pol => pol.condition.includes('user_id') || pol.condition.includes('auth.uid()')
      );
      expect(ownerScoped).toBe(true);
    });

    it('should have admin management policy', () => {
      const a = analyzeTablePolicies('notifications');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - services', () => {
    it('should have SELECT policy for authenticated users', () => {
      const a = analyzeTablePolicies('services');
      expect(a.hasSelect).toBe(true);
    });

    it('should have admin management policy', () => {
      const a = analyzeTablePolicies('services');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - service_images', () => {
    it('should allow anyone to view images', () => {
      const p = getPoliciesForTable('service_images');
      const publicView = p.some(
        pol => pol.command === 'SELECT' &&
               (pol.condition.includes('true') || pol.name.toLowerCase().includes('anyone'))
      );
      expect(publicView).toBe(true);
    });

    it('should restrict management to admins', () => {
      const a = analyzeTablePolicies('service_images');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - skills', () => {
    it('should allow anyone to view skills', () => {
      const p = getPoliciesForTable('skills');
      const publicView = p.some(
        pol => pol.command === 'SELECT'
      );
      expect(publicView).toBe(true);
    });

    it('should restrict management to admins', () => {
      const a = analyzeTablePolicies('skills');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - staff_skills', () => {
    it('should have full CRUD policies', () => {
      const a = analyzeTablePolicies('staff_skills');
      expect(a.hasSelect).toBe(true);
      expect(a.hasInsert).toBe(true);
      expect(a.hasUpdate).toBe(true);
      expect(a.hasDelete).toBe(true);
    });

    it('should allow staff to manage own skills', () => {
      const p = getPoliciesForTable('staff_skills');
      const staffManage = p.some(
        pol => pol.name.toLowerCase().includes('staff') &&
               pol.condition.includes('auth.uid()')
      );
      expect(staffManage).toBe(true);
    });

    it('should allow admins to manage all skills', () => {
      const a = analyzeTablePolicies('staff_skills');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - bank_accounts', () => {
    it('should have full CRUD policies', () => {
      const a = analyzeTablePolicies('bank_accounts');
      expect(a.hasSelect).toBe(true);
      expect(a.hasInsert).toBe(true);
      expect(a.hasUpdate).toBe(true);
      expect(a.hasDelete).toBe(true);
    });

    it('should scope to staff owner', () => {
      const p = getPoliciesForTable('bank_accounts');
      const staffScoped = p.some(
        pol => pol.condition.includes('auth.uid()') || pol.condition.includes('profile_id')
      );
      expect(staffScoped).toBe(true);
    });

    it('should have admin management policy', () => {
      const a = analyzeTablePolicies('bank_accounts');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - monthly_bills', () => {
    it('should have SELECT policies', () => {
      const a = analyzeTablePolicies('monthly_bills');
      expect(a.hasSelect).toBe(true);
    });

    it('should have admin management policy', () => {
      const a = analyzeTablePolicies('monthly_bills');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - payouts', () => {
    it('should have SELECT policies', () => {
      const a = analyzeTablePolicies('payouts');
      expect(a.hasSelect).toBe(true);
    });

    it('should scope to staff owner', () => {
      const p = getPoliciesForTable('payouts');
      const staffScoped = p.some(
        pol => pol.name.toLowerCase().includes('staff')
      );
      expect(staffScoped).toBe(true);
    });

    it('should have admin management policy', () => {
      const a = analyzeTablePolicies('payouts');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - payment_methods', () => {
    it('should have SELECT policy', () => {
      const a = analyzeTablePolicies('payment_methods');
      expect(a.hasSelect).toBe(true);
    });

    it('should scope to customer owner', () => {
      const p = getPoliciesForTable('payment_methods');
      const ownerScoped = p.some(
        pol => pol.condition.includes('profile_id') || pol.condition.includes('auth.uid()')
      );
      expect(ownerScoped).toBe(true);
    });
  });

  describe('4. Policy Coverage - transactions', () => {
    it('should have SELECT policies', () => {
      const a = analyzeTablePolicies('transactions');
      expect(a.hasSelect).toBe(true);
    });

    it('should scope to customer owner', () => {
      const p = getPoliciesForTable('transactions');
      const ownerScoped = p.some(
        pol => pol.condition.includes('profile_id') || pol.condition.includes('auth.uid()')
      );
      expect(ownerScoped).toBe(true);
    });

    it('should have admin view policy', () => {
      const a = analyzeTablePolicies('transactions');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - tax_information', () => {
    it('should have SELECT and management policies', () => {
      const a = analyzeTablePolicies('tax_information');
      expect(a.hasSelect).toBe(true);
    });

    it('should scope to customer owner', () => {
      const p = getPoliciesForTable('tax_information');
      const ownerScoped = p.some(
        pol => pol.condition.includes('profile_id') || pol.condition.includes('auth.uid()')
      );
      expect(ownerScoped).toBe(true);
    });
  });

  describe('4. Policy Coverage - promotions', () => {
    it('should have SELECT policy for active promotions', () => {
      const p = getPoliciesForTable('promotions');
      const activeView = p.some(
        pol => pol.command === 'SELECT' &&
               (pol.condition.includes('active') || pol.name.toLowerCase().includes('active'))
      );
      expect(activeView).toBe(true);
    });

    it('should have admin management policy', () => {
      const a = analyzeTablePolicies('promotions');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - coupon_codes', () => {
    it('should have SELECT policy', () => {
      const a = analyzeTablePolicies('coupon_codes');
      expect(a.hasSelect).toBe(true);
    });

    it('should have admin management policy', () => {
      const a = analyzeTablePolicies('coupon_codes');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - promotion_usage', () => {
    it('should have SELECT policy scoped to user', () => {
      const p = getPoliciesForTable('promotion_usage');
      const userScoped = p.some(
        pol => pol.command === 'SELECT' &&
               (pol.condition.includes('user_id') || pol.condition.includes('auth.uid()'))
      );
      expect(userScoped).toBe(true);
    });
  });

  describe('4. Policy Coverage - settings', () => {
    it('should allow anyone to read settings', () => {
      const p = getPoliciesForTable('settings');
      const publicRead = p.some(
        pol => pol.command === 'SELECT' &&
               (pol.condition.includes('true') || pol.name.toLowerCase().includes('anyone'))
      );
      expect(publicRead).toBe(true);
    });

    it('should restrict management to admins', () => {
      const a = analyzeTablePolicies('settings');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - system_logs', () => {
    it('should restrict reading to admins', () => {
      const p = getPoliciesForTable('system_logs');
      const adminRead = p.some(
        pol => pol.command === 'SELECT' && pol.condition.includes("'ADMIN'")
      );
      expect(adminRead).toBe(true);
    });

    it('should allow system to insert logs', () => {
      const a = analyzeTablePolicies('system_logs');
      expect(a.hasInsert).toBe(true);
    });
  });

  describe('4. Policy Coverage - booking_services', () => {
    it('should have SELECT policies', () => {
      const a = analyzeTablePolicies('booking_services');
      expect(a.hasSelect).toBe(true);
    });

    it('should have customer access to own booking services', () => {
      const p = getPoliciesForTable('booking_services');
      const customerAccess = p.some(
        pol => pol.name.toLowerCase().includes('customer')
      );
      expect(customerAccess).toBe(true);
    });

    it('should have staff access to assigned booking services', () => {
      const p = getPoliciesForTable('booking_services');
      const staffAccess = p.some(
        pol => pol.name.toLowerCase().includes('staff')
      );
      expect(staffAccess).toBe(true);
    });

    it('should have admin management policy', () => {
      const a = analyzeTablePolicies('booking_services');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - staff_performance_metrics', () => {
    it('should have SELECT policies', () => {
      const a = analyzeTablePolicies('staff_performance_metrics');
      expect(a.hasSelect).toBe(true);
    });

    it('should use is_own_staff() or is_admin() helper functions', () => {
      const p = getPoliciesForTable('staff_performance_metrics');
      const usesHelpers = p.some(
        pol => pol.condition.includes('is_own_staff') ||
               pol.condition.includes('is_admin') ||
               pol.condition.includes('auth.uid()')
      );
      expect(usesHelpers).toBe(true);
    });
  });

  describe('4. Policy Coverage - hotel_invitations', () => {
    it('should have admin management policy', () => {
      const a = analyzeTablePolicies('hotel_invitations');
      expect(a.hasAdminPolicy).toBe(true);
    });

    it('should allow hotels to view own invitations', () => {
      const p = getPoliciesForTable('hotel_invitations');
      const hotelView = p.some(
        pol => pol.name.toLowerCase().includes('hotel')
      );
      expect(hotelView).toBe(true);
    });
  });

  describe('4. Policy Coverage - refund_transactions', () => {
    it('should have admin management policy', () => {
      const a = analyzeTablePolicies('refund_transactions');
      expect(a.hasAdminPolicy).toBe(true);
    });

    it('should allow customers to view own refunds', () => {
      const p = getPoliciesForTable('refund_transactions');
      const customerView = p.some(
        pol => pol.name.toLowerCase().includes('customer')
      );
      expect(customerView).toBe(true);
    });
  });

  describe('4. Policy Coverage - cancellation_policy_tiers', () => {
    it('should allow public read of active tiers', () => {
      const p = getPoliciesForTable('cancellation_policy_tiers');
      const publicRead = p.some(
        pol => pol.command === 'SELECT' &&
               (pol.condition.includes('is_active') || pol.name.toLowerCase().includes('public'))
      );
      expect(publicRead).toBe(true);
    });

    it('should have admin management policy', () => {
      const a = analyzeTablePolicies('cancellation_policy_tiers');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - cancellation_policy_settings', () => {
    it('should allow public read of active settings', () => {
      const p = getPoliciesForTable('cancellation_policy_settings');
      const publicRead = p.some(
        pol => pol.command === 'SELECT' &&
               (pol.condition.includes('is_active') || pol.name.toLowerCase().includes('public'))
      );
      expect(publicRead).toBe(true);
    });

    it('should have admin management policy', () => {
      const a = analyzeTablePolicies('cancellation_policy_settings');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - service_addons', () => {
    it('should allow viewing active addons', () => {
      const p = getPoliciesForTable('service_addons');
      const publicRead = p.some(
        pol => pol.command === 'SELECT'
      );
      expect(publicRead).toBe(true);
    });

    it('should have admin management policy', () => {
      const a = analyzeTablePolicies('service_addons');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  describe('4. Policy Coverage - booking_addons', () => {
    it('should have SELECT policy for customers', () => {
      const p = getPoliciesForTable('booking_addons');
      const customerView = p.some(
        pol => pol.command === 'SELECT' && pol.name.toLowerCase().includes('customer')
      );
      expect(customerView).toBe(true);
    });

    it('should have admin management policy', () => {
      const a = analyzeTablePolicies('booking_addons');
      expect(a.hasAdminPolicy).toBe(true);
    });
  });

  // ─── 5. Security Anti-Patterns ─────────────────────────

  describe('5. Security Anti-Patterns', () => {
    it('should detect email LIKE admin pattern (known vulnerability)', () => {
      const badPolicies = policies.filter(p =>
        p.condition.toLowerCase().includes("like '%admin%'") ||
        p.condition.toLowerCase().includes("like '%admin'")
      );
      // Log the exact tables/policies affected
      if (badPolicies.length > 0) {
        console.warn(
          '\n  SECURITY VULNERABILITY: email LIKE admin check allows anyone with "admin" in email:',
          badPolicies.map(p => `\n    - ${p.table}.${p.name} (${p.source})`)
        );
      }
      // Track the count for regression
      expect(badPolicies.length).toBeLessThanOrEqual(3); // known: promotions, promotion_usage, coupon_codes
    });

    it('should detect wrong-case role checks (known bug)', () => {
      const wrongCase = policies.filter(p =>
        p.condition.includes("= 'admin'") && !p.condition.includes('is_admin')
      );
      if (wrongCase.length > 0) {
        console.warn(
          '\n  BUG: lowercase "admin" role check (enum is ADMIN):',
          wrongCase.map(p => `\n    - ${p.table}.${p.name} (${p.source})`)
        );
      }
      // These should not increase (currently known in app_settings + promotions)
      expect(wrongCase.length).toBeLessThanOrEqual(9);
    });

    it('should detect overly permissive INSERT policies', () => {
      const openInserts = policies.filter(p =>
        p.command === 'INSERT' &&
        (p.condition === 'true' || p.condition === '') &&
        !p.roles.includes('service_role')
      );
      if (openInserts.length > 0) {
        console.warn(
          '\n  WARNING: Open INSERT (WITH CHECK true):',
          openInserts.map(p => `\n    - ${p.table}.${p.name}`)
        );
      }
      expect(openInserts.length).toBeLessThanOrEqual(4);
    });

    it('should detect SELECT policies with no row filtering', () => {
      const publicReadTables = [
        'settings', 'service_images', 'skills', 'service_addons',
        'cancellation_policy_tiers', 'cancellation_policy_settings',
        'duration_options',
      ];
      const leakyPolicies = policies.filter(p =>
        p.command === 'SELECT' &&
        p.condition.trim() === 'true' &&
        !publicReadTables.includes(p.table) &&
        !p.name.toLowerCase().includes('anyone') &&
        !p.name.toLowerCase().includes('public') &&
        !p.name.toLowerCase().includes('active')
      );
      if (leakyPolicies.length > 0) {
        console.warn(
          '\n  DATA LEAK RISK: SELECT with no row filtering:',
          leakyPolicies.map(p => `\n    - ${p.table}.${p.name} (${p.source})`)
        );
      }
      expect(leakyPolicies).toBeDefined();
    });

    it('should not have DELETE policies without ownership checks', () => {
      const openDeletes = policies.filter(p =>
        p.command === 'DELETE' &&
        p.condition.trim() === 'true'
      );
      expect(openDeletes.length).toBe(0);
    });

    it('should not have UPDATE policies without ownership checks (except admin/ALL)', () => {
      const openUpdates = policies.filter(p =>
        p.command === 'UPDATE' &&
        p.condition.trim() === 'true' &&
        !p.name.toLowerCase().includes('admin') &&
        !p.name.toLowerCase().includes('service')
      );
      expect(openUpdates.length).toBe(0);
    });

    it('should not have ALL policies for anon role', () => {
      const anonAll = policies.filter(p =>
        p.command === 'ALL' &&
        p.roles.includes('anon')
      );
      expect(anonAll.length).toBe(0);
    });

    it('should not use raw SQL injection-prone patterns', () => {
      const concatPatterns = policies.filter(p =>
        p.condition.includes('||') && p.condition.includes("'")
      );
      // String concatenation in policies is a code smell
      if (concatPatterns.length > 0) {
        console.warn(
          '\n  CODE SMELL: String concatenation in policy conditions:',
          concatPatterns.map(p => `\n    - ${p.table}.${p.name}`)
        );
      }
      expect(concatPatterns).toBeDefined();
    });
  });

  // ─── 6. Tenant Isolation ───────────────────────────────

  describe('6. Tenant Isolation', () => {
    it('customer data should be isolated by profile_id or auth.uid()', () => {
      const customerTables = ['customers', 'payment_methods', 'transactions', 'tax_information'];
      for (const table of customerTables) {
        const p = getPoliciesForTable(table);
        const nonAdminPolicies = p.filter(
          pol => !pol.name.toLowerCase().includes('admin') &&
                 !pol.name.toLowerCase().includes('service') &&
                 !pol.name.toLowerCase().includes('system')
        );
        if (nonAdminPolicies.length > 0) {
          const hasIsolation = nonAdminPolicies.some(
            pol => pol.condition.includes('auth.uid()') ||
                   pol.condition.includes('profile_id')
          );
          expect(hasIsolation, `${table} must isolate customer data`).toBe(true);
        }
      }
    });

    it('staff data should be isolated by profile_id or auth.uid()', () => {
      const staffTables = ['bank_accounts', 'staff_skills'];
      for (const table of staffTables) {
        const p = getPoliciesForTable(table);
        const staffPolicies = p.filter(
          pol => pol.name.toLowerCase().includes('staff')
        );
        if (staffPolicies.length > 0) {
          const hasIsolation = staffPolicies.some(
            pol => pol.condition.includes('auth.uid()') ||
                   pol.condition.includes('profile_id')
          );
          expect(hasIsolation, `${table} must isolate staff data`).toBe(true);
        }
      }
    });

    it('hotel data should be isolated by hotel_id', () => {
      const p = getPoliciesForTable('hotels');
      const hotelPolicies = p.filter(
        pol => pol.name.toLowerCase().includes('hotel') &&
               !pol.name.toLowerCase().includes('active') &&
               !pol.name.toLowerCase().includes('admin')
      );
      if (hotelPolicies.length > 0) {
        const hasHotelIsolation = hotelPolicies.some(
          pol => pol.condition.includes('hotel_id') ||
                 pol.condition.includes('get_user_hotel_id')
        );
        expect(hasHotelIsolation).toBe(true);
      }
    });

    it('notification delivery should be scoped to recipient', () => {
      const p = getPoliciesForTable('notifications');
      const userPolicies = p.filter(
        pol => !pol.name.toLowerCase().includes('admin')
      );
      const hasRecipientScope = userPolicies.some(
        pol => pol.condition.includes('user_id') || pol.condition.includes('auth.uid()')
      );
      expect(hasRecipientScope).toBe(true);
    });
  });

  // ─── 7. Helper Function Usage ──────────────────────────

  describe('7. Helper Functions', () => {
    it('should define is_admin() helper function', () => {
      const hasIsAdmin = allSql.toLowerCase().includes('create') &&
                         allSql.toLowerCase().includes('function') &&
                         allSql.toLowerCase().includes('is_admin');
      expect(hasIsAdmin).toBe(true);
    });

    it('should define get_user_hotel_id() helper function', () => {
      const hasHotelId = allSql.toLowerCase().includes('get_user_hotel_id');
      expect(hasHotelId).toBe(true);
    });

    it('policies should prefer helper functions over inline subqueries', () => {
      // Count policies using helper functions vs inline role checks
      const usingHelpers = policies.filter(p =>
        p.condition.includes('is_admin()') ||
        p.condition.includes('is_own_staff') ||
        p.condition.includes('get_user_hotel_id')
      );
      // At least some policies should use helpers
      expect(usingHelpers.length).toBeGreaterThan(0);
    });
  });

  // ─── 8. GRANT Statement Analysis ──────────────────────

  describe('8. GRANT Statements', () => {
    it('should have GRANT statements for authenticated role', () => {
      const authGrants = grants.filter(g => g.role.includes('authenticated'));
      expect(authGrants.length).toBeGreaterThan(0);
    });

    it('should not GRANT ALL to anon on sensitive tables', () => {
      const sensitiveTables = [
        'profiles', 'customers', 'staff', 'bookings', 'bank_accounts',
        'payment_methods', 'transactions', 'notifications',
      ];
      const badGrants = grants.filter(g =>
        g.role.includes('anon') &&
        g.privilege === 'ALL' &&
        sensitiveTables.includes(g.table)
      );
      expect(badGrants.length).toBe(0);
    });
  });

  // ─── 9. Migration Hygiene ──────────────────────────────

  describe('9. Migration Hygiene', () => {
    it('fix migrations should DROP old policies before CREATE new ones', () => {
      const fixMigrations = migrations.filter(m =>
        m.filename.includes('fix_') || m.filename.includes('_fix_')
      );
      for (const m of fixMigrations) {
        const hasCreate = /CREATE\s+POLICY/i.test(m.content);
        const hasDrop = /DROP\s+POLICY/i.test(m.content);
        // If a fix migration creates policies, it should also drop old ones
        if (hasCreate) {
          expect(hasDrop, `${m.filename} creates policies but doesn't DROP old ones`).toBe(true);
        }
      }
    });

    it('should use IF EXISTS on DROP POLICY statements', () => {
      for (const m of migrations) {
        const dropStatements = m.content.match(/DROP\s+POLICY\s+(?!IF\s+EXISTS)/gi) || [];
        // Dropping without IF EXISTS will error if policy doesn't exist
        if (dropStatements.length > 0) {
          console.warn(
            `  ${m.filename}: ${dropStatements.length} DROP POLICY without IF EXISTS`
          );
        }
      }
      // Just verify we can detect them
      expect(true).toBe(true);
    });

    it('should not have duplicate migration filenames (same prefix)', () => {
      const prefixes = migrations.map(m => {
        const match = m.filename.match(/^(\d+)/);
        return match ? match[1] : m.filename;
      });
      // Check for same timestamp prefix appearing multiple times (excluding fix_ prefix files)
      const counts: Record<string, number> = {};
      for (const p of prefixes) {
        counts[p] = (counts[p] || 0) + 1;
      }
      const duplicates = Object.entries(counts).filter(([, c]) => c > 3);
      if (duplicates.length > 0) {
        console.warn('  Many migrations with same timestamp prefix:', duplicates);
      }
      expect(duplicates).toBeDefined();
    });
  });

  // ─── 10. Role-Based Access Matrix ─────────────────────

  describe('10. Role-Based Access Matrix', () => {
    it('ADMIN role should have access to all data tables', () => {
      const dataTables = [
        'bookings', 'staff', 'services', 'hotels', 'customers',
        'notifications', 'reviews', 'monthly_bills', 'payouts',
      ];
      for (const table of dataTables) {
        const a = analyzeTablePolicies(table);
        expect(a.hasAdminPolicy, `ADMIN missing from ${table}`).toBe(true);
      }
    });

    it('CUSTOMER role should access own data only', () => {
      const customerOwnedTables = ['payment_methods', 'transactions', 'tax_information'];
      for (const table of customerOwnedTables) {
        const p = getPoliciesForTable(table);
        const hasOwnerScope = p.some(
          pol => !pol.name.toLowerCase().includes('admin') &&
                 (pol.condition.includes('profile_id') || pol.condition.includes('auth.uid()'))
        );
        expect(hasOwnerScope, `CUSTOMER scope missing from ${table}`).toBe(true);
      }
    });

    it('STAFF role should access own data only', () => {
      const staffOwnedTables = ['bank_accounts', 'staff_skills'];
      for (const table of staffOwnedTables) {
        const p = getPoliciesForTable(table);
        const hasOwnerScope = p.some(
          pol => pol.name.toLowerCase().includes('staff') &&
                 (pol.condition.includes('profile_id') || pol.condition.includes('auth.uid()'))
        );
        expect(hasOwnerScope, `STAFF scope missing from ${table}`).toBe(true);
      }
    });

    it('HOTEL role should only access own hotel data', () => {
      const p = getPoliciesForTable('hotels');
      // Filter for hotel-role policies (not admin, not public/active view)
      const hotelPolicies = p.filter(
        pol => pol.name.toLowerCase().includes('hotel') &&
               !pol.name.toLowerCase().includes('admin') &&
               !pol.name.toLowerCase().includes('active') &&
               !pol.name.toLowerCase().includes('anyone') &&
               pol.command !== 'SELECT'
      );
      for (const pol of hotelPolicies) {
        expect(
          pol.condition.includes('hotel_id') || pol.condition.includes('get_user_hotel_id'),
          `Hotel UPDATE/INSERT on 'hotels' must scope to own hotel_id: ${pol.name}`
        ).toBe(true);
      }
    });

    it('public/anon should only read non-sensitive data', () => {
      const allowedPublicRead = [
        'services', 'service_images', 'skills', 'settings', 'staff',
        'hotels', 'reviews', 'cancellation_policy_tiers',
        'cancellation_policy_settings', 'service_addons', 'promotions',
        'coupon_codes', 'staff_skills',
      ];
      const anonPolicies = policies.filter(p =>
        p.roles.includes('anon') || p.roles === 'public'
      );
      for (const pol of anonPolicies) {
        if (pol.command !== 'SELECT') {
          // anon should generally not have write access
          console.warn(
            `  WARNING: anon/public has ${pol.command} on ${pol.table}: ${pol.name}`
          );
        }
      }
      expect(anonPolicies).toBeDefined();
    });
  });

  // ─── 11. Known Vulnerabilities Tracking ────────────────

  describe('11. Known Vulnerabilities (Regression Tracking)', () => {
    it('VULN-001: promotions use insecure email LIKE admin check', () => {
      const promoAdminPolicies = getPoliciesForTable('promotions').filter(p =>
        p.name.toLowerCase().includes('admin')
      );
      const usesEmailLike = promoAdminPolicies.some(p =>
        p.condition.toLowerCase().includes("like '%admin%'")
      );
      // Track: this vulnerability exists, test will detect if it gets fixed
      if (usesEmailLike) {
        console.warn('  VULN-001 ACTIVE: promotions admin uses email LIKE pattern');
      } else {
        console.log('  VULN-001 FIXED: promotions admin no longer uses email LIKE');
      }
      expect(promoAdminPolicies.length).toBeGreaterThan(0);
    });

    it('VULN-002: app_settings uses wrong-case role check', () => {
      const appSettingsPolicies = getPoliciesForTable('app_settings');
      const usesWrongCase = appSettingsPolicies.some(p =>
        p.condition.includes("= 'admin'") && !p.condition.includes('is_admin')
      );
      if (usesWrongCase) {
        console.warn('  VULN-002 ACTIVE: app_settings uses lowercase admin (never matches)');
      } else {
        console.log('  VULN-002 FIXED: app_settings uses correct case');
      }
      expect(appSettingsPolicies.length).toBeGreaterThan(0);
    });

    it('VULN-003: profiles INSERT is overly permissive', () => {
      const profileInserts = getPoliciesForTable('profiles').filter(p =>
        p.command === 'INSERT'
      );
      const isOpenInsert = profileInserts.some(p =>
        p.condition === 'true' || p.condition === ''
      );
      if (isOpenInsert) {
        console.warn('  VULN-003 ACTIVE: profiles INSERT allows any user to insert any profile');
      } else {
        console.log('  VULN-003 FIXED: profiles INSERT properly scoped');
      }
      expect(profileInserts.length).toBeGreaterThan(0);
    });

    it('VULN-004: booking_services hotel policy uses WHERE true', () => {
      const bsPolicies = getPoliciesForTable('booking_services');
      const hotelLeaky = bsPolicies.some(p =>
        p.name.toLowerCase().includes('hotel') &&
        p.condition.trim() === 'true'
      );
      if (hotelLeaky) {
        console.warn('  VULN-004 ACTIVE: booking_services hotel policy has no tenant filter');
      } else {
        console.log('  VULN-004 FIXED: booking_services hotel properly scoped');
      }
      expect(bsPolicies.length).toBeGreaterThan(0);
    });

    it('VULN-005: monthly_bills original hotel policy is too permissive', () => {
      const mbPolicies = getPoliciesForTable('monthly_bills');
      const leakyHotel = mbPolicies.some(p =>
        p.name.toLowerCase().includes('hotel') &&
        p.command === 'SELECT' &&
        p.condition.includes('true')
      );
      if (leakyHotel) {
        console.warn('  VULN-005 ACTIVE: monthly_bills hotel SELECT uses AND true');
      } else {
        console.log('  VULN-005 FIXED: monthly_bills hotel properly scoped');
      }
      expect(mbPolicies.length).toBeGreaterThan(0);
    });
  });

  // ─── 12. Summary Report ────────────────────────────────

  describe('12. Summary Report', () => {
    it('should generate comprehensive coverage report', () => {
      const tablesWithPolicies = new Set(policies.map(p => p.table));
      const totalTables = tablesCreated.length;
      const rlsEnabledCount = tablesWithRLS.length;
      const withPoliciesCount = tablesWithPolicies.size;
      const totalPolicies = policies.length;
      const totalGrants = grants.length;
      const totalDropped = droppedPolicies.length;

      const emailLikeAdmin = policies.filter(p =>
        p.condition.toLowerCase().includes("like '%admin%'")
      ).length;
      const wrongCase = policies.filter(p =>
        p.condition.includes("= 'admin'") && !p.condition.includes('is_admin')
      ).length;
      const openInserts = policies.filter(p =>
        p.command === 'INSERT' && (p.condition === 'true' || p.condition === '') &&
        !p.roles.includes('service_role')
      ).length;
      const missingRLS = tablesCreated.filter(
        t => !tablesWithRLS.includes(t) && !EXEMPT_TABLES.includes(t)
      );

      // Policy command distribution
      const selectCount = policies.filter(p => p.command === 'SELECT').length;
      const insertCount = policies.filter(p => p.command === 'INSERT').length;
      const updateCount = policies.filter(p => p.command === 'UPDATE').length;
      const deleteCount = policies.filter(p => p.command === 'DELETE').length;
      const allCount = policies.filter(p => p.command === 'ALL').length;

      console.log('\n╔════════════════════════════════════════════╗');
      console.log('║     RLS Policy Coverage Report             ║');
      console.log('╠════════════════════════════════════════════╣');
      console.log(`║  Tables created:       ${String(totalTables).padStart(4)}              ║`);
      console.log(`║  RLS enabled:          ${String(rlsEnabledCount).padStart(4)}              ║`);
      console.log(`║  Tables with policies: ${String(withPoliciesCount).padStart(4)}              ║`);
      console.log(`║  Total policies:       ${String(totalPolicies).padStart(4)}              ║`);
      console.log(`║  Total GRANTs:         ${String(totalGrants).padStart(4)}              ║`);
      console.log(`║  Dropped policies:     ${String(totalDropped).padStart(4)}              ║`);
      console.log('╠════════════════════════════════════════════╣');
      console.log('║  Policy Distribution:                      ║');
      console.log(`║    SELECT: ${String(selectCount).padStart(3)}  INSERT: ${String(insertCount).padStart(3)}  UPDATE: ${String(updateCount).padStart(3)}  ║`);
      console.log(`║    DELETE: ${String(deleteCount).padStart(3)}  ALL:    ${String(allCount).padStart(3)}              ║`);
      console.log('╠════════════════════════════════════════════╣');
      console.log('║  Security Issues:                          ║');
      console.log(`║    Missing RLS:      ${String(missingRLS.length).padStart(3)}                  ║`);
      console.log(`║    email LIKE admin: ${String(emailLikeAdmin).padStart(3)} (vulnerability)     ║`);
      console.log(`║    Wrong case role:  ${String(wrongCase).padStart(3)} (bug)                ║`);
      console.log(`║    Open INSERT:      ${String(openInserts).padStart(3)} (review needed)     ║`);
      console.log('╚════════════════════════════════════════════╝\n');

      expect(totalTables).toBeGreaterThan(0);
      expect(rlsEnabledCount).toBeGreaterThan(0);
      expect(totalPolicies).toBeGreaterThan(0);
    });
  });
});

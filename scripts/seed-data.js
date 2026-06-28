/**
 * ForgeQuest Seed Data Script
 * Populates the team-db with sample digital assets for testing.
 * 
 * Usage: node scripts/seed-data.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Use execSync to call team-db CLI directly
const { execSync } = require('child_process');

function db(sql) {
  const escaped = sql.replace(/"/g, '\\"');
  return JSON.parse(execSync(`team-db "${escaped}"`, { encoding: 'utf-8' }));
}

function uuid() {
  return require('crypto').randomUUID();
}

console.log('🌱 Seeding ForgeQuest Digital Factory with sample data...\n');

// Sample Blueprints
const blueprints = [
  {
    id: uuid(),
    type: 'blueprint',
    name: 'Max Efficiency Woodcutting Route',
    game: 'RuneScape',
    statsMilestones: 'Tick-perfect tree route\nLevel 1-99: 48 hours estimated\nIncludes banking optimization',
    blueprintUrl: 'https://forgequest.io/blueprints/wc-max-v1.pdf',
    price: 14.99
  },
  {
    id: uuid(),
    type: 'blueprint',
    name: 'Dragon Slayer II Quest Guide',
    game: 'RuneScape',
    statsMilestones: 'Complete DS2 in under 3 hours\nAll boss strategies mapped\nItem checklists included',
    blueprintUrl: 'https://forgequest.io/blueprints/ds2-guide-v2.pdf',
    price: 24.99
  },
  {
    id: uuid(),
    type: 'blueprint',
    name: 'Flipping Mastery — GE Strategy Guide',
    game: 'RuneScape',
    statsMilestones: 'Start with 100k -> 50M in 30 days\nItem spreadsheets included\nMargin tracker template',
    blueprintUrl: 'https://forgequest.io/blueprints/flipping-mastery.pdf',
    price: 19.99
  }
];

// Sample Accounts
const accounts = [
  {
    id: uuid(),
    type: 'account',
    name: 'Maxed Melee Pure',
    game: 'RuneScape',
    statsMilestones: 'Attack: 99\nStrength: 99\nDefence: 1\nHP: 99\nPrayer: 52\nCombat: 85',
    credentials: 'Email: maxpure-fq@proton.me\nPassword: FQ-Maxed-2024!',
    price: 89.99
  },
  {
    id: uuid(),
    type: 'account',
    name: 'Quest Cape + 200m All',
    game: 'RuneScape',
    statsMilestones: 'Quest Cape Completed\nAll skills 99+\nTotal Level: 2376\nAll F2P quests done',
    credentials: 'Email: questmaster-fq@proton.me\nPassword: FQ-QuestCap-2024!',
    price: 249.99
  },
  {
    id: uuid(),
    type: 'account',
    name: 'Skiller Pure — 99 All Non-CB',
    game: 'RuneScape',
    statsMilestones: 'All non-combat skills 99\n10 HP\nFarming: 99\nRunecrafting: 99\nCooking: 99\nFiremaking: 99',
    credentials: 'Email: skiller-fq@proton.me\nPassword: FQ-Skiller-2024!',
    price: 149.99
  }
];

// Insert blueprints
console.log('📄 Adding blueprints...');
blueprints.forEach(bp => {
  const milestones = bp.statsMilestones.replace(/'/g, "''");
  db(`INSERT INTO digital_assets (id, type, name, game, stats_milestones, blueprint_url, price, status) ` +
    `VALUES ('${bp.id}', 'blueprint', '${bp.name.replace(/'/g, "''")}', '${bp.game}', '${milestones}', '${bp.blueprintUrl}', ${bp.price}, 'available')`);
  console.log(`  ✅ Blueprint: ${bp.name} ($${bp.price.toFixed(2)})`);
});

// Insert accounts
console.log('\n👤 Adding accounts...');
accounts.forEach(acc => {
  const milestones = acc.statsMilestones.replace(/'/g, "''");
  const creds = acc.credentials.replace(/'/g, "''");
  db(`INSERT INTO digital_assets (id, type, name, game, stats_milestones, credentials, price, status) ` +
    `VALUES ('${acc.id}', 'account', '${acc.name.replace(/'/g, "''")}', '${acc.game}', '${milestones}', '${creds}', ${acc.price}, 'available')`);
  console.log(`  ✅ Account: ${acc.name} ($${acc.price.toFixed(2)})`);
});

console.log('\n📊 Summary:');
const count = db("SELECT COUNT(*) as count FROM digital_assets");
console.log(`  Total assets seeded: ${count[0].count}`);
console.log('\n✅ Seeding complete! Restart the server to see data in the portal.');
/**
 * ForgeQuest Database Helper
 * Wraps the team-db CLI for structured digital asset operations.
 * All data is stored in the shared Turso database via the team-db CLI.
 */
const { execSync } = require('child_process');
const crypto = require('crypto');

/**
 * Execute a SQL statement via team-db CLI and return parsed JSON.
 */
function query(sql) {
  try {
    const escaped = sql.replace(/"/g, '\\"');
    const output = execSync(`team-db "${escaped}"`, {
      encoding: 'utf-8',
      timeout: 10000
    });
    return JSON.parse(output);
  } catch (err) {
    console.error(`DB query error: ${err.message}`);
    throw err;
  }
}

/**
 * Generate a UUID v4.
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Digital Assets CRUD
 */

// List all available digital assets (accounts & blueprints)
function listAssets(type = null) {
  let sql = "SELECT * FROM digital_assets";
  if (type) {
    sql += ` WHERE type = '${type}'`;
  }
  sql += " ORDER BY created_at DESC";
  return query(sql);
}

// Get a single asset by ID
function getAsset(id) {
  return query(`SELECT * FROM digital_assets WHERE id = '${id}'`);
}

// Create a new digital asset (account or blueprint)
function createAsset({ type, name, game, statsMilestones, credentials, blueprintUrl, price }) {
  const id = generateUUID();
  const milestones = statsMilestones ? `'${statsMilestones.replace(/'/g, "''")}'` : 'NULL';
  const creds = credentials ? `'${credentials.replace(/'/g, "''")}'` : 'NULL';
  const bpUrl = blueprintUrl ? `'${blueprintUrl.replace(/'/g, "''")}'` : 'NULL';

  query(`INSERT INTO digital_assets (id, type, name, game, stats_milestones, credentials, blueprint_url, price) ` +
    `VALUES ('${id}', '${type}', '${name.replace(/'/g, "''")}', '${game}', ${milestones}, ${creds}, ${bpUrl}, ${price})`);
  return getAsset(id);
}

// Mark asset as sold/delivered
function updateAssetStatus(id, status) {
  query(`UPDATE digital_assets SET status = '${status}', updated_at = datetime('now') WHERE id = '${id}'`);
  return getAsset(id);
}

/**
 * Deliveries CRUD
 */

// Create a delivery record
function createDelivery({ assetId, customerEmail, customerName, deliveryType }) {
  const id = generateUUID();
  const token = generateUUID();
  const name = customerName ? `'${customerName.replace(/'/g, "''")}'` : 'NULL';

  query(`INSERT INTO deliveries (id, asset_id, customer_email, customer_name, delivery_type, delivery_token) ` +
    `VALUES ('${id}', '${assetId}', '${customerEmail}', ${name}, '${deliveryType}', '${token}')`);

  return query(`SELECT * FROM deliveries WHERE id = '${id}'`)[0];
}

// Mark delivery as sent
function markDeliverySent(id) {
  query(`UPDATE deliveries SET delivery_status = 'sent', delivered_at = datetime('now') WHERE id = '${id}'`);
  return query(`SELECT * FROM deliveries WHERE id = '${id}'`)[0];
}

// Confirm delivery (customer accessed the asset)
function confirmDelivery(token) {
  query(`UPDATE deliveries SET delivery_status = 'confirmed' WHERE delivery_token = '${token}'`);
  return query(`SELECT * FROM deliveries WHERE delivery_token = '${token}'`)[0];
}

// Get delivery by token (for automated access)
function getDeliveryByToken(token) {
  const results = query(`SELECT d.*, a.name as asset_name, a.type as asset_type, a.credentials, a.blueprint_url, a.stats_milestones
    FROM deliveries d JOIN digital_assets a ON d.asset_id = a.id
    WHERE d.delivery_token = '${token}'`);
  return results[0] || null;
}

/**
 * Work Verification CRUD
 */

// Submit a screenshot for verification
function submitVerification({ taskId, workerId, screenshotPath, milestoneDescription }) {
  const id = generateUUID();
  const desc = milestoneDescription.replace(/'/g, "''");
  query(`INSERT INTO work_verification (id, task_id, worker_id, screenshot_path, milestone_description) ` +
    `VALUES ('${id}', '${taskId}', '${workerId}', '${screenshotPath}', '${desc}')`);
  return query(`SELECT * FROM work_verification WHERE id = '${id}'`)[0];
}

// Verify or reject a submission
function verifySubmission(id, status, verifiedBy) {
  query(`UPDATE work_verification SET status = '${status}', verified_by = '${verifiedBy}', verified_at = datetime('now') WHERE id = '${id}'`);
  return query(`SELECT * FROM work_verification WHERE id = '${id}'`)[0];
}

// Get pending verifications
function getPendingVerifications() {
  return query(`SELECT w.*, t.title as task_title FROM work_verification w LEFT JOIN tasks t ON w.task_id = t.id WHERE w.status = 'pending'`);
}

/**
 * Payments CRUD
 */

// Record a payment confirmation
function confirmPayment({ deliveryId, assetId, customerEmail, amount, stripePaymentId }) {
  const id = generateUUID();
  const delId = deliveryId ? `'${deliveryId}'` : 'NULL';
  const stripeId = stripePaymentId ? `'${stripePaymentId}'` : 'NULL';

  query(`INSERT INTO payments (id, delivery_id, asset_id, customer_email, amount, payment_status, stripe_payment_id, confirmed_at) ` +
    `VALUES ('${id}', ${delId}, '${assetId}', '${customerEmail}', ${amount}, 'confirmed', ${stripeId}, datetime('now'))`);
  return query(`SELECT * FROM payments WHERE id = '${id}'`)[0];
}

module.exports = {
  query,
  generateUUID,
  listAssets,
  getAsset,
  createAsset,
  updateAssetStatus,
  createDelivery,
  markDeliverySent,
  confirmDelivery,
  getDeliveryByToken,
  submitVerification,
  verifySubmission,
  getPendingVerifications,
  confirmPayment
};
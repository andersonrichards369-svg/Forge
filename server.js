/**
 * ForgeQuest Digital Factory - Worker Portal & Delivery API
 * 
 * This server provides:
 * 1. Worker Portal UI - shows account credentials & stat milestones for worker tasks
 * 2. Screenshot upload & verification for milestone completion
 * 3. Automated email delivery of blueprints & account details on payment
 * 4. REST API for digital asset management
 */
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./db');
const emailService = require('./email-service');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ============================================================
// Middleware
// ============================================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for portal assets
app.use(express.static(path.join(__dirname, 'portal', 'public')));

// Set EJS as the view engine for the worker portal
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'portal', 'views'));

// ============================================================
// File Upload Configuration (Screenshot Verification)
// ============================================================

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './portal/public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${db.generateUUID().slice(0, 8)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${ext}. Allowed: ${allowedTypes.join(', ')}`));
    }
  }
});

// ============================================================
// ROUTES: Worker Portal (EJS Views)
// ============================================================

/**
 * GET / - Storefront Landing Page (static HTML)
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'portal', 'public', 'index.html'));
});

// ============================================================
// ROUTES: Worker Portal (EJS Views)
// ============================================================

/**
 * GET /worker - Worker Portal Dashboard
 * Shows worker their assigned tasks with digital asset info (credentials, milestones)
 */
app.get('/worker', (req, res) => {
  try {
    // Fetch tasks assigned to workers
    const tasks = db.query("SELECT t.id, t.title, t.description, t.status FROM tasks t WHERE t.assigned_to IS NOT NULL AND t.assigned_to != '' ORDER BY t.status, t.id DESC LIMIT 50");
    
    // Fetch pending verifications
    const pendingV = db.getPendingVerifications();
    
    // Fetch available digital assets for reference
    const assets = db.listAssets();

    res.render('worker', {
      tasks: tasks || [],
      pendingVerifications: pendingV || [],
      assets: assets || [],
      baseUrl: `${req.protocol}://${req.get('host')}`
    });
  } catch (err) {
    console.error('Worker portal error:', err);
    res.status(500).send('Error loading worker portal');
  }
});

/**
 * GET /api/assets - List all digital assets (JSON)
 */
app.get('/api/assets', (req, res) => {
  try {
    const type = req.query.type || null;
    const assets = db.listAssets(type);
    res.json({ success: true, data: assets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/assets/:id - Get a single asset with delivery info
 */
app.get('/api/assets/:id', (req, res) => {
  try {
    const asset = db.getAsset(req.params.id);
    if (!asset || asset.length === 0) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    res.json({ success: true, data: asset[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/assets - Create a new digital asset
 * Body: { type, name, game, statsMilestones, credentials, blueprintUrl, price }
 */
app.post('/api/assets', (req, res) => {
  try {
    const { type, name, game, statsMilestones, credentials, blueprintUrl, price } = req.body;
    if (!type || !name || price === undefined) {
      return res.status(400).json({ success: false, error: 'type, name, and price are required' });
    }
    const asset = db.createAsset({
      type,
      name,
      game: game || 'RuneScape',
      statsMilestones,
      credentials,
      blueprintUrl,
      price: parseFloat(price)
    });
    res.status(201).json({ success: true, data: asset[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// ROUTES: Screenshot Verification
// ============================================================

/**
 * POST /api/verify/submit - Upload a screenshot for milestone verification
 * Fields: taskId, workerId, milestoneDescription, screenshot (file)
 */
app.post('/api/verify/submit', upload.single('screenshot'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Screenshot file is required' });
    }
    const { taskId, workerId, milestoneDescription } = req.body;
    if (!taskId || !workerId || !milestoneDescription) {
      return res.status(400).json({ success: false, error: 'taskId, workerId, and milestoneDescription are required' });
    }

    const screenshotPath = `/uploads/${req.file.filename}`;
    const verification = db.submitVerification({
      taskId,
      workerId,
      screenshotPath,
      milestoneDescription
    });

    res.status(201).json({
      success: true,
      data: verification,
      message: 'Verification screenshot submitted. Awaiting review.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/verify/:id/:action - Approve or reject a verification
 * Action: 'verify' or 'reject'
 */
app.post('/api/verify/:id/:action', (req, res) => {
  try {
    const { id, action } = req.params;
    if (!['verify', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action must be "verify" or "reject"' });
    }

    const status = action === 'verify' ? 'verified' : 'rejected';
    const verifiedBy = req.body.verifiedBy || 'system';
    
    const result = db.verifySubmission(id, status, verifiedBy);

    // If verified, update the linked task
    if (status === 'verified' && result) {
      const taskId = result.task_id;
      if (taskId) {
        db.query(`UPDATE tasks SET status = 'done', result = 'Milestone verified via screenshot' WHERE id = '${taskId}'`);
      }
    }

    res.json({ success: true, data: result, message: `Verification ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/verify/pending - Get all pending verifications
 */
app.get('/api/verify/pending', (req, res) => {
  try {
    const pending = db.getPendingVerifications();
    res.json({ success: true, data: pending });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// ROUTES: Digital Delivery Automation
// ============================================================

/**
 * POST /api/deliver - Trigger automated delivery after payment confirmation
 * Body: { assetId, customerEmail, customerName, paymentAmount, stripePaymentId }
 * 
 * This is the core automated delivery endpoint.
 * When a payment is confirmed, this endpoint:
 * 1. Creates a delivery record with a unique token
 * 2. For blueprints: sends an email with a download link (token-protected)
 * 3. For accounts: sends an email with credentials
 */
app.post('/api/deliver', async (req, res) => {
  try {
    const { assetId, customerEmail, customerName, paymentAmount, stripePaymentId } = req.body;
    if (!assetId || !customerEmail) {
      return res.status(400).json({ success: false, error: 'assetId and customerEmail are required' });
    }

    // Fetch the asset
    const assetResult = db.getAsset(assetId);
    if (!assetResult || assetResult.length === 0) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    const asset = assetResult[0];

    // Determine delivery type
    const deliveryType = asset.type === 'blueprint' ? 'email_link' : 'credentials';

    // Create delivery record with unique token
    const delivery = db.createDelivery({
      assetId,
      customerEmail,
      customerName: customerName || null,
      deliveryType
    });

    // Record payment
    db.confirmPayment({
      deliveryId: delivery.id,
      assetId,
      customerEmail,
      amount: parseFloat(paymentAmount || asset.price),
      stripePaymentId
    });

    // Build delivery URL (for blueprints, the token acts as access key)
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const accessUrl = `${baseUrl}/deliver/${delivery.delivery_token}`;

    let emailResult;
    if (asset.type === 'blueprint') {
      // Send blueprint download link via email
      emailResult = await emailService.sendBlueprintDelivery(
        customerEmail,
        customerName,
        asset.name,
        accessUrl
      );
    } else {
      // Send account credentials via email
      emailResult = await emailService.sendAccountDelivery(
        customerEmail,
        customerName,
        asset.name,
        asset.credentials || 'Credentials not set',
        asset.stats_milestones || ''
      );
    }

    // Mark delivery as sent
    db.markDeliverySent(delivery.id);
    
    // Mark asset as sold
    db.updateAssetStatus(assetId, 'sold');

    res.status(200).json({
      success: true,
      data: {
        deliveryId: delivery.id,
        deliveryToken: delivery.delivery_token,
        emailSent: !!emailResult.messageId
      },
      message: `${asset.type === 'blueprint' ? 'Blueprint link' : 'Account credentials'} delivered to ${customerEmail}`
    });
  } catch (err) {
    console.error('Delivery error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /deliver/:token - Token-protected access to delivered assets
 * This is the link the customer clicks in their email
 */
app.get('/deliver/:token', (req, res) => {
  try {
    const delivery = db.getDeliveryByToken(req.params.token);
    if (!delivery) {
      return res.status(404).send(`
        <html><body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: #ff6b35;">ForgeQuest</h1>
          <h2>Invalid or Expired Link</h2>
          <p>This delivery link is invalid or has expired. Please contact support.</p>
        </body></html>
      `);
    }

    // Confirm the delivery
    db.confirmDelivery(req.params.token);

    if (delivery.asset_type === 'blueprint') {
      // Serve the blueprint download (in production, redirect to secure URL)
      if (delivery.blueprint_url) {
        return res.redirect(delivery.blueprint_url);
      }
      return res.json({ success: true, message: 'Blueprint accessed', data: delivery });
    } else {
      // Display account credentials (one-time view)
      res.send(`
        <html>
        <head><title>ForgeQuest - Account Delivery</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .card { background: #f5f5f5; padding: 20px; border-radius: 8px; }
          .creds { background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 4px; 
                   white-space: pre-wrap; word-break: break-all; font-family: monospace; }
          .warning { background: #fff3cd; padding: 12px; border-radius: 6px; color: #856404; margin: 15px 0; }
          h1 { color: #ff6b35; }
        </style>
        </head>
        <body>
          <h1>ForgeQuest</h1>
          <h2>Your Account: ${delivery.asset_name || 'Gaming Account'}</h2>
          <div class="card">
            <h3>Account Credentials</h3>
            <div class="creds">${delivery.credentials || 'No credentials stored'}</div>
            ${delivery.stats_milestones ? `<h3>Stats & Milestones</h3><p>${delivery.stats_milestones}</p>` : ''}
          </div>
          <div class="warning">
            <strong>⚠️ Important:</strong> Change the password immediately. 
            These credentials have been delivered and this link is now deactivated.
          </div>
          <p style="color: #999; font-size: 12px;">ForgeQuest Digital Factory</p>
        </body>
        </html>
      `);
    }
  } catch (err) {
    res.status(500).send('Error processing delivery');
  }
});

/**
 * GET /api/deliveries - List all deliveries
 */
app.get('/api/deliveries', (req, res) => {
  try {
    const deliveries = db.query(`
      SELECT d.*, a.name as asset_name, a.type as asset_type 
      FROM deliveries d JOIN digital_assets a ON d.asset_id = a.id 
      ORDER BY d.created_at DESC LIMIT 100
    `);
    res.json({ success: true, data: deliveries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// ROUTES: Health & Status
// ============================================================

/**
 * GET /api/health - Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    service: 'ForgeQuest Digital Factory',
    tables: ['digital_assets', 'deliveries', 'work_verification', 'payments']
  });
});

/**
 * GET /api/stats - Dashboard statistics
 */
app.get('/api/stats', (req, res) => {
  try {
    const assetCounts = db.query(`
      SELECT type, status, COUNT(*) as count FROM digital_assets GROUP BY type, status
    `);
    const deliveryCounts = db.query(`
      SELECT delivery_status, COUNT(*) as count FROM deliveries GROUP BY delivery_status
    `);
    const pendingVerifications = db.getPendingVerifications().length;

    res.json({
      success: true,
      data: {
        assets: assetCounts || [],
        deliveries: deliveryCounts || [],
        pendingVerifications
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// Error Handling Middleware
// ============================================================

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ============================================================
// Start Server
// ============================================================

app.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║              ForgeQuest Digital Factory               ║
║         Worker Portal & Delivery Automation            ║
╠══════════════════════════════════════════════════════╣
║  Server:    http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}  ║
║  Portal:    http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/    ║
║  Health:    http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/health  ║
║  API:       http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/  ║
╚══════════════════════════════════════════════════════╝
  `);
});
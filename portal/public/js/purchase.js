/**
 * ForgeQuest Storefront — Purchase Overlay
 * Handles "Buy Now" button clicks with an inline purchase form.
 * POSTs to /api/purchase to trigger automated delivery.
 */
(function() {
  'use strict';

  // Create purchase modal overlay
  function createPurchaseModal() {
    const overlay = document.createElement('div');
    overlay.id = 'purchase-overlay';
    overlay.style.cssText = `
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0; top: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.8);
      backdrop-filter: blur(8px);
      align-items: center;
      justify-content: center;
    `;

    overlay.innerHTML = `
      <div style="
        background: #16181d;
        border: 1px solid #1e293b;
        border-radius: 16px;
        padding: 32px;
        max-width: 480px;
        width: 90%;
        position: relative;
        font-family: 'Inter', sans-serif;
        color: #f1f5f9;
      ">
        <button id="purchase-close" style="
          position: absolute; right: 16px; top: 12px;
          background: none; border: none;
          color: #64748b; font-size: 24px;
          cursor: pointer;
        ">&times;</button>
        
        <h2 style="
          font-family: 'Orbitron', sans-serif;
          color: #00d4ff;
          margin: 0 0 8px;
          font-size: 22px;
        ">Secure Purchase</h2>
        <p style="color: #94a3b8; margin: 0 0 20px; font-size: 14px;" id="purchase-asset-name">Complete your purchase</p>
        
        <form id="purchase-form">
          <input type="hidden" name="assetId" id="purchase-asset-id">
          <input type="hidden" name="assetPrice" id="purchase-asset-price">
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #94a3b8;">Email Address</label>
            <input type="email" name="customerEmail" id="purchase-email" required
              placeholder="your@email.com"
              style="
                width: 100%; padding: 12px 14px;
                background: #0a0b0e; border: 1px solid #1e293b;
                border-radius: 8px; color: #f1f5f9;
                font-size: 14px; font-family: 'Inter', sans-serif;
              ">
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #94a3b8;">Name (optional)</label>
            <input type="text" name="customerName" id="purchase-name"
              placeholder="Your name"
              style="
                width: 100%; padding: 12px 14px;
                background: #0a0b0e; border: 1px solid #1e293b;
                border-radius: 8px; color: #f1f5f9;
                font-size: 14px; font-family: 'Inter', sans-serif;
              ">
          </div>
          
          <div style="
            background: #111316; border-radius: 8px;
            padding: 16px; margin-bottom: 20px;
            border: 1px solid #1e293b;
          ">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #94a3b8;">Price</span>
              <span id="purchase-price-display" style="font-weight: 700; font-size: 18px; color: #00d4ff;">$0.00</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span style="color: #64748b;">Delivery</span>
              <span style="color: #10b981;">Instant &bull; Free</span>
            </div>
          </div>
          
          <button type="submit" id="purchase-submit" style="
            width: 100%; padding: 14px;
            background: linear-gradient(135deg, #00d4ff, #8b5cf6);
            border: none; border-radius: 10px;
            color: white; font-size: 16px;
            font-weight: 700; font-family: 'Inter', sans-serif;
            cursor: pointer; transition: opacity 0.2s;
          " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
            🔒 Complete Purchase
          </button>
        </form>
        
        <div id="purchase-status" style="margin-top: 16px; text-align: center; font-size: 14px; display: none;"></div>
        
        <p style="color: #64748b; font-size: 11px; text-align: center; margin: 16px 0 0;">
          🔒 Secured via automated delivery. Credentials sent to your email.
        </p>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  // Show purchase modal — resolves real asset ID from API
  async function showPurchaseModal(assetId, assetName, assetPrice) {
    const overlay = document.getElementById('purchase-overlay') || createPurchaseModal();
    
    // Try to resolve the real asset ID from the database
    let realAssetId = assetId;
    try {
      const resp = await fetch('/api/assets');
      const result = await resp.json();
      if (result.success && result.data) {
        // Match by name or price to find the real asset
        const match = result.data.find(a => 
          (assetName && a.name && a.name.toLowerCase().includes(assetName.toLowerCase().split('—')[0].trim())) ||
          (assetPrice && parseFloat(a.price) === parseFloat(assetPrice))
        );
        if (match) realAssetId = match.id;
      }
    } catch (e) {
      // Fall back to demo ID
    }
    
    document.getElementById('purchase-asset-id').value = realAssetId;
    document.getElementById('purchase-asset-name').textContent = assetName || 'Premium Asset';
    document.getElementById('purchase-price-display').textContent = `$${parseFloat(assetPrice || 0).toFixed(2)}`;
    document.getElementById('purchase-asset-price').value = assetPrice || '0';
    document.getElementById('purchase-status').style.display = 'none';
    
    overlay.style.display = 'flex';
  }

  // Close purchase modal
  function closePurchaseModal() {
    const overlay = document.getElementById('purchase-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    // Create modal
    createPurchaseModal();

    // Wire up Buy Now buttons
    document.querySelectorAll('[data-purchase]').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        showPurchaseModal(
          this.dataset.assetId,
          this.dataset.assetName,
          this.dataset.assetPrice
        );
      });
    });

    // Close button
    document.getElementById('purchase-close').addEventListener('click', closePurchaseModal);
    
    // Close on overlay click
    document.getElementById('purchase-overlay').addEventListener('click', function(e) {
      if (e.target === this) closePurchaseModal();
    });

    // Handle form submission
    document.getElementById('purchase-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const submitBtn = document.getElementById('purchase-submit');
      const statusEl = document.getElementById('purchase-status');
      
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Processing...';
      statusEl.style.display = 'block';
      statusEl.innerHTML = '<span style="color: #f59e0b;">Processing your purchase...</span>';
      
      const formData = {
        assetId: document.getElementById('purchase-asset-id').value,
        customerEmail: document.getElementById('purchase-email').value,
        customerName: document.getElementById('purchase-name').value || null,
        paymentAmount: document.getElementById('purchase-asset-price').value,
        stripePaymentId: 'demo-' + Date.now()
      };

      try {
        const response = await fetch('/api/deliver', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
          statusEl.innerHTML = `
            <div style="color: #10b981; font-weight: 600; margin-bottom: 8px;">
              ✅ Purchase Successful!
            </div>
            <div style="color: #94a3b8; font-size: 13px;">
              ${result.message || 'Delivery details sent to your email.'}
            </div>
          `;
          submitBtn.textContent = '✅ Delivered!';
          
          // Close after 4 seconds
          setTimeout(closePurchaseModal, 4000);
        } else {
          statusEl.innerHTML = `
            <div style="color: #ef4444; font-weight: 600;">
              ❌ Error: ${result.error || 'Purchase failed'}
            </div>
          `;
          submitBtn.disabled = false;
          submitBtn.textContent = '🔒 Complete Purchase';
        }
      } catch (err) {
        statusEl.innerHTML = `
          <div style="color: #ef4444; font-weight: 600;">
            ❌ Network error: ${err.message}
          </div>
        `;
        submitBtn.disabled = false;
        submitBtn.textContent = '🔒 Complete Purchase';
      }
    });
  });
})();
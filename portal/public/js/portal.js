/**
 * ForgeQuest Worker Portal — Frontend Logic
 * Handles screenshot upload, verification actions, and delivery log loading.
 */

// ============================================================
// Navigation
// ============================================================

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.getAttribute('href').slice(1);
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    
    const section = document.getElementById(target);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ============================================================
// Screenshot Upload Modal
// ============================================================

function showVerifyModal(taskId, taskTitle) {
  document.getElementById('verifyTaskId').value = taskId;
  document.getElementById('modalTaskInfo').textContent = `Task: ${taskTitle || taskId}`;
  document.getElementById('verifyModal').style.display = 'block';
  document.getElementById('uploadStatus').className = 'upload-status';
  document.getElementById('uploadStatus').textContent = '';
  document.getElementById('verifyForm').reset();
  document.getElementById('filePreview').innerHTML = '';
}

function closeVerifyModal() {
  document.getElementById('verifyModal').style.display = 'none';
}

// Close modal on click outside
window.addEventListener('click', (e) => {
  const modal = document.getElementById('verifyModal');
  if (e.target === modal) closeVerifyModal();
});

// Preview screenshot before upload
document.getElementById('screenshotInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById('filePreview');
  if (file) {
    if (file.size > 10 * 1024 * 1024) {
      preview.innerHTML = '<p style="color: var(--danger);">File too large (max 10MB)</p>';
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.innerHTML = `<img src="${ev.target.result}" alt="Screenshot preview">`;
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = '';
  }
});

// Submit verification form
document.getElementById('verifyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const statusEl = document.getElementById('uploadStatus');
  statusEl.className = 'upload-status';
  statusEl.textContent = 'Uploading...';

  const formData = new FormData(e.target);
  
  try {
    const response = await fetch('/api/verify/submit', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      statusEl.className = 'upload-status success';
      statusEl.textContent = '✅ Screenshot submitted! Awaiting verification review.';
      setTimeout(() => closeVerifyModal(), 2000);
    } else {
      statusEl.className = 'upload-status error';
      statusEl.textContent = `❌ Error: ${result.error}`;
    }
  } catch (err) {
    statusEl.className = 'upload-status error';
    statusEl.textContent = `❌ Upload failed: ${err.message}`;
  }
});

// ============================================================
// Verification Actions (Approve/Reject)
// ============================================================

async function verifyAction(verificationId, action) {
  if (action === 'reject' && !confirm('Are you sure you want to reject this verification?')) {
    return;
  }

  try {
    const response = await fetch(`/api/verify/${verificationId}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verifiedBy: 'portal-admin' })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Reload the page to reflect changes
      window.location.reload();
    } else {
      alert(`Error: ${result.error}`);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// ============================================================
// Load Deliveries Log
// ============================================================

async function loadDeliveries() {
  const container = document.getElementById('deliveries-content');
  
  try {
    const response = await fetch('/api/deliveries');
    const result = await response.json();
    
    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No deliveries recorded yet. They will appear here when customers purchase assets.</p></div>';
      return;
    }
    
    let html = `<div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Type</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Delivered At</th>
          </tr>
        </thead>
        <tbody>`;
    
    result.data.forEach(d => {
      html += `<tr>
        <td><strong>${d.asset_name || 'Unknown'}</strong></td>
        <td><span class="status-badge status-${d.asset_type}">${d.asset_type}</span></td>
        <td>${d.customer_email}</td>
        <td><span class="status-badge status-${d.delivery_status}">${d.delivery_status}</span></td>
        <td>${d.delivered_at ? new Date(d.delivered_at).toLocaleString() : '-'}</td>
      </tr>`;
    });
    
    html += `</tbody></table></div>`;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Error loading deliveries: ${err.message}</p></div>`;
  }
}

// ============================================================
// Initialize
// ============================================================

// Load deliveries on page load
document.addEventListener('DOMContentLoaded', () => {
  loadDeliveries();
});
-- ForgeQuest Digital Factory Schema
-- This file documents the expected team-db tables for digital asset operations.
-- Run via team-db CLI: team-db "<statement>"

-- Task statuses: backlog -> in-progress -> review -> done

-- 1. Create the digital_assets table for blueprint and account inventory
-- team-db "CREATE TABLE IF NOT EXISTS digital_assets (id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('blueprint', 'account')), name TEXT NOT NULL, game TEXT NOT NULL DEFAULT 'RuneScape', stats_milestones TEXT, credentials TEXT, blueprint_url TEXT, price REAL NOT NULL DEFAULT 0.00, status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'sold', 'delivered')), created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))"

-- 2. Create the deliveries table for tracking digital good hand-offs
-- team-db "CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, asset_id TEXT NOT NULL, customer_email TEXT NOT NULL, customer_name TEXT, delivery_type TEXT NOT NULL CHECK(delivery_type IN ('email_link', 'credentials')), delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK(delivery_status IN ('pending', 'sent', 'confirmed', 'failed')), delivery_token TEXT UNIQUE, delivered_at TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (asset_id) REFERENCES digital_assets(id))"

-- 3. Create the work_verification table for screenshot-based milestone verification
-- team-db "CREATE TABLE IF NOT EXISTS work_verification (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, worker_id TEXT NOT NULL, screenshot_path TEXT NOT NULL, milestone_description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'rejected')), verified_by TEXT, verified_at TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (task_id) REFERENCES tasks(id))"

-- 4. Create the payments table for payment confirmation tracking
-- team-db "CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, delivery_id TEXT, asset_id TEXT NOT NULL, customer_email TEXT NOT NULL, amount REAL NOT NULL, currency TEXT DEFAULT 'USD', payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'confirmed', 'refunded')), stripe_payment_id TEXT, confirmed_at TEXT, created_at TEXT DEFAULT (datetime('now')))"

-- Schema summary:
-- digital_assets: Inventory of accounts/blueprints with UUIDs, stats, credentials
-- deliveries: Tracks email-sent links/credentials with token verification
-- work_verification: Screenshot uploads linked to tasks for milestone proof
-- payments: Payment confirmations triggering automated delivery
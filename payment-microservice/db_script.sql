CREATE DATABASE IF NOT EXISTS payment_microservice_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE payment_microservice_db;
-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL UNIQUE,
    customer_id VARCHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method ENUM(
        'credit_card',
        'debit_card',
        'paypal',
        'apple_pay',
        'google_pay'
    ) NOT NULL,
    payment_status ENUM(
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'refunded'
    ) DEFAULT 'pending',
    gateway_transaction_id VARCHAR(100),
    gateway_reference VARCHAR(100),
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),
    processing_fee DECIMAL(8, 2) DEFAULT 0.00,
    refund_amount DECIMAL(10, 2) DEFAULT 0.00,
    failure_reason TEXT,
    gateway_response JSON,
    metadata JSON,
    processed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order (order_id),
    INDEX idx_customer (customer_id),
    INDEX idx_status (payment_status),
    INDEX idx_gateway_transaction (gateway_transaction_id),
    INDEX idx_created_at (created_at)
);
-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL,
    type ENUM(
        'credit_card',
        'debit_card',
        'paypal',
        'apple_pay',
        'google_pay'
    ) NOT NULL,
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),
    card_exp_month INT,
    card_exp_year INT,
    card_holder_name VARCHAR(100),
    billing_address JSON,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    gateway_token_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer (customer_id),
    INDEX idx_default (customer_id, is_default)
);
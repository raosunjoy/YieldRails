-- Add compliance-related tables and enhancements

-- Compliance Alerts table
CREATE TABLE compliance_alerts (
    id TEXT PRIMARY KEY,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'MEDIUM',
    title TEXT NOT NULL,
    description TEXT,
    data JSONB,
    status TEXT NOT NULL DEFAULT 'OPEN',
    assigned_to TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Address Risk Assessments table
CREATE TABLE address_risk_assessments (
    id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    risk_level TEXT NOT NULL,
    sanctions BOOLEAN NOT NULL DEFAULT FALSE,
    pep BOOLEAN NOT NULL DEFAULT FALSE,
    aml_flags JSONB DEFAULT '[]',
    source TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Transaction Risk Assessments table
CREATE TABLE transaction_risk_assessments (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount DECIMAL(18,6) NOT NULL,
    currency TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    risk_level TEXT NOT NULL,
    flags JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Compliance Reports table
CREATE TABLE compliance_reports (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL UNIQUE,
    report_type TEXT NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    summary JSONB NOT NULL,
    kyc_stats JSONB,
    aml_stats JSONB,
    sanctions_stats JSONB,
    generated_by TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    user_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Sanctions List Entries table (for caching)
CREATE TABLE sanctions_list_entries (
    id TEXT PRIMARY KEY,
    list_name TEXT NOT NULL,
    entry_type TEXT NOT NULL, -- 'INDIVIDUAL', 'ENTITY', 'ADDRESS'
    name TEXT,
    address TEXT,
    aliases JSONB DEFAULT '[]',
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- KYC Document Verification History
CREATE TABLE kyc_verification_history (
    id TEXT PRIMARY KEY,
    kyc_document_id TEXT NOT NULL,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    reason TEXT,
    reviewed_by TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (kyc_document_id) REFERENCES kyc_documents(id) ON DELETE CASCADE
);

-- Merchant Compliance Checks
CREATE TABLE merchant_compliance_checks (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL,
    check_type TEXT NOT NULL,
    status TEXT NOT NULL,
    issues JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    checked_by TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_compliance_alerts_type ON compliance_alerts(alert_type);
CREATE INDEX idx_compliance_alerts_status ON compliance_alerts(status);
CREATE INDEX idx_compliance_alerts_created_at ON compliance_alerts(created_at);

CREATE INDEX idx_address_risk_address ON address_risk_assessments(address);
CREATE INDEX idx_address_risk_level ON address_risk_assessments(risk_level);
CREATE INDEX idx_address_risk_expires_at ON address_risk_assessments(expires_at);

CREATE INDEX idx_transaction_risk_transaction_id ON transaction_risk_assessments(transaction_id);
CREATE INDEX idx_transaction_risk_from_address ON transaction_risk_assessments(from_address);
CREATE INDEX idx_transaction_risk_to_address ON transaction_risk_assessments(to_address);
CREATE INDEX idx_transaction_risk_level ON transaction_risk_assessments(risk_level);
CREATE INDEX idx_transaction_risk_created_at ON transaction_risk_assessments(created_at);

CREATE INDEX idx_compliance_reports_type ON compliance_reports(report_type);
CREATE INDEX idx_compliance_reports_created_at ON compliance_reports(created_at);

CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX idx_sanctions_list_name ON sanctions_list_entries(list_name);
CREATE INDEX idx_sanctions_list_type ON sanctions_list_entries(entry_type);
CREATE INDEX idx_sanctions_list_name_text ON sanctions_list_entries(name);
CREATE INDEX idx_sanctions_list_address ON sanctions_list_entries(address);

CREATE INDEX idx_kyc_verification_history_document_id ON kyc_verification_history(kyc_document_id);
CREATE INDEX idx_kyc_verification_history_created_at ON kyc_verification_history(created_at);

CREATE INDEX idx_merchant_compliance_merchant_id ON merchant_compliance_checks(merchant_id);
CREATE INDEX idx_merchant_compliance_type ON merchant_compliance_checks(check_type);
CREATE INDEX idx_merchant_compliance_status ON merchant_compliance_checks(status);
CREATE INDEX idx_merchant_compliance_created_at ON merchant_compliance_checks(created_at);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_compliance_alerts_updated_at BEFORE UPDATE ON compliance_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sanctions_list_entries_updated_at BEFORE UPDATE ON sanctions_list_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
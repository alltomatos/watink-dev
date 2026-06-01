import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSource } from './tenant-guard.mjs';

test('flags tenant-owned update without tenantId filter', () => {
  const findings = analyzeSource('controller.go', `
    tx.Model(&models.Ticket{}).Where("\"whatsappId\" = ?", id).Update("whatsappId", nil)
  `);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'HIGH');
});

test('does not flag tenant-owned update with tenantId filter', () => {
  const findings = analyzeSource('controller.go', `
    tx.Model(&models.Ticket{}).Where("\"whatsappId\" = ? AND \"tenantId\" = ?", id, tenantID).Update("whatsappId", nil)
  `);

  assert.equal(findings.length, 0);
});

test('does not join unrelated database calls across function boundaries', () => {
  const findings = analyzeSource('controller.go', `
    func CreateContact() {
      contact.TenantID = tenantID
      database.DB.Create(&contact)
    }

    func UpdateContact() {
      if err := getScopedDB(c, "Contacts").Where("id = ?", id).First(&contact).Error; err != nil {
        return
      }
    }
  `);

  assert.equal(findings.length, 0);
});

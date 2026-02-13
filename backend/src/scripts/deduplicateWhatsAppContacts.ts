import sequelize from "../database";
import Contact from "../models/Contact";
import MergeContactsService from "../services/ContactServices/MergeContactsService";
import { buildCanonicalContactIdentity, chooseCanonicalContact } from "../services/ContactServices/WhatsAppContactIdentityService";

const run = async () => {
  const tenantArg = process.argv[2];

  const where: any = {};
  if (tenantArg) where.tenantId = tenantArg;

  const contacts = await Contact.findAll({ where, order: [["tenantId", "ASC"], ["id", "ASC"]] });

  const tenantGroups = new Map<string, Contact[]>();
  for (const c of contacts) {
    const key = String(c.tenantId);
    if (!tenantGroups.has(key)) tenantGroups.set(key, []);
    tenantGroups.get(key)!.push(c);
  }

  let merges = 0;

  for (const [tenantId, list] of tenantGroups.entries()) {
    const byIdentity = new Map<string, Contact[]>();

    for (const contact of list) {
      const identity = buildCanonicalContactIdentity({
        lid: contact.lid,
        number: contact.number,
        jid: contact.lid || contact.number
      });

      const key = identity.normalizedLid || identity.normalizedE164;
      if (!key) continue;

      if (!byIdentity.has(key)) byIdentity.set(key, []);
      byIdentity.get(key)!.push(contact);
    }

    for (const [, dupes] of byIdentity.entries()) {
      if (dupes.length <= 1) continue;
      const canonical = chooseCanonicalContact(dupes);
      if (!canonical) continue;

      for (const duplicate of dupes) {
        if (duplicate.id === canonical.id) continue;
        await MergeContactsService({
          tenantId,
          contactIdOrigin: duplicate.id,
          contactIdTarget: canonical.id
        });
        merges += 1;
      }
    }
  }

  console.log(`[deduplicateWhatsAppContacts] Done. merges=${merges}`);
};

run()
  .then(async () => sequelize.close())
  .catch(async (err) => {
    console.error("[deduplicateWhatsAppContacts] failed", err);
    await sequelize.close();
    process.exit(1);
  });

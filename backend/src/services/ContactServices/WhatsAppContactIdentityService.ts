import { Op, Transaction, WhereOptions } from "sequelize";
import Contact from "../../models/Contact";

export interface CanonicalIdentity {
  normalizedLid?: string;
  normalizedJid?: string;
  normalizedE164?: string;
  numberCandidates: string[];
}

interface ResolveParams {
  tenantId: string | number;
  lid?: string | null;
  number?: string | null;
  jid?: string | null;
  transaction?: Transaction;
}

const normalizeJid = (raw?: string | null): string | undefined => {
  if (!raw) return undefined;
  const cleaned = raw.toLowerCase().trim().split(":")[0];
  if (!cleaned.includes("@")) {
    const digits = cleaned.replace(/\D/g, "");
    return digits ? `${digits}@s.whatsapp.net` : undefined;
  }

  if (cleaned.endsWith("@c.us")) {
    return cleaned.replace(/@c\.us$/, "@s.whatsapp.net");
  }

  return cleaned;
};

const normalizeLid = (raw?: string | null): string | undefined => {
  if (!raw) return undefined;
  const jid = normalizeJid(raw);
  if (jid?.endsWith("@lid")) return jid;
  return raw.toLowerCase().trim().endsWith("@lid") ? raw.toLowerCase().trim() : undefined;
};

const normalizeE164 = (raw?: string | null): string | undefined => {
  if (!raw) return undefined;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;

  if (digits.startsWith("00")) digits = digits.slice(2);

  // Brasil como fallback principal do produto (quando sem DDI explícito)
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }

  if (digits.length < 8 || digits.length > 15) return undefined;
  return digits;
};

const extractNumberFromJid = (jid?: string): string | undefined => {
  if (!jid) return undefined;
  if (jid.endsWith("@lid") || jid.endsWith("@g.us")) return undefined;
  return jid.split("@")[0]?.replace(/\D/g, "") || undefined;
};

export const buildCanonicalContactIdentity = ({ lid, number, jid }: { lid?: string | null; number?: string | null; jid?: string | null; }): CanonicalIdentity => {
  const normalizedJid = normalizeJid(jid || number);
  const normalizedLid = normalizeLid(lid || normalizedJid || number);

  const fromNumber = normalizeE164(number);
  const fromJidNumber = normalizeE164(extractNumberFromJid(normalizedJid));
  const normalizedE164 = fromNumber || fromJidNumber;

  const plainNumber = (number || "").replace(/\D/g, "") || undefined;
  const jidDigits = extractNumberFromJid(normalizedJid);

  const numberCandidates = Array.from(
    new Set([plainNumber, normalizedE164, jidDigits].filter(Boolean) as string[])
  );

  return {
    normalizedLid,
    normalizedJid,
    normalizedE164,
    numberCandidates
  };
};

export const resolveContactsByIdentity = async ({
  tenantId,
  lid,
  number,
  jid,
  transaction
}: ResolveParams): Promise<Contact[]> => {
  const identity = buildCanonicalContactIdentity({ lid, number, jid });

  const orFilters: WhereOptions[] = [];
  if (identity.normalizedLid) {
    orFilters.push({ lid: identity.normalizedLid });
  }

  if (identity.numberCandidates.length > 0) {
    orFilters.push({ number: { [Op.in]: identity.numberCandidates } });
  }

  if (orFilters.length === 0) return [];

  return Contact.findAll({
    where: {
      tenantId,
      [Op.or]: orFilters
    },
    transaction,
    order: [["updatedAt", "DESC"], ["id", "ASC"]]
  });
};

export const chooseCanonicalContact = (contacts: Contact[]): Contact | null => {
  if (!contacts.length) return null;

  return [...contacts].sort((a, b) => {
    const aScore = (a.lid ? 100 : 0) + (a.profilePicUrl ? 20 : 0) + (a.name && a.name !== a.number ? 10 : 0);
    const bScore = (b.lid ? 100 : 0) + (b.profilePicUrl ? 20 : 0) + (b.name && b.name !== b.number ? 10 : 0);
    if (bScore !== aScore) return bScore - aScore;
    return a.id - b.id;
  })[0];
};

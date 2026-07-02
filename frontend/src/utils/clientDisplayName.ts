interface ContactLike {
  name?: string;
  client?: { socialName?: string | null } | null;
}

/**
 * Resolve o nome de exibição de um Contact, aplicando a regra de Nome Social:
 * quando `Contact.client.socialName` está preenchido, ele substitui o nome
 * civil (`Contact.name`) em toda superfície de exibição.
 *
 * Nunca exibir os dois nomes lado a lado (ver docs/agents/clients.md).
 */
export function getContactDisplayName(contact?: ContactLike | null): string {
  if (!contact) return "";
  const socialName = contact.client?.socialName?.trim();
  return socialName || contact.name || "";
}

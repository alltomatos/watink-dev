"""Cliente de chat LLM via omniroute (gateway OpenAI-compatível do tenant).

`stream:false` é obrigatório — o gateway streama por padrão (`data: ...`), o que o
decoder JSON single-shot não parseia. Modelo de chat = setting `aiModel` do tenant.
"""

import httpx

from .settings import get_ai_settings


class LLMError(Exception):
    pass


async def chat(tenant_id: str, messages: list[dict]) -> str:
    ai = await get_ai_settings(tenant_id)
    if not ai["base_url"] or not ai["chat_model"] or not ai["api_key"]:
        raise LLMError(
            "config de chat ausente (aiCustomBaseURL/aiModel/aiApiKey) para o tenant"
        )

    url = ai["base_url"].rstrip("/") + "/chat/completions"
    headers = {
        "Authorization": f"Bearer {ai['api_key']}",
        "Content-Type": "application/json",
    }
    payload = {"model": ai["chat_model"], "messages": messages, "stream": False}

    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(url, json=payload, headers=headers)

    if resp.status_code != 200:
        raise LLMError(f"omniroute chat {resp.status_code}: {resp.text[:200]}")

    data = resp.json()
    choices = data.get("choices") or []
    if not choices:
        raise LLMError("resposta de chat vazia")
    return (choices[0].get("message") or {}).get("content", "") or ""

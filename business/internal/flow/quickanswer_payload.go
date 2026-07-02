package flow

import (
	"encoding/json"
	"fmt"
)

// BuildNativeFlowButtons converte os botões do conteúdo da QuickAnswer
// ({id,label,type,url,phoneNumber,copyCode}) no formato NativeFlow {name, params}
// que o engine envia. Apenas quick_reply/cta_url/cta_call/cta_copy renderizam em
// conta pessoal. Reutilizado por interactive_buttons e pelos cards do carousel.
//
// Compartilhado entre QuickAnswerController.Send (envio manual) e o
// quickAnswerExecutor do FlowBuilder (envio automático) — extraído para não
// duplicar a lógica de montagem de payload entre os dois caminhos.
func BuildNativeFlowButtons(raw interface{}) []map[string]interface{} {
	buttons := make([]map[string]interface{}, 0)
	rawBtns, ok := raw.([]interface{})
	if !ok {
		return buttons
	}
	for i, rb := range rawBtns {
		bm, ok := rb.(map[string]interface{})
		if !ok {
			continue
		}
		id, _ := bm["id"].(string)
		label, _ := bm["label"].(string)
		if id == "" {
			id = fmt.Sprintf("btn_%d", i)
		}
		btnType, _ := bm["type"].(string)
		var name string
		var params map[string]string
		switch btnType {
		case "url":
			url, _ := bm["url"].(string)
			name = "cta_url"
			params = map[string]string{"display_text": label, "url": url, "merchant_url": url}
		case "call":
			phone, _ := bm["phoneNumber"].(string)
			name = "cta_call"
			params = map[string]string{"display_text": label, "phone_number": phone}
		case "copy":
			code, _ := bm["copyCode"].(string)
			if code == "" {
				code = id
			}
			name = "cta_copy"
			params = map[string]string{"display_text": label, "copy_code": code}
		default: // "quickreply" / "quick_reply" / vazio
			name = "quick_reply"
			params = map[string]string{"display_text": label, "id": id}
		}
		paramsJSON, _ := json.Marshal(params)
		buttons = append(buttons, map[string]interface{}{
			"name":   name,
			"params": string(paramsJSON),
		})
	}
	return buttons
}

// BuildQuickAnswerCommand monta o commandType + payload AMQP para um envio de
// QuickAnswer, a partir do tipo (text/interactive_buttons/list/media/poll/
// carousel/pix), da mensagem já interpolada e do content decodificado.
//
// Compartilhado entre o envio manual (QuickAnswerController.Send) e o
// quickAnswerExecutor do FlowBuilder — extraído para que os dois caminhos
// produzam exatamente o mesmo payload por tipo, sem duplicar o switch.
func BuildQuickAnswerCommand(qaType, message string, contentMap map[string]interface{}, sessionID int, msgID, to string) (string, map[string]interface{}) {
	commandType := "message.send.text"
	switch qaType {
	case "interactive_buttons":
		commandType = "message.send.interactive"
	case "list":
		// Lista nativa (ListMessage legado) retorna 405 em conta pessoal. Usamos
		// NativeFlow single_select pelo mesmo caminho dos botões (com nó <biz>).
		commandType = "message.send.interactive"
	case "media":
		commandType = "message.send.media"
	case "poll":
		commandType = "message.send.poll"
	case "carousel":
		commandType = "message.send.carousel"
	case "pix":
		// Botão PIX é um InteractiveMessage com 1 botão NativeFlow "payment_info" —
		// reaproveita SendInteractive (MessageVersion=3 + nó <biz>).
		commandType = "message.send.interactive"
	}

	var payload map[string]interface{}
	switch qaType {
	case "media":
		mediaURL, _ := contentMap["url"].(string)
		caption, _ := contentMap["caption"].(string)
		mediaType, _ := contentMap["mediaType"].(string)
		if caption == "" {
			caption = message
		}
		mimeType := "image/jpeg"
		if mediaType == "video" {
			mimeType = "video/mp4"
		} else if mediaType == "audio" {
			mimeType = "audio/ogg"
		}
		payload = map[string]interface{}{
			"sessionId": sessionID,
			"messageId": msgID,
			"to":        to,
			"body":      caption,
			"mediaUrl":  mediaURL,
			"mediaType": mediaType,
			"mimeType":  mimeType,
		}
	case "interactive_buttons":
		// NativeFlow InteractiveMessage. quick_reply/cta_url/cta_call/cta_copy
		// renderizam em conta pessoal com MessageVersion=3 + nó <biz> (no engine).
		bodyText, _ := contentMap["body"].(string)
		footerText, _ := contentMap["footer"].(string)
		if bodyText == "" {
			bodyText = message
		}
		payload = map[string]interface{}{
			"sessionId":  sessionID,
			"messageId":  msgID,
			"to":         to,
			"bodyText":   bodyText,
			"footerText": footerText,
			"buttons":    BuildNativeFlowButtons(contentMap["buttons"]),
		}
	case "carousel":
		// Carousel: cada card tem imagem + texto + botões NativeFlow. O engine faz
		// upload da imagem por card e injeta o nó <biz> (ver SendCarousel).
		bodyText, _ := contentMap["body"].(string)
		if bodyText == "" {
			bodyText = message
		}
		cards := make([]map[string]interface{}, 0)
		if rawCards, ok := contentMap["cards"].([]interface{}); ok {
			for _, rc := range rawCards {
				cm, ok := rc.(map[string]interface{})
				if !ok {
					continue
				}
				card := map[string]interface{}{"buttons": BuildNativeFlowButtons(cm["buttons"])}
				if img, ok := cm["image"].(string); ok {
					card["imageUrl"] = img
				}
				if t, ok := cm["title"].(string); ok {
					card["title"] = t
				}
				if f, ok := cm["footer"].(string); ok {
					card["footer"] = f
				}
				cards = append(cards, card)
			}
		}
		payload = map[string]interface{}{
			"sessionId": sessionID,
			"messageId": msgID,
			"to":        to,
			"bodyText":  bodyText,
			"cards":     cards,
		}
	case "pix":
		// O botão PIX NATIVO (NativeFlow "payment_info") é gatilhado server-side
		// (erro 473) em conta pessoal — exige WhatsApp Pay/conta business. Solução
		// confiável: botão cta_copy que copia a chave, com a chave também no corpo.
		bodyText, _ := contentMap["body"].(string)
		if bodyText == "" {
			bodyText = message
		}
		pixKey, _ := contentMap["pixKey"].(string)
		pixName, _ := contentMap["pixName"].(string)
		finalBody := bodyText
		if finalBody != "" {
			finalBody += "\n\n"
		}
		finalBody += "💳 *Pagamento via PIX*"
		if pixName != "" {
			finalBody += "\n👤 " + pixName
		}
		finalBody += "\n🔑 Chave: " + pixKey
		copyParams, _ := json.Marshal(map[string]string{
			"display_text": "Copiar chave PIX",
			"copy_code":    pixKey,
		})
		payload = map[string]interface{}{
			"sessionId": sessionID,
			"messageId": msgID,
			"to":        to,
			"bodyText":  finalBody,
			"buttons": []map[string]interface{}{
				{"name": "cta_copy", "params": string(copyParams)},
			},
		}
	case "list":
		// NativeFlow single_select: 1 botão cujo ButtonParamsJSON carrega o título
		// do botão e as seções/linhas. params.sections[].rows[] usa header/title/
		// description/id (header pode ser vazio).
		bodyText, _ := contentMap["body"].(string)
		if bodyText == "" {
			bodyText = message
		}
		footerText, _ := contentMap["footer"].(string)
		buttonText, _ := contentMap["button"].(string)
		if buttonText == "" {
			buttonText = "Ver opções"
		}
		var sections []map[string]interface{}
		if rawSecs, ok := contentMap["sections"].([]interface{}); ok {
			for _, rs := range rawSecs {
				sm, ok := rs.(map[string]interface{})
				if !ok {
					continue
				}
				var rows []map[string]interface{}
				if rawRows, ok := sm["rows"].([]interface{}); ok {
					for _, rr := range rawRows {
						rm, ok := rr.(map[string]interface{})
						if !ok {
							continue
						}
						rows = append(rows, map[string]interface{}{
							"header":      "",
							"title":       rm["title"],
							"description": rm["description"],
							"id":          rm["id"],
						})
					}
				}
				sections = append(sections, map[string]interface{}{
					"title": sm["title"],
					"rows":  rows,
				})
			}
		}
		selectParams, _ := json.Marshal(map[string]interface{}{
			"title":    buttonText,
			"sections": sections,
		})
		payload = map[string]interface{}{
			"sessionId":  sessionID,
			"messageId":  msgID,
			"to":         to,
			"bodyText":   bodyText,
			"footerText": footerText,
			"buttons": []map[string]interface{}{
				{"name": "single_select", "params": string(selectParams)},
			},
		}
	case "poll":
		question, _ := contentMap["question"].(string)
		if question == "" {
			question = message
		}
		var options []string
		if rawOpts, ok := contentMap["options"].([]interface{}); ok {
			for _, o := range rawOpts {
				if s, ok := o.(string); ok {
					options = append(options, s)
				}
			}
		}
		selectableCount := 1
		if ms, ok := contentMap["maxSelections"].(float64); ok {
			selectableCount = int(ms)
		}
		payload = map[string]interface{}{
			"sessionId":       sessionID,
			"messageId":       msgID,
			"to":              to,
			"name":            question,
			"options":         options,
			"selectableCount": selectableCount,
		}
	default:
		payload = map[string]interface{}{
			"sessionId": sessionID,
			"messageId": msgID,
			"to":        to,
			"body":      message,
		}
	}

	return commandType, payload
}

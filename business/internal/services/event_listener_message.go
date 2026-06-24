// Package services — message event handlers are split by event type:
//   - event_listener_msg_media.go    — handleMediaDownloaded
//   - event_listener_msg_ack.go      — handleMessageAck
//   - event_listener_msg_revoke.go   — handleMessageRevoke
//   - event_listener_msg_reaction.go — handleMessageReaction
package services

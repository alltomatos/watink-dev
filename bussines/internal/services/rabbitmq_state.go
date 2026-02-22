package services

var rabbitMQShared *RabbitMQService

func SetRabbitMQService(s *RabbitMQService) {
	rabbitMQShared = s
}

func GetRabbitMQService() *RabbitMQService {
	return rabbitMQShared
}

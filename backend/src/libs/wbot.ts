import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";

export const initWbot = async (whatsapp: Whatsapp): Promise<any> => {
  throw new AppError("Legacy wbot is disabled. Use Microservices/RabbitMQ.");
};

export const getWbot = (whatsappId: number): any => {
  throw new AppError("Legacy wbot is disabled. Use Microservices/RabbitMQ.");
};

export const removeWbot = (whatsappId: number): void => {
  // No-op or throw
  // throw new AppError("Legacy wbot is disabled. Use Microservices/RabbitMQ.");
};

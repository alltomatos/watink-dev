import Ticket from "../models/Ticket";
import AppError from "../errors/AppError";

const GetTicketWbot = async (ticket: Ticket): Promise<any> => {
  throw new AppError("Legacy GetTicketWbot is disabled. Use Microservices/RabbitMQ.");
};

export default GetTicketWbot;

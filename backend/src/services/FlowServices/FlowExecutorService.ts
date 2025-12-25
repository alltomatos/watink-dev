import Flow from "../../models/Flow";
import FlowSession from "../../models/FlowSession";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";
import { getIO } from "../../libs/socket";
import Message from "../../models/Message";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";

interface FlowContext {
  ticketId?: number;
  contactId?: number;
  messageBody?: string;
  [key: string]: any;
}

interface FlowNode {
  id: string;
  type: string;
  data: any;
}

interface FlowEdge {
  source: string;
  target: string;
}

class FlowExecutorService {
  public async start(flowId: number, context: FlowContext): Promise<FlowSession> {
    const flow = await Flow.findByPk(flowId);
    if (!flow) throw new AppError("Flow not found", 404);

    const nodes = flow.nodes as unknown as FlowNode[];

    // 1. Create Session
    const session = await FlowSession.create({
      flowId,
      status: "active",
      context,
      entityId: context.ticketId,
      entityType: "ticket" // Defaulting to ticket for now, can be generic
    });

    // 2. Find Start Node
    const startNode = nodes.find((n) => n.type === "input");
    if (!startNode) {
      await session.update({ status: "failed" });
      throw new AppError("Flow has no start node", 400);
    }

    // 3. Execute Start Node
    return this.runNode(session, flow, startNode);
  }

  public async next(sessionId: number, input: string): Promise<FlowSession> {
    const session = await FlowSession.findByPk(sessionId);
    if (!session || session.status !== "active") {
      throw new AppError("Session not active", 400);
    }

    const flow = await Flow.findByPk(session.flowId);
    if (!flow) throw new AppError("Flow not found", 404);

    const nodes = flow.nodes as unknown as FlowNode[];
    const edges = flow.edges as unknown as FlowEdge[];

    // Update context with input
    const newContext = { ...session.context, lastInput: input };
    await session.update({ context: newContext });

    // Find current node
    const currentNode = nodes.find((n) => n.id === session.currentStepId);
    if (!currentNode) {
      // Should not happen if state is consistent
      await session.update({ status: "failed" });
      return session;
    }

    // Check if current node was waiting for input
    // (In this simple engine, we assume if we are calling 'next', we satisfied the wait condition)
    
    // Find next node via edges
    const nextEdges = edges.filter((e) => e.source === currentNode.id);
    
    // TODO: Implement Conditional Logic here based on input
    // For now, take the first edge
    if (nextEdges.length === 0) {
      await session.update({ status: "completed", currentStepId: null });
      return session;
    }

    const nextNodeId = nextEdges[0].target;
    const nextNode = nodes.find((n) => n.id === nextNodeId);

    return this.runNode(session, flow, nextNode);
  }

  private async runNode(session: FlowSession, flow: Flow, node: any): Promise<FlowSession> {
    logger.info(`FlowExecutor: Running node ${node.id} (${node.type}) for Session ${session.id}`);
    
    // Update Session Pointer
    await session.update({ currentStepId: node.id });

    // Execute Logic based on Type
    try {
      switch (node.type) {
        case "input":
          // Start node, just proceed
          return this.proceedToNext(session, flow, node);
        
        case "output":
          // End node
          await session.update({ status: "completed", currentStepId: null });
          return session;

        case "default": // "Mensagem"
        case "textUpdater": // "Pergunta" (Custom node name in frontend sidebar is textUpdater?? Check sidebar code)
          // Actually sidebar said: 'default' -> Mensagem, 'textUpdater' -> Pergunta
          
          await this.sendMessage(session, node.data.label);

          if (node.type === "textUpdater" || node.data.waitForInput) {
            // Stop and wait for user reply
            // We keep the session active and currentStepId pointing here.
            return session;
          } else {
            // Auto-advance
            return this.proceedToNext(session, flow, node);
          }

        default:
          logger.warn(`Unknown node type: ${node.type}`);
          return this.proceedToNext(session, flow, node);
      }
    } catch (err) {
      logger.error(`Error executing node ${node.id}: ${err}`);
      await session.update({ status: "failed" });
      throw err;
    }
  }

  private async proceedToNext(session: FlowSession, flow: Flow, currentNode: any): Promise<FlowSession> {
    const nodes = flow.nodes as unknown as FlowNode[];
    const edges = flow.edges as unknown as FlowEdge[];

    const nextEdges = edges.filter((e) => e.source === currentNode.id);

    if (nextEdges.length === 0) {
      await session.update({ status: "completed", currentStepId: null });
      return session;
    }

    // Default: Take first edge (No condition support yet)
    const nextNodeId = nextEdges[0].target;
    const nextNode = nodes.find((n) => n.id === nextNodeId);

    // Recursive call (beware of stack depth, but usually flows aren't that deep)
    // Ideally use a while loop or queue for robust engine
    return this.runNode(session, flow, nextNode);
  }

  private async sendMessage(session: FlowSession, text: string) {
    const context = session.context as FlowContext;
    if (context.ticketId) {
       const ticket = await ShowTicketService(context.ticketId);
       if (ticket) {
         await SendWhatsAppMessage({
           body: text,
           ticket: ticket,
           quotedMsg: null
         });
       }
    }
  }
}

export default new FlowExecutorService();

/* eslint-disable @typescript-eslint/no-var-requires */
const PdfPrinter = require("pdfmake");
import { TDocumentDefinitions, Content, StyleDictionary } from "pdfmake/interfaces";
import Activity from "../../models/Activity";
import ActivityItem from "../../models/ActivityItem";
import ActivityMaterial from "../../models/ActivityMaterial";
import Protocol from "../../models/Protocol";
import User from "../../models/User";
import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";
import path from "path";
import fs from "fs";

// Definir fontes - usar fontes padrão do sistema ou fontes embarcadas
const getFonts = () => {
    const fontsPath = path.join(__dirname, "..", "..", "assets", "fonts");

    // Verificar se as fontes Roboto existem
    const robotoRegular = path.join(fontsPath, "Roboto-Regular.ttf");

    if (fs.existsSync(robotoRegular)) {
        return {
            Roboto: {
                normal: robotoRegular,
                bold: path.join(fontsPath, "Roboto-Medium.ttf"),
                italics: path.join(fontsPath, "Roboto-Italic.ttf"),
                bolditalics: path.join(fontsPath, "Roboto-MediumItalic.ttf")
            }
        };
    }

    // Fallback: usar Helvetica (fonte padrão do PDFKit)
    return {
        Helvetica: {
            normal: "Helvetica",
            bold: "Helvetica-Bold",
            italics: "Helvetica-Oblique",
            bolditalics: "Helvetica-BoldOblique"
        }
    };
};

export interface GeneratePdfData {
    activityId: number;
    tenantId: string;
}

const GenerateActivityPdfService = async (
    data: GeneratePdfData
): Promise<Buffer> => {
    const { activityId, tenantId } = data;

    const activity = await Activity.findOne({
        where: { id: activityId, tenantId },
        include: [
            {
                model: ActivityItem,
                as: "items",
                separate: true,
                order: [["order", "ASC"]]
            },
            {
                model: ActivityMaterial,
                as: "materials"
            },
            {
                model: User,
                as: "user",
                attributes: ["id", "name", "email"]
            },
            {
                model: Protocol,
                as: "protocol",
                include: [
                    {
                        model: Contact,
                        as: "contact",
                        attributes: ["id", "name", "email", "number"]
                    }
                ]
            }
        ]
    });

    if (!activity) {
        throw new AppError("ERR_ACTIVITY_NOT_FOUND", 404);
    }

    const fonts = getFonts();
    const fontName = Object.keys(fonts)[0]; // 'Roboto' ou 'Helvetica'
    const printer = new PdfPrinter(fonts);

    // Estilos do documento
    const styles: StyleDictionary = {
        header: {
            fontSize: 18,
            bold: true,
            margin: [0, 0, 0, 10] as [number, number, number, number]
        },
        subheader: {
            fontSize: 14,
            bold: true,
            margin: [0, 10, 0, 5] as [number, number, number, number]
        },
        tableHeader: {
            bold: true,
            fontSize: 11,
            fillColor: "#f0f0f0"
        },
        small: {
            fontSize: 9,
            color: "#666666"
        }
    };

    // Conteúdo do PDF
    const content: Content[] = [];

    // Cabeçalho
    content.push({
        text: "RELATÓRIO DE ATENDIMENTO TÉCNICO (RAT)",
        style: "header",
        alignment: "center"
    });

    // Dados do protocolo
    content.push({
        text: `Protocolo: ${activity.protocol?.protocolNumber || "N/A"}`,
        margin: [0, 5, 0, 0] as [number, number, number, number]
    });
    content.push({
        text: `Assunto: ${activity.protocol?.subject || "N/A"}`,
        margin: [0, 2, 0, 0] as [number, number, number, number]
    });

    // Informações do cliente
    if (activity.protocol?.contact) {
        content.push({
            text: "Dados do Cliente",
            style: "subheader"
        });
        content.push({
            table: {
                widths: ["30%", "70%"],
                body: [
                    ["Nome:", activity.protocol.contact.name || "N/A"],
                    ["Telefone:", activity.protocol.contact.number || "N/A"],
                    ["E-mail:", activity.protocol.contact.email || "N/A"]
                ]
            },
            layout: "lightHorizontalLines"
        });
    }

    // Informações da atividade
    content.push({
        text: "Dados da Atividade",
        style: "subheader"
    });
    content.push({
        table: {
            widths: ["30%", "70%"],
            body: [
                ["Título:", activity.title],
                ["Descrição:", activity.description || "N/A"],
                ["Técnico:", activity.user?.name || "N/A"],
                ["Status:", translateStatus(activity.status)],
                ["Início:", activity.startedAt ? formatDate(activity.startedAt) : "N/A"],
                ["Término:", activity.finishedAt ? formatDate(activity.finishedAt) : "N/A"]
            ]
        },
        layout: "lightHorizontalLines"
    });

    // Checklist de itens
    if (activity.items && activity.items.length > 0) {
        content.push({
            text: "Checklist de Atividades",
            style: "subheader"
        });

        const checklistBody: any[][] = [
            [
                { text: "Item", style: "tableHeader" },
                { text: "Tipo", style: "tableHeader" },
                { text: "Status", style: "tableHeader" },
                { text: "Valor/Resposta", style: "tableHeader" }
            ]
        ];

        activity.items.forEach((item: ActivityItem) => {
            checklistBody.push([
                item.label,
                translateInputType(item.inputType),
                item.isDone ? "[X] Concluído" : "[ ] Pendente",
                formatItemValue(item)
            ]);
        });

        content.push({
            table: {
                headerRows: 1,
                widths: ["35%", "15%", "20%", "30%"],
                body: checklistBody
            },
            layout: "lightHorizontalLines"
        });
    }

    // Materiais utilizados
    if (activity.materials && activity.materials.length > 0) {
        content.push({
            text: "Materiais Utilizados",
            style: "subheader"
        });

        const materialsBody: any[][] = [
            [
                { text: "Material", style: "tableHeader" },
                { text: "Quantidade", style: "tableHeader" },
                { text: "Unidade", style: "tableHeader" },
                { text: "Observações", style: "tableHeader" }
            ]
        ];

        activity.materials.forEach((material: ActivityMaterial) => {
            materialsBody.push([
                material.materialName,
                material.quantity.toString(),
                material.unit || "-",
                material.notes || "-"
            ]);
        });

        content.push({
            table: {
                headerRows: 1,
                widths: ["35%", "15%", "15%", "35%"],
                body: materialsBody
            },
            layout: "lightHorizontalLines"
        });
    }

    // Assinaturas
    content.push({
        text: "Assinaturas",
        style: "subheader",
        pageBreak: "before"
    });

    const signatureRow: any[] = [];

    // Assinatura do técnico
    if (activity.technicianSignature && isValidBase64Image(activity.technicianSignature)) {
        signatureRow.push({
            stack: [
                {
                    image: activity.technicianSignature,
                    width: 200,
                    height: 80
                },
                {
                    text: "_________________________",
                    alignment: "center"
                },
                {
                    text: "Assinatura do Técnico",
                    alignment: "center",
                    style: "small"
                },
                {
                    text: activity.user?.name || "",
                    alignment: "center",
                    style: "small"
                }
            ],
            width: "50%"
        });
    } else {
        signatureRow.push({
            stack: [
                { text: "\n\n\n" },
                { text: "_________________________", alignment: "center" },
                { text: "Assinatura do Técnico", alignment: "center", style: "small" }
            ],
            width: "50%"
        });
    }

    // Assinatura do cliente
    if (activity.clientSignature && isValidBase64Image(activity.clientSignature)) {
        signatureRow.push({
            stack: [
                {
                    image: activity.clientSignature,
                    width: 200,
                    height: 80
                },
                {
                    text: "_________________________",
                    alignment: "center"
                },
                {
                    text: "Assinatura do Cliente",
                    alignment: "center",
                    style: "small"
                }
            ],
            width: "50%"
        });
    } else {
        signatureRow.push({
            stack: [
                { text: "\n\n\n" },
                { text: "_________________________", alignment: "center" },
                { text: "Assinatura do Cliente", alignment: "center", style: "small" }
            ],
            width: "50%"
        });
    }

    content.push({
        columns: signatureRow,
        columnGap: 20,
        margin: [0, 30, 0, 0] as [number, number, number, number]
    });

    // Rodapé com data de geração
    content.push({
        text: `Relatório gerado em: ${formatDate(new Date())}`,
        style: "small",
        alignment: "right",
        margin: [0, 30, 0, 0] as [number, number, number, number]
    });

    const docDefinition: TDocumentDefinitions = {
        content,
        styles,
        defaultStyle: {
            font: fontName,
            fontSize: 10
        },
        pageSize: "A4",
        pageMargins: [40, 60, 40, 60]
    };

    // Gerar PDF
    return new Promise((resolve, reject) => {
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];

        // pdfDoc é um stream legível (Node.js Readable Stream)
        // Precisamos coletar os chunks de dados
        pdfDoc.on("data", (chunk: any) => {
            chunks.push(chunk);
        });

        pdfDoc.on("end", () => {
            const result = Buffer.concat(chunks);
            resolve(result);
        });

        pdfDoc.on("error", (err: any) => {
            reject(err);
        });

        pdfDoc.end();
    });
};

// Funções auxiliares
function translateStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
        pending: "Pendente",
        in_progress: "Em Andamento",
        done: "Concluído",
        cancelled: "Cancelado"
    };
    return statusMap[status] || status;
}

function translateInputType(type: string): string {
    const typeMap: { [key: string]: string } = {
        checkbox: "Checkbox",
        text: "Texto",
        photo: "Foto",
        number: "Número"
    };
    return typeMap[type] || type;
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(date));
}

function formatItemValue(item: ActivityItem): string {
    if (!item.value) return "-";

    switch (item.inputType) {
        case "checkbox":
            return item.value === "true" ? "Sim" : "Não";
        case "photo":
            return "[Foto anexada]";
        default:
            return item.value;
    }
}

function isValidBase64Image(str: string): boolean {
    return str.startsWith("data:image/");
}

export default GenerateActivityPdfService;

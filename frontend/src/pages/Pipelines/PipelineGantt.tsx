import React from "react";
import { parseISO, format, differenceInDays } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Contact {
    name?: string;
}

interface Deal {
    id: number;
    title: string;
    contact?: Contact;
    createdAt: string;
    updatedAt: string;
    value?: number;
}

interface PipelineGanttProps {
    deals?: Deal[];
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const PipelineGantt: React.FC<PipelineGanttProps> = ({ deals }) => {
    if (!deals) return <div className="p-4 text-muted-foreground">Carregando...</div>;

    return (
        <Card className="m-4">
            <CardHeader>
                <CardTitle>Cronograma de Deals</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Deal</TableHead>
                            <TableHead>Contato</TableHead>
                            <TableHead>Criado em</TableHead>
                            <TableHead>Atualizado em</TableHead>
                            <TableHead>Dias no Pipeline</TableHead>
                            <TableHead>Valor</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {deals.map((deal) => (
                            <TableRow key={deal.id}>
                                <TableCell className="font-medium">{deal.title}</TableCell>
                                <TableCell>{deal.contact?.name}</TableCell>
                                <TableCell>{format(parseISO(deal.createdAt), "dd/MM/yyyy")}</TableCell>
                                <TableCell>{format(parseISO(deal.updatedAt), "dd/MM/yyyy")}</TableCell>
                                <TableCell>
                                    {differenceInDays(new Date(), parseISO(deal.createdAt))} dias
                                </TableCell>
                                <TableCell>{formatCurrency(deal.value ?? 0)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default PipelineGantt;

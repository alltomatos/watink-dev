import React from "react";
import { Edit2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { Tenant } from "../saasTypes";

interface TenantsTabProps {
    tenants: Tenant[];
    onEdit: (tenant: Tenant) => void;
}

export function TenantsTab({ tenants, onEdit }: TenantsTabProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px] text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tenants.map((tenant) => (
                        <TableRow key={tenant.id}>
                            <TableCell className="font-medium">{tenant.name}</TableCell>
                            <TableCell>{tenant.status}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onEdit(tenant)}
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {tenants.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                Nenhum tenant encontrado.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

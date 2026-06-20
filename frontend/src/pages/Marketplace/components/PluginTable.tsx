import React from "react";
import { Puzzle } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import type { MarketplacePlugin } from "../marketplaceTypes";

interface PluginTableProps {
  plugins: MarketplacePlugin[];
  onPluginClick: (plugin: MarketplacePlugin) => void;
}

export function PluginTable({ plugins, onPluginClick }: PluginTableProps) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plugin</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Versão</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plugins.map((plugin) => (
            <TableRow key={plugin.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-primary/10 rounded text-primary">
                    <Puzzle size={16} />
                  </div>
                  <span className="font-semibold">{plugin.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {plugin.category || "-"}
              </TableCell>
              <TableCell>v{plugin.version || "1.0.0"}</TableCell>
              <TableCell>
                {plugin.installed ? (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 border-none"
                  >
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="outline">Disponível</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPluginClick(plugin)}
                >
                  Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

import React from 'react';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

/**
 * Exemplo de uso do componente Card do Watink Design System.
 * O componente real segue o padrão de composição do shadcn/ui.
 *
 * @dsCard group="Components" name="Card" subtitle="Standard content containers with modular sub-components"
 */
export function CardExample() {
  return (
    <div className="flex flex-col gap-6 p-6 bg-muted/30 min-h-screen">
      {/* Card Simples */}
      <Card>
        <CardHeader>
          <CardTitle>Filas de Atendimento</CardTitle>
          <CardDescription>3 filas ativas no momento</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            As filas permitem organizar o atendimento por departamento ou assunto.
          </p>
        </CardContent>
      </Card>

      {/* Card com Header Complexo e Footer */}
      <Card className="max-w-[450px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold">Conexões WhatsApp</CardTitle>
            <CardDescription>Status das suas instâncias</CardDescription>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <SyncIcon className="h-6 w-6" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium mt-2">
            <div className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
            Sistema Operacional
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/50 px-6 py-3 rounded-b-lg">
          <button className="text-xs font-semibold uppercase tracking-wider text-primary hover:underline">
            Gerenciar Conexões
          </button>
        </CardFooter>
      </Card>

      {/* Card de Métrica / Estatística */}
      <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
        <CardHeader>
          <CardDescription className="group-hover:text-primary transition-colors">Total de Contatos</CardDescription>
          <CardTitle className="text-3xl">1.284</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

// Mock de ícone para exemplo
const SyncIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export default CardExample;

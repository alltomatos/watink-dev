/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import { CreditCard, CheckCircle2 } from "lucide-react";
import pluginApi from "../../services/pluginApi";
import { toast } from "react-toastify";
import { PageContainer, PageHeader, PageContent } from "@/components/ui/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Plan {
  name: string;
  price: string;
  limit: string;
  features: string[];
}

interface PlanCardProps {
  plan: Plan;
  onCheckout: (planName: string) => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, onCheckout }) => (
  <Card className="flex flex-col">
    <CardHeader className="bg-muted/30 border-b text-center py-6">
      <CardTitle className="text-2xl">{plan.name}</CardTitle>
      <CardDescription className="mt-2">
        <span className="text-4xl font-bold text-primary">R$ {plan.price}</span>
        <span className="text-muted-foreground">/mês</span>
      </CardDescription>
      <p className="text-sm text-muted-foreground mt-1">{plan.limit}</p>
    </CardHeader>
    <CardContent className="flex-1 py-6 space-y-3">
      {plan.features.map((feature) => (
        <div key={feature} className="flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <span className="text-sm">{feature}</span>
        </div>
      ))}
    </CardContent>
    <div className="p-6 pt-0">
      <Button
        className="w-full"
        onClick={() => onCheckout(plan.name)}
      >
        <CreditCard className="mr-2 h-4 w-4" />
        Assinar Agora
      </Button>
    </div>
  </Card>
);

const Billing: React.FC = () => {
  const [instanceId, setInstanceId] = useState("");

  useEffect(() => {
    const loadInstanceId = async () => {
      try {
        const { data } = await pluginApi.get<{ instanceId?: string }>("/plugins/instance");
        setInstanceId(data.instanceId ?? "");
      } catch {
        // non-critical, silently fail
      }
    };
    loadInstanceId();
  }, []);

  const handleCheckout = (plan: string) => {
    toast.info(`Iniciando checkout do plano ${plan}...`);
    window.open(
      `https://quxtkdxrafulqibwbqld.supabase.co/functions/v1/create-checkout?plan=${plan}&instanceId=${instanceId}`,
      "_blank"
    );
  };

  const plans: Plan[] = [
    {
      name: "Start",
      price: "49,99",
      limit: "4 plugins",
      features: [
        "Até 4 plugins Business",
        "Suporte Standard",
        "Atualizações Core",
        "Webchat incluso",
      ],
    },
    {
      name: "Pro",
      price: "99,99",
      limit: "6 plugins",
      features: [
        "Até 6 plugins Business",
        "Suporte Prioritário",
        "Todas as Engines (WhatsMeow/Papi)",
        "Acesso antecipado",
      ],
    },
    {
      name: "SaaS",
      price: "199,99",
      limit: "Módulo SaaS",
      features: [
        "Plugin de Gestão SaaS",
        "Painel Multi-instância",
        "White-label habilitado",
        "Faturamento centralizado",
      ],
    },
  ];

  return (
    <PageContainer>
      <PageHeader title="💳 Assinatura e Planos" />
      <PageContent>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} onCheckout={handleCheckout} />
          ))}
        </div>

        {instanceId && (
          <div className="mt-8 rounded-lg border border-border bg-blue-50 p-4 dark:bg-blue-950/20">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Seu Instance ID: <span className="font-mono font-normal">{instanceId}</span>
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Este ID identifica sua instalação única do Watink e é necessário para validar sua licença após o pagamento.
            </p>
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
};

export default Billing;
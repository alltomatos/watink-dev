import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import PaperCard from "../../../components/PaperCard";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import type { LegacyCardDef } from "../accessTypes";

interface AccessLegacyCardsProps {
  cards: LegacyCardDef[];
}

const AccessLegacyCards: React.FC<AccessLegacyCardsProps> = ({ cards }) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <div key={card.key} style={{ opacity: 0.7 }}>
          <PaperCard variant="outlined">
            <div className="mb-2 flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: card.color }}
              >
                {card.icon}
              </span>
              <span className="flex items-center gap-2 text-base font-semibold">
                {card.getTitle()}
                <Badge variant="secondary" className="text-xs">
                  Legado
                </Badge>
              </span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              {card.getDescription()}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => navigate(card.route)}
            >
              {card.getButtonLabel()}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </PaperCard>
        </div>
      ))}
    </div>
  );
};

export default AccessLegacyCards;

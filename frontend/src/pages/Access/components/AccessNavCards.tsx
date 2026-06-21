import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import PaperCard from "../../../components/PaperCard";
import { Button } from "../../../components/ui/button";
import type { NavCardDef, AccessStats } from "../accessTypes";

interface AccessNavCardsProps {
  cards: NavCardDef[];
  stats: AccessStats;
}

const AccessNavCards: React.FC<AccessNavCardsProps> = ({ cards, stats }) => {
  const navigate = useNavigate();

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <PaperCard key={card.key} variant="outlined" padding="default" hoverEffect>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: card.color }}
            >
              {card.icon}
            </span>
            <span className="text-base font-semibold">{card.getTitle()}</span>
          </div>
          <p className="mb-1 text-sm text-muted-foreground">
            {card.getDescription()}
          </p>
          <p className="text-xs text-muted-foreground">
            {card.getSubtitle(stats)}
          </p>
          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(card.route)}
            >
              {card.getButtonLabel()}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </PaperCard>
      ))}
    </div>
  );
};

export default AccessNavCards;

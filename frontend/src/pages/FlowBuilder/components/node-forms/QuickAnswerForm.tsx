import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { i18n } from '../../../../translate/i18n';
import { NodeData, QuickAnswer } from '../../nodeEditorTypes';

interface QuickAnswerFormProps {
  formData: NodeData;
  quickAnswers: QuickAnswer[];
  onChange: (field: string, value: unknown) => void;
}

const QuickAnswerForm: React.FC<QuickAnswerFormProps> = ({ formData, quickAnswers, onChange }) => (
  <div className="space-y-3">
    <p className="text-xs text-muted-foreground">
      {i18n.t('flowBuilder.nodes.quickAnswer.helper')}
    </p>

    <div className="space-y-1">
      <Label className="text-xs">{i18n.t('flowBuilder.nodes.quickAnswer.fieldLabel')}</Label>
      <Select
        value={formData.quickAnswerId || undefined}
        onValueChange={(v) => onChange('quickAnswerId', v)}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={i18n.t('flowBuilder.nodes.quickAnswer.placeholder') as string} />
        </SelectTrigger>
        <SelectContent>
          {quickAnswers.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {i18n.t('flowBuilder.nodes.quickAnswer.empty')}
            </div>
          ) : (
            quickAnswers.map((qa) => (
              <SelectItem key={qa.id} value={qa.id}>
                {qa.shortcut ? `/${qa.shortcut} — ${qa.message}` : qa.message}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  </div>
);

export default QuickAnswerForm;

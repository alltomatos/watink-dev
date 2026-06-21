/* @jsxImportSource react */
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import SignatureModal from "./SignatureModal";

import { useActivityExecution } from "./hooks/useActivityExecution";
import ChecklistTab from "./components/ChecklistTab";
import MaterialsTab from "./components/MaterialsTab";
import OccurrencesTab from "./components/OccurrencesTab";
import DetailsTab from "./components/DetailsTab";
import MaterialModal from "./components/MaterialModal";
import OccurrenceModal from "./components/OccurrenceModal";

const ActivityExecution: React.FC<{
  open: boolean;
  activityId: string;
  onClose: () => void;
}> = ({ open, activityId, onClose }) => {
  const [tab, setTab] = useState("checklist");

  const {
    loading, activity, items, materials, occurrences,
    materialModalOpen, occurrenceModalOpen, signatureModalOpen,
    newMaterial, newOccurrence,
    setMaterialModalOpen, setOccurrenceModalOpen, setSignatureModalOpen,
    setNewMaterial, setNewOccurrence,
    handleItemChange, handleFileUpload,
    handleAddMaterial, handleDeleteMaterial,
    handleAddOccurrence, handleDeleteOccurrence,
    handleFinish,
  } = useActivityExecution(open, activityId, onClose);

  if (!activity) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex flex-col !p-0 max-w-none w-screen h-screen m-0 rounded-none">
        <div className="flex items-center gap-4 border-b border-border px-6 py-4">
          <span className="text-lg font-semibold">Execução: {activity.title}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="default" size="sm" onClick={() => setSignatureModalOpen(true)}>
              Finalizar
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
                <TabsTrigger value="materials">Materiais (RDO)</TabsTrigger>
                <TabsTrigger value="occurrences">Ocorrências</TabsTrigger>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
              </TabsList>

              <ChecklistTab
                items={items}
                onItemChange={handleItemChange}
                onFileUpload={handleFileUpload}
              />
              <MaterialsTab
                materials={materials}
                onDelete={handleDeleteMaterial}
                onAdd={() => setMaterialModalOpen(true)}
              />
              <OccurrencesTab
                occurrences={occurrences}
                onDelete={handleDeleteOccurrence}
                onAdd={() => setOccurrenceModalOpen(true)}
              />
              <DetailsTab activity={activity} />
            </Tabs>
          )}
        </div>

        <MaterialModal
          open={materialModalOpen}
          newMaterial={newMaterial}
          onChange={setNewMaterial}
          onConfirm={handleAddMaterial}
          onCancel={() => setMaterialModalOpen(false)}
        />

        <OccurrenceModal
          open={occurrenceModalOpen}
          newOccurrence={newOccurrence}
          onChange={setNewOccurrence}
          onConfirm={handleAddOccurrence}
          onCancel={() => setOccurrenceModalOpen(false)}
        />

        <SignatureModal
          open={signatureModalOpen}
          onClose={() => setSignatureModalOpen(false)}
          onConfirm={handleFinish}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ActivityExecution;

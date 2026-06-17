import React from 'react';
import { Database } from 'lucide-react';
import BaseNode from './BaseNode';

interface DatabaseNodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const OPERATION_LABELS: Record<string, string> = {
  read: 'Buscar',
  update: 'Atualizar',
  create: 'Criar',
  delete: 'Excluir',
};

const DatabaseNode: React.FC<DatabaseNodeProps> = ({ data, isConnectable }) => {
  const operation = (data?.operation as string) || 'read';
  const table = (data?.tableName as string) || '';
  const opLabel = OPERATION_LABELS[operation] ?? operation;

  return (
    <BaseNode
      data={data}
      icon={Database}
      colorClass="colorDatabase"
      defaultLabel="Database"
      sublabel={table ? `${opLabel}: ${table}` : opLabel}
      isConnectable={isConnectable}
    />
  );
};

export default DatabaseNode;

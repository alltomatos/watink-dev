/* @jsxImportSource react */
import React, { memo } from 'react';
import HttpIcon from '@material-ui/icons/Http';
import BaseNode from './BaseNode';

const WebhookNode = ({ data, isConnectable, selected }) => {
    return (
        <BaseNode
            data={data}
            icon={HttpIcon}
            colorClass="colorWebhook"
            defaultLabel="Webhook"
            sublabel={data.method + ' ' + (data.url || '')}
            isConnectable={isConnectable}
            selected={selected}
        />
    );
};

export default memo(WebhookNode);

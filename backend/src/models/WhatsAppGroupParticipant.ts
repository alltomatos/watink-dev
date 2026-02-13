import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  Default
} from "sequelize-typescript";
import Tenant from "./Tenant";
import WhatsAppGroup from "./WhatsAppGroup";

@Table
class WhatsAppGroupParticipant extends Model<WhatsAppGroupParticipant> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => WhatsAppGroup)
  @Column
  groupId: number;

  @BelongsTo(() => WhatsAppGroup)
  group: WhatsAppGroup;

  @Column(DataType.STRING)
  participantJid: string;

  @Column(DataType.STRING)
  participantName: string;

  @Default(false)
  @Column
  isAdmin: boolean;

  @Default(false)
  @Column
  isSuperAdmin: boolean;

  @Column(DataType.JSONB)
  metadataJson: object;

  @ForeignKey(() => Tenant)
  @Column(DataType.UUID)
  tenantId: number | string;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;
}

export default WhatsAppGroupParticipant;

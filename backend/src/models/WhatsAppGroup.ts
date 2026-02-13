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
  HasMany,
  Default,
  AllowNull
} from "sequelize-typescript";
import Tenant from "./Tenant";
import Whatsapp from "./Whatsapp";
import Contact from "./Contact";
import WhatsAppGroupParticipant from "./WhatsAppGroupParticipant";

@Table
class WhatsAppGroup extends Model<WhatsAppGroup> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  groupJid: string;

  @Column(DataType.STRING)
  subject: string;

  @Default(0)
  @Column
  participantsCount: number;

  @Column(DataType.JSONB)
  metadataJson: object;

  @Column(DataType.DATE)
  lastSyncedAt: Date;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => Tenant)
  @Column(DataType.UUID)
  tenantId: number | string;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @HasMany(() => WhatsAppGroupParticipant, "groupId")
  participants: WhatsAppGroupParticipant[];

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;
}

export default WhatsAppGroup;

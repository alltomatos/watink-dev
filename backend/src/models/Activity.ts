import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    PrimaryKey,
    AutoIncrement,
    ForeignKey,
    BelongsTo,
    HasMany,
    DataType,
    Default,
} from "sequelize-typescript";
import Tenant from "./Tenant";
import Protocol from "./Protocol";
import ActivityTemplate from "./ActivityTemplate";
import User from "./User";
import ActivityItem from "./ActivityItem";
import ActivityMaterial from "./ActivityMaterial";
import ActivityOccurrence from "./ActivityOccurrence";

export type ActivityStatus = "pending" | "in_progress" | "done" | "cancelled";

@Table({ tableName: "Activities" })
class Activity extends Model<Activity> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Tenant)
    @Column(DataType.UUID)
    tenantId: string;

    @BelongsTo(() => Tenant)
    tenant: Tenant;

    @ForeignKey(() => Protocol)
    @Column
    protocolId: number;

    @BelongsTo(() => Protocol)
    protocol: Protocol;

    @ForeignKey(() => ActivityTemplate)
    @Column
    templateId: number;

    @BelongsTo(() => ActivityTemplate)
    template: ActivityTemplate;

    @Column(DataType.STRING(255))
    title: string;

    @Column(DataType.TEXT)
    description: string;

    @Default("pending")
    @Column(DataType.ENUM("pending", "in_progress", "done", "cancelled"))
    status: ActivityStatus;

    @ForeignKey(() => User)
    @Column
    userId: number;

    @BelongsTo(() => User)
    user: User;

    @Column(DataType.TEXT)
    clientSignature: string;

    @Column(DataType.TEXT)
    technicianSignature: string;

    @Column(DataType.DATE)
    startedAt: Date;

    @Column(DataType.DATE)
    finishedAt: Date;

    @HasMany(() => ActivityItem)
    items: ActivityItem[];

    @HasMany(() => ActivityMaterial)
    materials: ActivityMaterial[];

    @HasMany(() => ActivityOccurrence)
    occurrences: ActivityOccurrence[];

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default Activity;
